import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { clampProgressPercent, scaleProgressPercent } from '../electron/progress'
import { buildWatermarkFilters } from '../electron/watermarkFilters'
import { containsCjkText } from '../electron/watermarkFonts'
import { useFileStore } from '../src/stores/fileStore'
import { estimateCompressedSize } from '../src/utils/compressionEstimate'
import { clampProgress } from '../src/utils/progress'
import {
  ffmpegPositionExpression,
  gridLayout,
  imageTileLayout,
  layoutPositions,
  textTileLayout,
} from '../src/utils/watermarkLayout'

const projectRoot = process.cwd()

describe('progress normalization', () => {
  it('bounds UI and Electron progress percentages to 0-100', () => {
    expect(clampProgress(-12)).toBe(0)
    expect(clampProgress(43.6)).toBe(44)
    expect(clampProgress(130)).toBe(100)
    expect(clampProgressPercent(Number.NaN)).toBe(0)
    expect(scaleProgressPercent(50, 50, 50)).toBe(75)
    expect(scaleProgressPercent(180, 50, 50)).toBe(100)
  })

  it('keeps merge task progress in shared state across page remounts', () => {
    setActivePinia(createPinia())
    const firstStore = useFileStore()

    firstStore.videoMergeState = {
      taskId: 'merge-task-1',
      merging: true,
      progress: clampProgress(64),
      status: '',
    }

    const remountedStore = useFileStore()

    expect(remountedStore.videoMergeState).toEqual({
      taskId: 'merge-task-1',
      merging: true,
      progress: 64,
      status: '',
    })
  })
})

describe('compression estimates', () => {
  it('uses mode and bitrate inputs instead of a fixed percentage', () => {
    const sourceSize = 127 * 1024
    const durationSeconds = 2
    const sourceBitrate = (sourceSize * 8) / durationSeconds

    const estimated = estimateCompressedSize({
      durationSeconds,
      mode: 'speed',
      sourceBitrate,
      sourceSize,
    })

    expect(estimated).toBeGreaterThan(110 * 1024)
    expect(estimated).toBeLessThan(sourceSize)
  })

  it('keeps high-bitrate auto compression estimates close to CRF output', () => {
    const sourceSize = 84.6 * 1024 * 1024
    const durationSeconds = 115
    const sourceBitrate = (sourceSize * 8) / durationSeconds

    const estimated = estimateCompressedSize({
      durationSeconds,
      mode: 'quality',
      sourceBitrate,
      sourceSize,
    })

    expect(estimated).toBeGreaterThan(13 * 1024 * 1024)
    expect(estimated).toBeLessThan(18 * 1024 * 1024)
  })
  it('keeps estimated and actual compressed sizes as separate tracked values', () => {
    const videoCompress = fs.readFileSync(path.join(projectRoot, 'src', 'views', 'modules', 'VideoCompress.vue'), 'utf8')
    const fileListItem = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'FileListItem.vue'), 'utf8')
    const electronMain = fs.readFileSync(path.join(projectRoot, 'electron', 'main.ts'), 'utf8')

    expect(videoCompress).not.toContain('file.estimatedSize = file.actualOutputSize')
    expect(videoCompress).toContain('outputSize?: number')
    expect(videoCompress).toContain('file.actualOutputSize = Math.round(outputSize)')
    expect(fileListItem).toContain("t('common.currentSize')")
    expect(fileListItem).toContain("t('common.actualSize')")
    expect(fileListItem).toContain("t('common.fileSize')")
    expect(electronMain).toContain("mainWindow?.webContents.send('compress-progress', { id, percent, outputSize, phasePercent })")
  })
})

describe('watermark layout fidelity', () => {
  it('shares tile and grid coordinates between preview and ffmpeg filters', () => {
    expect(layoutPositions(imageTileLayout, 400, 300)[1]).toEqual({ x: 100, y: 0 })
    expect(layoutPositions(textTileLayout, 400, 300)[0]).toEqual({ x: 10, y: 10 })
    expect(layoutPositions(gridLayout, 400, 300)[0]).toEqual({ x: 40, y: 30 })
    expect(ffmpegPositionExpression(textTileLayout[0], 'w', 'h')).toEqual(['w*0+10', 'h*0+10'])
  })

  it('keeps rotated image watermarks inside an uncropped transparent layer', () => {
    const { filters } = buildWatermarkFilters(
      [{ type: 'image', path: 'C:/tmp/logo.png', imageWidth: 200, imageHeight: 120, rotation: 35, scale: 60, x: 24, y: 20 }],
      () => 'C:/Windows/Fonts/arial.ttf',
    )
    const joined = filters.join(';')

    expect(joined).toContain('ow=ceil(sqrt(iw*iw+ih*ih))')
    expect(joined).toContain('oh=ceil(sqrt(iw*iw+ih*ih))')
    expect(joined).toContain('overlay=24+60-70')
    expect(joined).toContain(':20+36-70')
  })
  it('keeps bold text visually effective even when the selected font lacks a bold file', () => {
    const { filters } = buildWatermarkFilters(
      [{ type: 'text', text: 'Bold', bold: true, x: 12, y: 18 }],
      () => 'C:/Windows/Fonts/arial.ttf',
    )

    expect(filters.join(';').match(/drawtext=/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('renders text watermarks through a layer so style settings survive export', () => {
    const { filters } = buildWatermarkFilters(
      [{
        bold: true,
        fontSize: 25,
        italic: true,
        opacity: 100,
        rotation: -46,
        text: '你好',
        type: 'text',
        underline: true,
        x: 12,
        y: 18,
      }],
      () => 'C:/Windows/Fonts/msyhbd.ttc',
    )
    const joined = filters.join(';')

    expect(filters[0]).toContain('color=c=black@0.0')
    expect(filters[0]).toContain('format=rgba')
    expect(filters[0]).toContain('drawbox=')
    expect(filters[0]).toContain('drawbox=x=12:y=37:w=61:h=5')
    expect(filters[0]).toContain(':replace=1')
    expect(filters[0].indexOf('drawbox=')).toBeLessThan(filters[0].indexOf('rotate='))
    expect(filters[0]).toContain('colorchannelmixer=aa=1')
    expect(filters[1]).toContain('overlay=12+')
    expect(filters[1]).toContain(':18+')
    expect(joined.match(/drawtext=/g)?.length).toBeGreaterThanOrEqual(4)
    expect(joined).not.toContain('[0:v]drawtext=')
  })

  it('applies grid text watermarks with the shared nine-grid layout', () => {
    const { filters } = buildWatermarkFilters(
      [{ type: 'text', text: '你好', position: 'grid', rotation: -46, bold: true, italic: true, underline: true }],
      () => 'C:/Windows/Fonts/msyh.ttc',
    )
    const joined = filters.join(';')

    expect(joined.match(/overlay=/g)?.length).toBe(gridLayout.length)
    expect(joined).toContain('overlay=W*0.1+')
    expect(joined).toContain('drawbox=x=11:y=35:w=58:h=5')
    expect(joined).toContain(':replace=1')
    expect(joined.match(/drawbox=/g)?.length).toBe(gridLayout.length)
  })

  it('passes watermark text into font resolution so Chinese text can avoid Arial tofu glyphs', () => {
    let resolvedText = ''
    let resolvedFamily = ''

    const { filters } = buildWatermarkFilters(
      [{ type: 'text', text: '你好', fontFamily: 'Arial', x: 12, y: 18 }],
      (fontFamily, _style, text) => {
        resolvedFamily = fontFamily || ''
        resolvedText = text || ''
        return 'C:/Windows/Fonts/msyh.ttc'
      },
    )

    expect(resolvedFamily).toBe('Arial')
    expect(resolvedText).toBe('你好')
    expect(containsCjkText(resolvedText)).toBe(true)
    expect(filters.join(';')).toContain('msyh.ttc')
  })
})
