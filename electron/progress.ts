const normalizedProgressNumber = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

export const clampProgressPercent = (value: unknown) =>
  Math.round(normalizedProgressNumber(value))

export const scaleProgressPercent = (value: unknown, start: number, span: number) =>
  clampProgressPercent(start + (normalizedProgressNumber(value) / 100) * span)
