const isBrowserFileLike = (value: unknown) =>
  (typeof File !== 'undefined' && value instanceof File) ||
  (typeof Blob !== 'undefined' && value instanceof Blob) ||
  (typeof Element !== 'undefined' && value instanceof Element)

export const toIpcPayload = <T>(value: T): T => {
  const seen = new WeakSet<object>()
  const serialized = JSON.stringify(value, (_key, current) => {
    if (typeof current === 'bigint') return current.toString()
    if (typeof current === 'function' || typeof current === 'symbol') return undefined
    if (!current || typeof current !== 'object') return current
    if (isBrowserFileLike(current)) return undefined

    if (seen.has(current)) return undefined
    seen.add(current)
    return current
  })

  return serialized === undefined ? value : JSON.parse(serialized)
}
