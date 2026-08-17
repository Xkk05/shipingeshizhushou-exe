import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'

import { toIpcPayload } from '../src/utils/ipcPayload'

describe('toIpcPayload', () => {
  it('turns reactive module state into structured-clone-safe plain data', () => {
    const source = reactive({
      id: 'watermark-1',
      nested: { x: 12, y: 24 },
      file: new File(['logo'], 'logo.png', { type: 'image/png' }),
      onDone: () => undefined,
    })

    const payload = toIpcPayload(source)

    expect(payload).toEqual({
      id: 'watermark-1',
      nested: { x: 12, y: 24 },
    })
    expect(() => structuredClone(payload)).not.toThrow()
  })

  it('drops circular references instead of leaking uncloneable objects', () => {
    const source: any = { id: 'merge-1', inputPaths: ['a.mp4', 'b.mp4'] }
    source.self = source

    const payload = toIpcPayload(source)

    expect(payload).toEqual({ id: 'merge-1', inputPaths: ['a.mp4', 'b.mp4'] })
    expect(() => structuredClone(payload)).not.toThrow()
  })
})
