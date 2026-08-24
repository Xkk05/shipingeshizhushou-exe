export type WatermarkLayoutPoint = {
  xRatio: number
  yRatio: number
  offsetX?: number
  offsetY?: number
}

export const imageTileLayout: WatermarkLayoutPoint[] = [
  { xRatio: 0, yRatio: 0 }, { xRatio: 0.25, yRatio: 0 }, { xRatio: 0.5, yRatio: 0 }, { xRatio: 0.75, yRatio: 0 },
  { xRatio: 0, yRatio: 0.25 }, { xRatio: 0.25, yRatio: 0.25 }, { xRatio: 0.5, yRatio: 0.25 }, { xRatio: 0.75, yRatio: 0.25 },
  { xRatio: 0, yRatio: 0.5 }, { xRatio: 0.25, yRatio: 0.5 }, { xRatio: 0.5, yRatio: 0.5 }, { xRatio: 0.75, yRatio: 0.5 },
  { xRatio: 0, yRatio: 0.75 }, { xRatio: 0.25, yRatio: 0.75 }, { xRatio: 0.5, yRatio: 0.75 }, { xRatio: 0.75, yRatio: 0.75 },
]

export const textTileLayout: WatermarkLayoutPoint[] = [
  { xRatio: 0, yRatio: 0, offsetX: 10, offsetY: 10 }, { xRatio: 0.25, yRatio: 0, offsetX: 10, offsetY: 10 }, { xRatio: 0.5, yRatio: 0, offsetX: 10, offsetY: 10 }, { xRatio: 0.75, yRatio: 0, offsetX: 10, offsetY: 10 },
  { xRatio: 0, yRatio: 0.2, offsetX: 10, offsetY: 10 }, { xRatio: 0.25, yRatio: 0.2, offsetX: 10, offsetY: 10 }, { xRatio: 0.5, yRatio: 0.2, offsetX: 10, offsetY: 10 }, { xRatio: 0.75, yRatio: 0.2, offsetX: 10, offsetY: 10 },
  { xRatio: 0, yRatio: 0.4, offsetX: 10, offsetY: 10 }, { xRatio: 0.25, yRatio: 0.4, offsetX: 10, offsetY: 10 }, { xRatio: 0.5, yRatio: 0.4, offsetX: 10, offsetY: 10 }, { xRatio: 0.75, yRatio: 0.4, offsetX: 10, offsetY: 10 },
  { xRatio: 0, yRatio: 0.6, offsetX: 10, offsetY: 10 }, { xRatio: 0.25, yRatio: 0.6, offsetX: 10, offsetY: 10 }, { xRatio: 0.5, yRatio: 0.6, offsetX: 10, offsetY: 10 }, { xRatio: 0.75, yRatio: 0.6, offsetX: 10, offsetY: 10 },
  { xRatio: 0, yRatio: 0.8, offsetX: 10, offsetY: 10 }, { xRatio: 0.25, yRatio: 0.8, offsetX: 10, offsetY: 10 }, { xRatio: 0.5, yRatio: 0.8, offsetX: 10, offsetY: 10 }, { xRatio: 0.75, yRatio: 0.8, offsetX: 10, offsetY: 10 },
]

export const gridLayout: WatermarkLayoutPoint[] = [
  { xRatio: 0.1, yRatio: 0.1 }, { xRatio: 0.4, yRatio: 0.1 }, { xRatio: 0.7, yRatio: 0.1 },
  { xRatio: 0.1, yRatio: 0.4 }, { xRatio: 0.4, yRatio: 0.4 }, { xRatio: 0.7, yRatio: 0.4 },
  { xRatio: 0.1, yRatio: 0.7 }, { xRatio: 0.4, yRatio: 0.7 }, { xRatio: 0.7, yRatio: 0.7 },
]

export const layoutPositions = (
  points: WatermarkLayoutPoint[],
  width: number,
  height: number,
) => points.map((point) => ({
  x: width * point.xRatio + (point.offsetX || 0),
  y: height * point.yRatio + (point.offsetY || 0),
}))

const ratioText = (value: number) => Number(value.toFixed(4)).toString()

const ffmpegAxisExpression = (symbol: string, ratio: number, offset = 0) => {
  const base = `${symbol}*${ratioText(ratio)}`
  return offset ? `${base}+${offset}` : base
}

export const ffmpegPositionExpression = (
  point: WatermarkLayoutPoint,
  widthSymbol = 'W',
  heightSymbol = 'H',
) => [
  ffmpegAxisExpression(widthSymbol, point.xRatio, point.offsetX),
  ffmpegAxisExpression(heightSymbol, point.yRatio, point.offsetY),
] as const
