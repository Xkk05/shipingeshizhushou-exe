export type CompressionEstimateSettings = {
  videoBitrate?: string | number
  audioBitrate?: string | number
}

export type CompressionEstimateInput = {
  sourceSize: number
  durationSeconds?: number
  sourceBitrate?: number
  mode?: string
  settings?: CompressionEstimateSettings
}

const bitrateRatioByMode: Record<string, number> = {
  speed: 0.45,
  quality: 0.6,
  clarity: 0.75,
  low: 0.45,
  medium: 0.6,
  high: 0.75,
}

const autoCrfCeilingKbpsByMode: Record<string, number> = {
  speed: 650,
  quality: 900,
  clarity: 1300,
  low: 650,
  medium: 900,
  high: 1300,
}

const autoCrfFloorKbpsByMode: Record<string, number> = {
  speed: 260,
  quality: 320,
  clarity: 420,
  low: 260,
  medium: 320,
  high: 420,
}

const fallbackRatioByMode: Record<string, number> = {
  speed: 0.45,
  quality: 0.58,
  clarity: 0.72,
  low: 0.45,
  medium: 0.58,
  high: 0.72,
}

const smallFileFloorRatioByMode: Record<string, number> = {
  speed: 0.88,
  quality: 0.92,
  clarity: 0.96,
  low: 0.88,
  medium: 0.92,
  high: 0.96,
}

const parseBitrateKbps = (value?: string | number) => {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined
  const raw = String(value).trim().toLowerCase()
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(k|kbps|m|mbps)?$/)
  if (!match) return undefined
  const numeric = Number(match[1])
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return match[2]?.startsWith('m') ? numeric * 1000 : numeric
}

const positiveNumber = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const estimateCompressedSize = ({
  sourceSize,
  durationSeconds,
  sourceBitrate,
  mode = 'quality',
  settings,
}: CompressionEstimateInput) => {
  const size = positiveNumber(sourceSize)
  if (!size) return 0

  const modeKey = bitrateRatioByMode[mode] ? mode : 'quality'
  const duration = positiveNumber(durationSeconds)
  const sourceBitrateKbps = positiveNumber(sourceBitrate) / 1000
  const inferredSourceKbps = sourceBitrateKbps || (duration ? (size * 8) / duration / 1000 : 0)
  const explicitVideoBitrate = parseBitrateKbps(settings?.videoBitrate)
  const explicitAudioBitrate = parseBitrateKbps(settings?.audioBitrate)

  if (duration && (explicitVideoBitrate || inferredSourceKbps)) {
    const autoVideoKbps = inferredSourceKbps
      ? clamp(
        Math.floor(inferredSourceKbps * bitrateRatioByMode[modeKey]),
        autoCrfFloorKbpsByMode[modeKey],
        autoCrfCeilingKbpsByMode[modeKey],
      )
      : autoCrfCeilingKbpsByMode[modeKey]
    const explicitCeiling = Math.round(autoCrfCeilingKbpsByMode[modeKey] * 1.25)
    const targetVideoKbps = explicitVideoBitrate
      ? Math.min(explicitVideoBitrate, explicitCeiling)
      : autoVideoKbps
    const targetAudioKbps = explicitAudioBitrate || 128
    const payloadBytes = ((targetVideoKbps + targetAudioKbps) * 1000 * duration) / 8
    const containerOverhead = Math.max(4096, Math.min(size * 0.12, 32 * 1024))
    const smallFileFloor = size <= 512 * 1024 ? size * smallFileFloorRatioByMode[modeKey] : 0
    const rawEstimate = Math.max(payloadBytes + containerOverhead, smallFileFloor)
    const upperBound = explicitVideoBitrate ? Math.max(size * 1.2, rawEstimate) : size * 0.98

    return Math.max(1, Math.round(Math.min(rawEstimate, upperBound)))
  }

  return Math.max(1, Math.round(size * fallbackRatioByMode[modeKey]))
}
