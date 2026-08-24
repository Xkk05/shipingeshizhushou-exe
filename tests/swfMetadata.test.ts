// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

import { readSwfMetadata, repairSwfFrameCount } from '../electron/swfMetadata'

const ffmpegPath = ffmpegInstaller.path
const ffprobePath = ffprobeInstaller.path

const run = (file: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve()
    })
  })

const probeDuration = (filePath: string) =>
  new Promise<number>((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
          return
        }
        resolve(Number(stdout.trim() || 0))
      },
    )
  })

describe('repairSwfFrameCount', () => {
  it('derives duration when ffprobe cannot expose SWF format duration', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kunqiu-swf-metadata-'))
    const outputPath = path.join(tempDir, 'sample.swf')

    try {
      await run(ffmpegPath, [
        '-y',
        '-hide_banner',
        '-f',
        'lavfi',
        '-i',
        'testsrc=size=160x90:rate=24',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=880:sample_rate=44100',
        '-t',
        '2',
        '-c:v',
        'flv',
        '-c:a',
        'libmp3lame',
        '-f',
        'swf',
        outputPath,
      ])

      expect(await probeDuration(outputPath)).not.toBeGreaterThan(1.5)

      const result = repairSwfFrameCount(outputPath)
      const metadata = readSwfMetadata(outputPath)

      expect(result?.frameCount).toBeGreaterThan(0)
      expect(metadata?.frameRate).toBe(24)
      expect(metadata?.duration).toBeGreaterThan(1.5)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }, 120_000)
})
