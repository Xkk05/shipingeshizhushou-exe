import {
  ffmpegPositionExpression,
  gridLayout,
  imageTileLayout,
  textTileLayout,
} from '../src/utils/watermarkLayout'

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
  imageWidth?: number
  imageHeight?: number
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

export type ResolveFontPath = (fontFamily?: string, style?: FontStyleOptions, text?: string) => string

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
  return `,rotate=${radians}:c=none:ow=ceil(sqrt(iw*iw+ih*ih)):oh=ceil(sqrt(iw*iw+ih*ih))`
}

const estimateTextWidth = (text: string, fontSize: number) => {
  const wideChars = Array.from(text).filter((char) => char.charCodeAt(0) > 255).length
  const narrowChars = Math.max(0, Array.from(text).length - wideChars)
  return Math.max(12, Math.ceil(wideChars * fontSize + narrowChars * fontSize * 0.62))
}

const drawtextFilter = (
  text: string,
  fontPath: string,
  fontSize: number,
  x: string | number,
  y: string | number,
) =>
  `drawtext=text='${escapeDrawtextText(text)}':fontfile='${escapeFontPath(fontPath)}':fontsize=${fontSize}:fontcolor=white@1:x=${x}:y=${y}`

const textLayerMetrics = (wm: WatermarkSpec, text: string, fontSize: number) => {
  const estimatedWidth = estimateTextWidth(text, fontSize)
  const boldBleed = wm.bold ? Math.max(2, Math.round(fontSize / 10)) : 0
  const italicBleed = wm.italic ? Math.max(2, Math.round(fontSize / 5)) : 0
  const underlineThickness = wm.underline ? Math.max(4, Math.round(fontSize / 5)) : 0
  const underlineY = wm.underline ? Math.round(fontSize) : 0
  const contentWidth = estimatedWidth + boldBleed + italicBleed
  const contentHeight = Math.ceil(fontSize * 1.35) + underlineThickness + boldBleed
  const padding = Math.max(8, Math.ceil(fontSize * 0.45))

  return {
    boxHeight: contentHeight + padding * 2,
    boxWidth: contentWidth + padding * 2,
    contentHeight,
    contentWidth,
    padding,
    underlineThickness,
    underlineWidth: estimatedWidth + boldBleed + italicBleed + Math.round(fontSize / 8),
    underlineY: padding + underlineY,
  }
}

const boldOffsets = (fontSize: number) => {
  const base = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const

  return fontSize >= 36 ? [...base, [2, 0] as const, [0, 2] as const] : base
}

const drawtextLayerFilters = (
  wm: WatermarkSpec,
  text: string,
  fontPath: string,
  fontSize: number,
  padding: number,
) => {
  const offsets = wm.bold ? boldOffsets(fontSize) : ([[0, 0]] as const)
  return offsets.map(([dx, dy]) => drawtextFilter(text, fontPath, fontSize, padding + dx, padding + dy))
}

const underlineFilter = (wm: WatermarkSpec, metrics: ReturnType<typeof textLayerMetrics>) => {
  if (!wm.underline) return ''
  return `drawbox=x=${metrics.padding}:y=${metrics.underlineY}:w=${metrics.underlineWidth}:h=${metrics.underlineThickness}:color=white@1:t=fill:replace=1`
}

const overlayBaseExpression = (value: string | number) =>
  String(value).replace(/\bw\b/g, 'W').replace(/\bh\b/g, 'H')

const layerOverlayExpression = (
  value: string | number,
  contentSize: number,
  overlaySizeSymbol: 'w' | 'h',
) => `${overlayBaseExpression(value)}+${Number((contentSize / 2).toFixed(3))}-${overlaySizeSymbol}/2`

const numericText = (value: number) => Number(value.toFixed(3)).toString()

const imageLayerMetrics = (wm: WatermarkSpec, scale: number) => {
  const sourceWidth = Number(wm.imageWidth || 0)
  const sourceHeight = Number(wm.imageHeight || 0)
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) return null

  const contentWidth = sourceWidth * scale
  const contentHeight = sourceHeight * scale
  const rotation = Number(wm.rotation || 0)
  const hasRotation = Number.isFinite(rotation) && Math.abs(rotation) >= 0.01
  const layerSize = hasRotation ? Math.ceil(Math.sqrt(contentWidth * contentWidth + contentHeight * contentHeight)) : 0

  return {
    contentHeight,
    contentWidth,
    layerHeight: hasRotation ? layerSize : contentHeight,
    layerWidth: hasRotation ? layerSize : contentWidth,
  }
}

const imageOverlayExpressions = (
  x: string | number,
  y: string | number,
  metrics: ReturnType<typeof imageLayerMetrics>,
) => {
  if (!metrics) return [overlayBaseExpression(x), overlayBaseExpression(y)] as const

  return [
    `${overlayBaseExpression(x)}+${numericText(metrics.contentWidth / 2)}-${numericText(metrics.layerWidth / 2)}`,
    `${overlayBaseExpression(y)}+${numericText(metrics.contentHeight / 2)}-${numericText(metrics.layerHeight / 2)}`,
  ] as const
}

const addTextLayerFilter = (
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
  const metrics = textLayerMetrics(wm, text, fontSize)
  const layerLabel = `txt${idx}_${suffix}`
  const layerFilters = [
    `color=c=black@0.0:s=${metrics.boxWidth}x${metrics.boxHeight}`,
    'format=rgba',
    ...drawtextLayerFilters(wm, text, fontPath, fontSize, metrics.padding),
  ]
  const underline = underlineFilter(wm, metrics)
  const overlayX = layerOverlayExpression(x, metrics.contentWidth, 'w')
  const overlayY = layerOverlayExpression(y, metrics.contentHeight, 'h')

  if (underline) layerFilters.push(underline)
  const rotation = rotationFilter(wm.rotation)
  if (rotation) layerFilters.push(rotation.slice(1))
  layerFilters.push(`colorchannelmixer=aa=${opacity}`)

  filters.push(`${layerFilters.join(',')}[${layerLabel}]`)
  filters.push(`[${lastOutput}][${layerLabel}]overlay=${overlayX}:${overlayY}:shortest=1${watermarkEnableExpr(wm)}[${outputLabel}]`)
}

const textPositions = (position?: string) => {
  const layout = position === 'tile' ? textTileLayout : position === 'grid' ? gridLayout : undefined
  return layout?.map((point) => ffmpegPositionExpression(point, 'w', 'h'))
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
      const layerMetrics = imageLayerMetrics(wm, scale)
      const imageBase = `scale=iw*${scale}:ih*${scale},setsar=1,format=rgba,colorchannelmixer=aa=${opacity}${rotationFilter(wm.rotation)}`

      if (wm.position === 'tile') {
        const tileCount = imageTileLayout.length
        filters.push(`[${inputIdx}:v]${imageBase},split=${tileCount}${Array.from({ length: tileCount }, (_, i) => `[wm${idx}_${i}]`).join('')}`)

        imageTileLayout.forEach((point, i) => {
          const currentOutput = i === imageTileLayout.length - 1 ? outputLabel : `t${idx}_${i}`
          const [tileX, tileY] = ffmpegPositionExpression(point, 'W', 'H')
          const [overlayX, overlayY] = imageOverlayExpressions(tileX, tileY, layerMetrics)
          filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=${overlayX}:${overlayY}:eof_action=repeat${watermarkEnableExpr(wm)}[${currentOutput}]`)
          lastOutput = currentOutput
        })
      } else if (wm.position === 'grid') {
        const gridCount = gridLayout.length
        filters.push(`[${inputIdx}:v]${imageBase},split=${gridCount}${Array.from({ length: gridCount }, (_, i) => `[wm${idx}_${i}]`).join('')}`)

        gridLayout.forEach((point, i) => {
          const currentOutput = i === gridLayout.length - 1 ? outputLabel : `g${idx}_${i}`
          const [gridX, gridY] = ffmpegPositionExpression(point, 'W', 'H')
          const [overlayX, overlayY] = imageOverlayExpressions(gridX, gridY, layerMetrics)
          filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=${overlayX}:${overlayY}:eof_action=repeat${watermarkEnableExpr(wm)}[${currentOutput}]`)
          lastOutput = currentOutput
        })
      } else {
        const baseX = wm.actualX !== undefined ? rounded(wm.actualX) : rounded(wm.x || 10, 10)
        const baseY = wm.actualY !== undefined ? rounded(wm.actualY) : rounded(wm.y || 10, 10)
        const [overlayX, overlayY] = imageOverlayExpressions(baseX, baseY, layerMetrics)
        filters.push(`[${inputIdx}:v]${imageBase}[wm${idx}]`)
        filters.push(`[${lastOutput}][wm${idx}]overlay=${overlayX}:${overlayY}:eof_action=repeat${watermarkEnableExpr(wm)}[${outputLabel}]`)
        lastOutput = outputLabel
      }

      return
    }

    if (wm.type === 'text' && wm.text) {
      const fontSize = rounded(wm.actualFontSize || wm.fontSize || 24, 24)
      const fontPath = resolveFontPath(wm.fontFamily, { bold: wm.bold, italic: wm.italic }, wm.text || '')
      const positions = textPositions(wm.position)

      if (positions) {
        positions.forEach(([x, y], posIdx) => {
          const currentOutput = posIdx === positions.length - 1 ? outputLabel : `${wm.position === 'grid' ? 'gt' : 'tt'}${idx}_${posIdx}`
          addTextLayerFilter(filters, lastOutput, currentOutput, wm, wm.text || '', fontPath, fontSize, opacity, x, y, idx, String(posIdx))
          lastOutput = currentOutput
        })
      } else {
        const actualX = wm.actualX !== undefined ? rounded(wm.actualX) : rounded(wm.x || 10, 10)
        const actualY = wm.actualY !== undefined ? rounded(wm.actualY) : rounded(wm.y || 10, 10)
        addTextLayerFilter(filters, lastOutput, outputLabel, wm, wm.text || '', fontPath, fontSize, opacity, actualX, actualY, idx, 'custom')
        lastOutput = outputLabel
      }
    }
  })

  return { filters, imagePaths }
}
