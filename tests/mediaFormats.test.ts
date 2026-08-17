import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  coerceFormatForScope,
  DEFAULT_AUDIO_FORMAT,
  DEFAULT_VIDEO_FORMAT,
  isAudioFormat,
  isVideoFormat,
} from '../src/utils/mediaFormats'
import {
  buildOutputName,
  isFileOutputCustomized,
  markFileOutputCustomized,
  resetFileOutputStatus,
} from '../src/utils/outputSettings'
import { createVideoConversionPlan } from '../electron/videoConversionProfiles'

const projectRoot = process.cwd()
const modulePath = (file: string) => path.join(projectRoot, 'src', 'views', 'modules', file)

describe('media format scopes', () => {
  it('coerces output formats to the active module scope', () => {
    expect(coerceFormatForScope('mp3', 'video')).toBe(DEFAULT_VIDEO_FORMAT)
    expect(coerceFormatForScope('avi', 'video')).toBe('AVI')
    expect(coerceFormatForScope('mp4', 'audio')).toBe(DEFAULT_AUDIO_FORMAT)
    expect(coerceFormatForScope('flac', 'audio')).toBe('FLAC')
    expect(coerceFormatForScope('m4a', 'all')).toBe('M4A')
    expect(coerceFormatForScope('webm', 'all')).toBe('WEBM')
  })

  it('classifies audio and video formats separately', () => {
    expect(isVideoFormat('mp4')).toBe(true)
    expect(isVideoFormat('mp3')).toBe(false)
    expect(isAudioFormat('mp3')).toBe(true)
    expect(isAudioFormat('mp4')).toBe(false)
  })

  it('keeps module settings dialogs constrained to their product workflow', () => {
    const videoOnlyModules = ['VideoConvert.vue', 'VideoCompress.vue', 'VideoMerge.vue', 'VideoWatermark.vue']
    const audioOnlyModules = ['AudioConvert.vue', 'VideoExtractAudio.vue']

    for (const file of videoOnlyModules) {
      expect(fs.readFileSync(modulePath(file), 'utf8'), file).toContain('format-scope="video"')
    }

    for (const file of audioOnlyModules) {
      expect(fs.readFileSync(modulePath(file), 'utf8'), file).toContain('format-scope="audio"')
    }
  })

  it('tracks file-level output customizations separately from default settings', () => {
    const file = { name: 'clip.mp4', status: 'completed', progress: 100 }

    expect(isFileOutputCustomized(file)).toBe(false)
    markFileOutputCustomized(file)
    expect(isFileOutputCustomized(file)).toBe(true)

    resetFileOutputStatus(file)
    expect(file.status).toBe('pending')
    expect(file.progress).toBe(0)
    expect(buildOutputName('clip.mp4', '_watermark', 'AVI')).toBe('clip_watermark.avi')
    expect(buildOutputName('clip', '_compress', 'MP4')).toBe('clip_compress.mp4')
  })

  it('keeps row settings and bottom default settings separated in video modules', () => {
    const videoConvert = fs.readFileSync(modulePath('VideoConvert.vue'), 'utf8')
    const videoCompress = fs.readFileSync(modulePath('VideoCompress.vue'), 'utf8')
    const videoWatermark = fs.readFileSync(modulePath('VideoWatermark.vue'), 'utf8')

    expect(videoConvert).toContain('@settings="openSettings(file)"')
    expect(videoConvert).toContain('@show-settings="openSettings()"')
    expect(videoConvert).toContain('if (!isFileOutputCustomized(f))')

    expect(videoCompress).toContain('@settings="openSettings(file)"')
    expect(videoCompress).toContain('if (!isFileOutputCustomized(f))')

    expect(videoWatermark).toContain('@click="openSettings(file)"')
    expect(videoWatermark).toContain('@show-settings="openSettings()"')
    expect(videoWatermark).toContain('if (!isFileOutputCustomized(f))')
  })

  it('keeps row settings and bottom default settings separated in audio modules', () => {
    const audioConvert = fs.readFileSync(modulePath('AudioConvert.vue'), 'utf8')
    const videoExtractAudio = fs.readFileSync(modulePath('VideoExtractAudio.vue'), 'utf8')

    expect(audioConvert).toContain('@click="openSettings(file)"')
    expect(audioConvert).toContain('@click="openSettings()"')
    expect(audioConvert).toContain('markFileOutputCustomized(f, customized)')
    expect(audioConvert).toContain('if (!isFileOutputCustomized(f))')
    expect(audioConvert).toContain('return isFileOutputCustomized(file) ? undefined : (bitrate.value || undefined)')

    expect(videoExtractAudio).toContain('@click="openSettings(file)"')
    expect(videoExtractAudio).toContain('@click="openSettings()"')
    expect(videoExtractAudio).toContain('markFileOutputCustomized(f, customized)')
    expect(videoExtractAudio).toContain('if (!isFileOutputCustomized(f))')
  })

  it('persists merge detail settings and passes them to Electron conversion', () => {
    const videoMerge = fs.readFileSync(modulePath('VideoMerge.vue'), 'utf8')
    const electronMain = fs.readFileSync(path.join(projectRoot, 'electron', 'main.ts'), 'utf8')

    expect(videoMerge).toContain(':initial-settings="mergeSettings"')
    expect(videoMerge).toContain('mergeSettings.value = cloneOutputSettings(data.settings)')
    expect(videoMerge).toContain('settings: cloneOutputSettings(mergeSettings.value)')
    expect(electronMain).toContain('settings?: VideoConversionSettings')
    expect(electronMain).toContain("createVideoConversionPlan(format || outputExtensionFromPath(outputPath, 'mp4'), settings)")
  })

  it('preserves every detailed compression setting through save and execution paths', () => {
    const videoCompress = fs.readFileSync(modulePath('VideoCompress.vue'), 'utf8')
    const electronMain = fs.readFileSync(path.join(projectRoot, 'electron', 'main.ts'), 'utf8')

    for (const key of ['videoCodec', 'audioCodec', 'channels', 'sampleRate']) {
      expect(videoCompress, `VideoCompress should persist ${key}`).toContain(`${key}: settings?.${key} || 'auto'`)
      expect(videoCompress, `VideoCompress should send ${key}`).toContain(`${key}: settings.${key}`)
      expect(electronMain, `compress-video should receive ${key}`).toContain(`${key}`)
    }
  })

  it('allows video conversion plans to honor editable audio channel settings', () => {
    expect(createVideoConversionPlan('mp4', { channels: 'mono' }).audioChannels).toBe(1)
    expect(createVideoConversionPlan('mp4', { channels: 'stereo' }).audioChannels).toBe(2)
    expect(createVideoConversionPlan('mp4', { channels: 'auto' }).audioChannels).toBeUndefined()
  })
})
