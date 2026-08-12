export type AudioConversionSettings = {
  audioCodec?: string
  audioBitrate?: string | number
  bitrate?: string | number
  sampleRate?: string | number
  channels?: string | number
}

export type AudioConversionPlan = {
  muxer: string
  audioCodec: string
  audioBitrate?: string
  sampleRate?: number
  audioChannels?: number
  outputOptions: string[]
}

type AudioProfile = {
  muxer: string
  audioCodec: string
  lossless?: boolean
  maxBitrate?: number
}

const audioProfiles: Record<string, AudioProfile> = {
  mp3: { muxer: 'mp3', audioCodec: 'libmp3lame', maxBitrate: 320 },
  wav: { muxer: 'wav', audioCodec: 'pcm_s16le', lossless: true },
  ogg: { muxer: 'ogg', audioCodec: 'libvorbis', maxBitrate: 320 },
  flac: { muxer: 'flac', audioCodec: 'flac', lossless: true },
  m4a: { muxer: 'ipod', audioCodec: 'aac', maxBitrate: 320 },
  m4r: { muxer: 'ipod', audioCodec: 'aac', maxBitrate: 320 },
  aac: { muxer: 'adts', audioCodec: 'aac', maxBitrate: 320 },
  wma: { muxer: 'asf', audioCodec: 'wmav2', maxBitrate: 320 },
  aiff: { muxer: 'aiff', audioCodec: 'pcm_s16be', lossless: true },
  mp2: { muxer: 'mp2', audioCodec: 'mp2', maxBitrate: 384 },
}

export const audioOutputFormats = Object.keys(audioProfiles)

export const isAudioOutputFormat = (format?: string) =>
  Boolean(format && audioProfiles[String(format).toLowerCase()])

const selectedBitrate = (value: string | number | undefined, maxBitrate?: number) => {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined
  const match = String(value).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(k|kbps)?$/)
  if (!match) return undefined

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined

  const clamped = maxBitrate ? Math.min(numeric, maxBitrate) : numeric
  return `${Math.round(clamped)}k`
}

const selectedSampleRate = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined
}

const selectedChannels = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined
  if (value === 'mono') return 1
  if (value === 'stereo') return 2

  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined
}

export const createAudioConversionPlan = (
  format: string,
  settings: AudioConversionSettings = {},
): AudioConversionPlan => {
  const normalized = String(format || '').toLowerCase()
  const profile = audioProfiles[normalized]

  if (!profile) {
    throw new Error(`不支持的音频输出格式：${format}`)
  }

  return {
    muxer: profile.muxer,
    audioCodec: profile.audioCodec,
    audioBitrate: profile.lossless
      ? undefined
      : selectedBitrate(settings.audioBitrate ?? settings.bitrate, profile.maxBitrate),
    sampleRate: selectedSampleRate(settings.sampleRate),
    audioChannels: selectedChannels(settings.channels),
    outputOptions: [],
  }
}
