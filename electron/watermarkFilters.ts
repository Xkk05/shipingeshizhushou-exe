export type WatermarkSpec = {
  type: string
  path?: string
  text?: string
  x?: number
  y?: number
  rotation?: number
  opacity?: number
  scale?: number
  position?: string
  fontFamily?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  actualX?: number
  actualY?: number
  actualFontSize?: number
  startTime?: number
  endTime?: number
}

export type FontStyleOptions = {
  bold?: boolean
  italic?: boolean
}

export type WatermarkFilterPlan = {
  filters: string[]
  imagePaths: string[]
}

export type ResolveFontPath = (fontFamily?: string, style?: FontStyleOptions) => string

const rounded = (value: number, fallback = 0) =>
  Number.isFinite(value) ? Math.round(value) : fallback

const normalizedOpacity = (opacity?: number) =>
  Math.max(0, Math.min(1, Number(opacity ?? 100) / 100))

const escapeDrawtextText = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')

const escapeFontPath = (fontPath: string) =>
  fontPath.replace(/\\/g, '/').replace(/:/g, '\\:')

export const watermarkEnableExpr = (wm: { startTime?: number; endTime?: number }) => {
  const start = Number(wm.startTime || 0)
  const end = Number(wm.endTime || 0)
  return end > start ? `:enable=between(t\\,${start}\\,${end})` : ''
}

const rotationFilter = (degrees?: number) => {
  const rotation = Number(degrees || 0)
  if (!Number.isFinite(rotation) || Math.abs(rotation) < 0.01) return ''
  const radians = (rotation * Math.PI / 180).toFixed(6)
  return `,rotate=${radians}:c=none:ow=rotw(iw):oh=roth(ih)`
}

const estimateTextWidth = (text: string, fontSize: number) => {
  const wideChars = Array.from(text).filter((char) => char.charCodeAt(0) > 255).length
  const narrowChars = Math.max(0, Array.from(text).length - wideChars)
  return Math.max(12, Math.ceil(wideChars * fontSize + narrowChars * fontSize * 0.62))
}

const drawtextOptions = (
  wm: WatermarkSpec,
  text: string,
  fontPath: string,
  fontSize: number,
  opacity: number,
  x: string | number,
  y: string | number,
) =>
  `drawtext=text='${escapeDrawtextText(text)}':fontfile='${escapeFontPath(fontPath)}':fontsize=${fontSize}:fontcolor=white@${opacity}:x=${x}:y=${y}${watermarkEnableExpr(wm)}`

const underlineOptions = (
  wm: WatermarkSpec,
  text: string,
  fontSize: number,
  opacity: number,
  x: string | number,
  y: string | number,
) => {
  if (!wm.underline) return ''
  const width = estimateTextWidth(text, fontSize)
  const lineY = typeof y === 'number' ? y + fontSize + 3 : `${y}+${fontSize + 3}`
  return `,drawbox=x=${x}:y=${lineY}:w=${width}:h=${Math.max(2, Math.round(fontSize / 12))}:color=white@${opacity}:t=fill${watermarkEnableExpr(wm)}`
}

const addDirectTextFilter = (
  filters: string[],
  lastOutput: string,
  outputLabel: string,
  wm: WatermarkSpec,
  text: string,
  fontPath: string,
  fontSize: number,
  opacity: number,
  x: string | number,
  y: string | number,
) => {
  const draw = drawtextOptions(wm, text, fontPath, fontSize, opacity, x, y)
  const underline = underlineOptions(wm, text, fontSize, opacity, x, y)
  filters.push(`[${lastOutput}]${draw}${underline}[${outputLabel}]`)
}

const addLayerTextFilter = (
  filters: string[],
  lastOutput: string,
  outputLabel: string,
  wm: WatermarkSpec,
  text: string,
  fontPath: string,
  fontSize: number,
  opacity: number,
  x: string | number,
  y: string | number,
  idx: number,
  suffix: string,
) => {
  const boxWidth = estimateTextWidth(text, fontSize) + 12
  const boxHeight = Math.max(24, Math.ceil(fontSize * 1.45))
  const layerLabel = `txt${idx}_${suffix}`
  const draw = drawtextOptions(wm, text, fontPath, fontSize, opacity, 4, 4)
  const underline = underlineOptions(wm, text, fontSize, opacity, 4, 4)
  const overlayX = typeof x === 'string' ? x.replace(/\bw\b/g, 'W').replace(/\bh\b/g, 'H') : x
  const overlayY = typeof y === 'string' ? y.replace(/\bw\b/g, 'W').replace(/\bh\b/g, 'H') : y

  filters.push(`color=c=black@0.0:s=${boxWidth}x${boxHeight},format=rgba,${draw}${underline}${rotationFilter(wm.rotation)}[${layerLabel}]`)
  filters.push(`[${lastOutput}][${layerLabel}]overlay=${overlayX}:${overlayY}:shortest=1${watermarkEnableExpr(wm)}[${outputLabel}]`)
}

const textPositions = (position?: string) => {
  if (position === 'tile') {
    return [
      ['w*0.0+10', 'h*0.0+10'], ['w*0.25+10', 'h*0.0+10'], ['w*0.5+10', 'h*0.0+10'], ['w*0.75+10', 'h*0.0+10'],
      ['w*0.0+10', 'h*0.2+10'], ['w*0.25+10', 'h*0.2+10'], ['w*0.5+10', 'h*0.2+10'], ['w*0.75+10', 'h*0.2+10'],
      ['w*0.0+10', 'h*0.4+10'], ['w*0.25+10', 'h*0.4+10'], ['w*0.5+10', 'h*0.4+10'], ['w*0.75+10', 'h*0.4+10'],
      ['w*0.0+10', 'h*0.6+10'], ['w*0.25+10', 'h*0.6+10'], ['w*0.5+10', 'h*0.6+10'], ['w*0.75+10', 'h*0.6+10'],
      ['w*0.0+10', 'h*0.8+10'], ['w*0.25+10', 'h*0.8+10'], ['w*0.5+10', 'h*0.8+10'], ['w*0.75+10', 'h*0.8+10'],
    ]
  }

  if (position === 'grid') {
    return [
      ['w*0.1', 'h*0.1'], ['w*0.4', 'h*0.1'], ['w*0.7', 'h*0.1'],
      ['w*0.1', 'h*0.4'], ['w*0.4', 'h*0.4'], ['w*0.7', 'h*0.4'],
      ['w*0.1', 'h*0.7'], ['w*0.4', 'h*0.7'], ['w*0.7', 'h*0.7'],
    ]
  }

  return undefined
}

export const buildWatermarkFilters = (
  watermarks: WatermarkSpec[],
  resolveFontPath: ResolveFontPath,
): WatermarkFilterPlan => {
  const filters: string[] = []
  const imagePaths: string[] = []
  let lastOutput = '0:v'

  watermarks.forEach((wm, idx) => {
    const outputLabel = idx === watermarks.length - 1 ? 'out' : `v${idx}`
    const opacity = normalizedOpacity(wm.opacity)

    if (wm.type === 'image' && wm.path) {
      imagePaths.push(wm.path)
      const inputIdx = imagePaths.length
      const scale = wm.scale ? Number(wm.scale) / 100 : 0.5
      const imageBase = `scale=iw*${scale}:ih*${scale},format=rgba,colorchannelmixer=aa=${opacity}${rotationFilter(wm.rotation)}`

      if (wm.position === 'tile') {
        const tileCount = 16
        filters.push(`[${inputIdx}:v]${imageBase},split=${tileCount}${Array.from({ length: tileCount }, (_, i) => `[wm${idx}_${i}]`).join('')}`)
        const tilePositions = [
          [0.0, 0.0], [0.25, 0.0], [0.5, 0.0], [0.75, 0.0],
          [0.0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25],
          [0.0, 0.5], [0.25, 0.5], [0.5, 0.5], [0.75, 0.5],
          [0.0, 0.75], [0.25, 0.75], [0.5, 0.75], [0.75, 0.75],
        ]

        tilePositions.forEach(([px, py], i) => {
          const currentOutput = i === tilePositions.length - 1 ? outputLabel : `t${idx}_${i}`
          filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=W*${px}:H*${py}:eof_action=repeat${watermarkEnableExpr(wm)}[${currentOutput}]`)
          lastOutput = currentOutput
        })
      } else if (wm.position === 'grid') {
        const gridCount = 9
        filters.push(`[${inputIdx}:v]${imageBase},split=${gridCount}${Array.from({ length: gridCount }, (_, i) => `[wm${idx}_${i}]`).join('')}`)
        const gridPositions = [
          [0.1, 0.1], [0.4, 0.1], [0.7, 0.1],
          [0.1, 0.4], [0.4, 0.4], [0.7, 0.4],
          [0.1, 0.7], [0.4, 0.7], [0.7, 0.7],
        ]

        gridPositions.forEach(([px, py], i) => {
          const currentOutput = i === gridPositions.length - 1 ? outputLabel : `g${idx}_${i}`
          filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=W*${px}:H*${py}:eof_action=repeat${watermarkEnableExpr(wm)}[${currentOutput}]`)
          lastOutput = currentOutput
        })
      } else {
        const overlayX = wm.actualX !== undefined ? rounded(wm.actualX) : rounded(wm.x || 10, 10)
        const overlayY = wm.actualY !== undefined ? rounded(wm.actualY) : rounded(wm.y || 10, 10)
        filters.push(`[${inputIdx}:v]${imageBase}[wm${idx}]`)
        filters.push(`[${lastOutput}][wm${idx}]overlay=${overlayX}:${overlayY}:eof_action=repeat${watermarkEnableExpr(wm)}[${outputLabel}]`)
        lastOutput = outputLabel
      }

      return
    }

    if (wm.type === 'text' && wm.text) {
      const fontSize = rounded(wm.actualFontSize || wm.fontSize || 24, 24)
      const fontPath = resolveFontPath(wm.fontFamily, { bold: wm.bold, italic: wm.italic })
      const positions = textPositions(wm.position)
      const useLayer = Boolean(wm.rotation && Math.abs(Number(wm.rotation)) >= 0.01)

      if (positions) {
        positions.forEach(([x, y], posIdx) => {
          const currentOutput = posIdx === positions.length - 1 ? outputLabel : `${wm.position === 'grid' ? 'gt' : 'tt'}${idx}_${posIdx}`
          if (useLayer) {
            addLayerTextFilter(filters, lastOutput, currentOutput, wm, wm.text || '', fontPath, fontSize, opacity, x, y, idx, String(posIdx))
          } else {
            addDirectTextFilter(filters, lastOutput, currentOutput, wm, wm.text || '', fontPath, fontSize, opacity, x, y)
          }
          lastOutput = currentOutput
        })
      } else {
        const actualX = wm.actualX !== undefined ? rounded(wm.actualX) : rounded(wm.x || 10, 10)
        const actualY = wm.actualY !== undefined ? rounded(wm.actualY) : rounded(wm.y || 10, 10)
        if (useLayer) {
          addLayerTextFilter(filters, lastOutput, outputLabel, wm, wm.text || '', fontPath, fontSize, opacity, actualX, actualY, idx, 'custom')
        } else {
          addDirectTextFilter(filters, lastOutput, outputLabel, wm, wm.text || '', fontPath, fontSize, opacity, actualX, actualY)
        }
        lastOutput = outputLabel
      }
    }
  })

  return { filters, imagePaths }
}
