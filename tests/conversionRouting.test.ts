import { describe, expect, it } from 'vitest'

import { resolveElectronConversionChannel } from '../src/services/conversionRouting'

describe('resolveElectronConversionChannel', () => {
  it('routes module-specific workflows to their Electron IPC handlers', () => {
    expect(resolveElectronConversionChannel({ type: 'merge', format: 'mp4' })).toBe('merge-videos')
    expect(resolveElectronConversionChannel({ type: 'compress-video', format: 'avi' })).toBe('compress-video')
    expect(resolveElectronConversionChannel({ type: 'extract-audio', format: 'mp3' })).toBe('extract-audio')
    expect(resolveElectronConversionChannel({ type: 'video-to-gif' })).toBe('video-to-gif')
  })

  it('falls back to audio or video conversion by output format', () => {
    expect(resolveElectronConversionChannel({ format: 'm4a' })).toBe('convert-audio')
    expect(resolveElectronConversionChannel({ format: 'avi' })).toBe('convert-video')
  })
})
