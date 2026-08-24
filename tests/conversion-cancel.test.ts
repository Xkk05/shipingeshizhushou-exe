import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  beginConversionRun,
  finishCancelledConversion,
  isConversionCancelRequested,
  isCurrentConversionRun,
  requestConversionCancel,
} from '../src/utils/conversionCancel'

const projectRoot = process.cwd()
const readProjectFile = (filePath: string) => fs.readFileSync(path.join(projectRoot, filePath), 'utf8')

describe('conversion cancellation', () => {
  it('marks a running file as pending without letting stale runs overwrite the next run', () => {
    const file: any = { status: 'pending', progress: 0 }

    const firstRun = beginConversionRun(file)
    expect(file.status).toBe('converting')

    requestConversionCancel(file)
    expect(file.status).toBe('pending')
    expect(file.progress).toBe(0)
    expect(isConversionCancelRequested(file, firstRun)).toBe(true)

    const secondRun = beginConversionRun(file)
    expect(isCurrentConversionRun(file, firstRun)).toBe(false)
    expect(isCurrentConversionRun(file, secondRun)).toBe(true)

    finishCancelledConversion(file)
    expect(file.status).toBe('pending')
    expect(file.cancelRequestedRunId).toBeUndefined()
  })

  it('exposes the Electron cancel IPC through the platform service', () => {
    const platformService = readProjectFile('src/services/platformService.ts')

    expect(platformService).toContain('cancelConvert(id: string): Promise<boolean>')
    expect(platformService).toContain("ipcRenderer.invoke('cancel-convert', id)")
  })

  it('turns processing buttons into cancel actions instead of disabling them', () => {
    const fileListItem = readProjectFile('src/components/FileListItem.vue')
    const videoMerge = readProjectFile('src/views/modules/VideoMerge.vue')

    expect(fileListItem).toContain("$emit('cancel', file)")
    expect(fileListItem).not.toContain(':disabled="file.status === \'converting\'"\n        @click="$emit(\'convert\', file)"')
    expect(videoMerge).toContain('cancelMerge() : mergeAll()')
    expect(videoMerge).toContain("$t('common.cancel')")
  })

  it('tracks output paths so cancelled FFmpeg jobs can remove partial files', () => {
    const electronMain = readProjectFile('electron/main.ts')

    expect(electronMain).toContain('const convertTaskOutputs = new Map<string, string>()')
    expect(electronMain).toContain('registerConvertTask(id, command, outputPath)')
    expect(electronMain).toContain("ipcMain.handle('cancel-convert'")
    expect(electronMain).toContain('require(\'fs\').unlinkSync(outputPath)')
  })
})