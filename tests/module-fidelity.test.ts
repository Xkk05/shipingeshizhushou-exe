// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

import { createAudioConversionPlan, type AudioConversionPlan, type AudioConversionSettings } from '../electron/audioConversionProfiles'
import { outputFormatFromPath } from '../electron/videoConversionProfiles'
import { buildWatermarkFilters, type WatermarkSpec } from '../electron/watermarkFilters'

type ProbeStream = {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  sample_rate?: string
}

type ProbeData = {
  format?: {
    duration?: string
    size?: string
    format_name?: string
  }
  streams?: ProbeStream[]
}

const ffmpegPath = ffmpegInstaller.path
const ffprobePath = ffprobeInstaller.path
const timeoutMs = 360_000
const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null'

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const run = (file: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`${path.basename(file)} failed: ${stderr || error.message}`))
        return
      }
      resolve()
    })
  })

const runFfmpeg = (args: string[]) => run(ffmpegPath, ['-y', '-hide_banner', ...args])

const probe = (filePath: string) =>
  new Promise<ProbeData>((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe failed for ${filePath}: ${stderr || error.message}`))
          return
        }
        resolve(JSON.parse(stdout) as ProbeData)
      },
    )
  })

const expectDecodesWithoutErrors = (filePath: string) =>
  new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-v', 'error', '-i', filePath, '-f', 'null', nullOutput],
      { windowsHide: true },
      (error, _stdout, stderr) => {
        if (error || stderr.trim()) {
          reject(new Error(`decode failed for ${filePath}: ${stderr || error?.message}`))
          return
        }
        resolve()
      },
    )
  })

const videoStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'video')
const audioStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'audio')
const duration = (data: ProbeData) => Number(data.format?.duration || 0)
const fileSize = async (filePath: string) => (await fs.stat(filePath)).size

const runAudioConversionPlan = (inputPath: string, outputPath: string, plan: AudioConversionPlan) =>
  new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo().audioCodec(plan.audioCodec)

    if (plan.audioBitrate) command = command.audioBitrate(plan.audioBitrate)
    if (plan.sampleRate) command = command.audioFrequency(plan.sampleRate)
    if (plan.audioChannels) command = command.audioChannels(plan.audioChannels)
    if (plan.outputOptions.length > 0) command = command.outputOptions(plan.outputOptions)

    command.toFormat(plan.muxer).on('end', resolve).on('error', reject).save(outputPath)
  })

const applyCompressionCodecs = (command: ffmpeg.FfmpegCommand, ext: string) => {
  if (ext === 'webm') return command.videoCodec('libvpx-vp9').audioCodec('libopus')
  if (ext === 'avi') return command.videoCodec('mpeg4').audioCodec('libmp3lame')
  if (ext === 'wmv') return command.videoCodec('wmv2').audioCodec('wmav2')
  if (ext === 'mpg' || ext === 'mpeg' || ext === 'vob') return command.videoCodec('mpeg2video').audioCodec('mp2')
  if (ext === 'ogv') return command.videoCodec('libvpx').audioCodec('libvorbis')
  return command.videoCodec('libx264').audioCodec('aac')
}

const runCompressionLikeModule = (
  inputPath: string,
  outputPath: string,
  options: { width: number; height: number; videoBitrate: string; audioBitrate: string; mode?: string },
) =>
  new Promise<void>((resolve, reject) => {
    const ext = path.extname(outputPath).slice(1).toLowerCase()
    const modeKey = options.mode || 'quality'
    const crfMap: Record<string, number> = { speed: 30, quality: 28, clarity: 24 }
    const presetMap: Record<string, string> = { speed: 'veryfast', quality: 'medium', clarity: 'slow' }
    const outputOptions = ['-pix_fmt', 'yuv420p']

    if (['mp4', 'm4v', 'mkv', 'mov', 'flv', 'f4v', 'swf', '3gp', 'ts', 'm2ts', 'mts', 'm2t'].includes(ext)) {
      outputOptions.push('-preset', presetMap[modeKey] || 'medium', '-crf', String(crfMap[modeKey] || 28))
    } else if (ext === 'webm') {
      outputOptions.push('-crf', String(crfMap[modeKey] || 28))
    }
    if (['mp4', 'm4v', 'mov', 'f4v', '3gp'].includes(ext)) outputOptions.push('-movflags', '+faststart')
    if (ext === 'flv' || ext === 'swf') outputOptions.push('-flvflags', 'add_keyframe_index')

    applyCompressionCodecs(ffmpeg(inputPath), ext)
      .videoBitrate(`${options.videoBitrate}k`)
      .audioBitrate(`${options.audioBitrate}k`)
      .outputOptions([...outputOptions, '-maxrate', `${options.videoBitrate}k`, '-bufsize', `${Number(options.videoBitrate) * 2}k`])
      .size(`${options.width}x${options.height}`)
      .toFormat(outputFormatFromPath(outputPath))
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })

const firstExistingFont = async () => {
  const candidates = [
    'C:\\Windows\\Fonts\\simhei.ttf',
    'C:\\Windows\\Fonts\\msyh.ttc',
    'C:\\Windows\\Fonts\\arial.ttf',
  ]

  for (const fontPath of candidates) {
    try {
      await fs.access(fontPath)
      return fontPath
    } catch {
      // Try the next common Windows font.
    }
  }

  return undefined
}

const runWatermarkLikeModule = async (
  inputPath: string,
  outputPath: string,
  watermarks: WatermarkSpec[],
  fontFile: string,
) =>
  new Promise<void>((resolve, reject) => {
    const { filters, imagePaths } = buildWatermarkFilters(watermarks, () => fontFile)
    let command = ffmpeg(inputPath)
    let startedCommand = ''
    const stderrLines: string[] = []

    imagePaths.forEach((imagePath) => {
      command = command.input(imagePath)
    })

    command
      .complexFilter(filters)
      .outputOptions(['-map [out]', '-map 0:a?'])
      .videoCodec('libx264')
      .audioCodec('copy')
      .toFormat(outputFormatFromPath(outputPath))
      .on('start', (cmd: string) => {
        startedCommand = cmd
      })
      .on('stderr', (line: string) => {
        stderrLines.push(line)
      })
      .on('end', resolve)
      .on('error', (error) => {
        reject(new Error(`${error.message}\n${stderrLines.slice(-20).join('\n')}\n${startedCommand}\nfilters=${filters.join(';')}`))
      })
      .save(outputPath)
  })

describe('module fidelity workflows', () => {
  let tempDir = ''
  let sourceA = ''
  let sourceB = ''
  let sourceC = ''
  let audioSource = ''
  let logoPng = ''

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kunqiu-module-fidelity-'))
    sourceA = path.join(tempDir, 'source-a.mp4')
    sourceB = path.join(tempDir, 'source-b.mov')
    sourceC = path.join(tempDir, 'source-c.webm')
    audioSource = path.join(tempDir, 'source-audio.wav')
    logoPng = path.join(tempDir, 'logo.png')

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=320x180:rate=30',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=880:sample_rate=44100',
      '-t',
      '4',
      '-c:v',
      'libx264',
      '-b:v',
      '1600k',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      sourceA,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'smptebars=size=240x320:rate=24',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=660:sample_rate=48000',
      '-t',
      '3',
      '-c:v',
      'libx264',
      '-b:v',
      '1400k',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      sourceB,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=300x180:rate=25',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=48000',
      '-t',
      '2.5',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '900k',
      '-c:a',
      'libopus',
      '-b:a',
      '96k',
      sourceC,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=523:sample_rate=44100',
      '-t',
      '3',
      '-c:a',
      'pcm_s16le',
      audioSource,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'color=c=0xffcc00:s=56x28',
      '-frames:v',
      '1',
      logoPng,
    ])
  }, timeoutMs)

  afterAll(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('video compression module batch-exports playable, smaller MP4 files', async () => {
    const batch = [
      { input: sourceA, output: path.join(tempDir, 'compressed-a.mp4'), width: 160, height: 90 },
      { input: sourceB, output: path.join(tempDir, 'compressed-b.mp4'), width: 120, height: 160 },
    ]

    for (const item of batch) {
      await runCompressionLikeModule(item.input, item.output, {
        width: item.width,
        height: item.height,
        videoBitrate: '220',
        audioBitrate: '64',
        mode: 'speed',
      })

      const metadata = await probe(item.output)
      expect(videoStream(metadata)?.codec_name).toBe('h264')
      expect(audioStream(metadata)?.codec_name).toBe('aac')
      expect(videoStream(metadata)?.width).toBe(item.width)
      expect(videoStream(metadata)?.height).toBe(item.height)
      expect(await fileSize(item.output)).toBeLessThan(await fileSize(item.input))
      await expectDecodesWithoutErrors(item.output)
    }
  }, timeoutMs)

  it('audio conversion module batch-exports every supported audio format as playable audio-only files', async () => {
    const formats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'm4r', 'aac', 'wma', 'aiff', 'mp2']
    const expectedCodecs: Record<string, string> = {
      mp3: 'mp3',
      wav: 'pcm_s16le',
      ogg: 'vorbis',
      flac: 'flac',
      m4a: 'aac',
      m4r: 'aac',
      aac: 'aac',
      wma: 'wmav2',
      aiff: 'pcm_s16be',
      mp2: 'mp2',
    }
    const settings: AudioConversionSettings = {
      audioCodec: 'ac3',
      audioBitrate: '256',
      sampleRate: '24000',
      channels: 'stereo',
    }

    for (const format of formats) {
      const outputPath = path.join(tempDir, `audio-convert.${format}`)
      await runAudioConversionPlan(audioSource, outputPath, createAudioConversionPlan(format, settings))

      const metadata = await probe(outputPath)
      expect(videoStream(metadata), `${format} should be audio-only`).toBeUndefined()
      expect(audioStream(metadata)?.codec_name, `${format} codec`).toBe(expectedCodecs[format])
      expect(duration(metadata), `${format} duration`).toBeGreaterThan(2.7)
      await expectDecodesWithoutErrors(outputPath)
    }
  }, timeoutMs)

  it('video extract audio module batch-exports playable audio-only files from different video sources', async () => {
    const batch = [
      { input: sourceA, output: path.join(tempDir, 'extract-a.mp3'), format: 'mp3' },
      { input: sourceC, output: path.join(tempDir, 'extract-c.ogg'), format: 'ogg' },
    ]

    for (const item of batch) {
      await runAudioConversionPlan(
        item.input,
        item.output,
        createAudioConversionPlan(item.format, { audioBitrate: '192', sampleRate: '44100', channels: 'stereo' }),
      )

      const metadata = await probe(item.output)
      expect(videoStream(metadata)).toBeUndefined()
      expect(audioStream(metadata)).toBeTruthy()
      expect(duration(metadata)).toBeGreaterThan(2)
      await expectDecodesWithoutErrors(item.output)
    }
  }, timeoutMs)

  it('video to GIF module batch-exports playable clips with requested timing and width', async () => {
    const batch = [
      { input: sourceA, output: path.join(tempDir, 'clip-a.gif'), start: '0.5', seconds: '1.2', width: 120, fps: 8 },
      { input: sourceB, output: path.join(tempDir, 'clip-b.gif'), start: '0.2', seconds: '1.0', width: 96, fps: 10 },
    ]

    for (const item of batch) {
      await runFfmpeg([
        '-ss',
        item.start,
        '-t',
        item.seconds,
        '-i',
        item.input,
        '-vf',
        `scale=${item.width}:-1:flags=lanczos,fps=${item.fps}`,
        '-f',
        'gif',
        item.output,
      ])

      const metadata = await probe(item.output)
      expect(videoStream(metadata)?.width).toBe(item.width)
      expect(duration(metadata)).toBeGreaterThan(0.7)
      await expectDecodesWithoutErrors(item.output)
    }
  }, timeoutMs)

  it('video merge module normalizes mixed source formats before producing one playable MP4', async () => {
    const tempTsFiles = [sourceA, sourceB, sourceC].map((_, index) => path.join(tempDir, `merge-temp-${index}.ts`))
    const outputPath = path.join(tempDir, 'merged-module.mp4')

    for (let index = 0; index < tempTsFiles.length; index++) {
      await runFfmpeg([
        '-i',
        [sourceA, sourceB, sourceC][index],
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-preset',
        'ultrafast',
        '-crf',
        '23',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-f',
        'mpegts',
        tempTsFiles[index],
      ])
    }

    const concatList = tempTsFiles.map((filePath) => filePath.replace(/\\/g, '/')).join('|')
    await runFfmpeg(['-f', 'mpegts', '-i', `concat:${concatList}`, '-c:v', 'copy', '-c:a', 'copy', '-f', 'mp4', outputPath])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.codec_name).toBe('h264')
    expect(audioStream(metadata)?.codec_name).toBe('aac')
    expect(duration(metadata)).toBeGreaterThan(8.5)
    await expectDecodesWithoutErrors(outputPath)
  }, timeoutMs)

  it('video watermark module produces playable styled text, image, and remove-watermark outputs', async () => {
    const fontFile = await firstExistingFont()
    expect(fontFile).toBeTruthy()

    const advancedOutput = path.join(tempDir, 'watermark-advanced.mp4')
    await runWatermarkLikeModule(
      sourceA,
      advancedOutput,
      [
        {
          type: 'text',
          text: "QA: don't fail",
          x: 18,
          y: 16,
          position: 'grid',
          opacity: 85,
          rotation: 12,
          fontSize: 18,
          bold: true,
          italic: true,
          underline: true,
          startTime: 0.2,
          endTime: 3.5,
        },
        {
          type: 'image',
          path: logoPng,
          x: 20,
          y: 20,
          position: 'tile',
          opacity: 65,
          scale: 70,
          rotation: -10,
        },
      ],
      fontFile || '',
    )

    const removeOutput = path.join(tempDir, 'watermark-removed.mp4')
    await runFfmpeg([
      '-i',
      advancedOutput,
      '-vf',
      'drawbox=x=18:y=18:w=60:h=34:color=0x202020:t=fill,scale=160:90',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-f',
      'mp4',
      removeOutput,
    ])

    for (const outputPath of [advancedOutput, removeOutput]) {
      const metadata = await probe(outputPath)
      expect(videoStream(metadata)?.codec_name).toBe('h264')
      expect(audioStream(metadata)?.codec_name).toBe('aac')
      expect(duration(metadata)).toBeGreaterThan(3.5)
      await expectDecodesWithoutErrors(outputPath)
    }
  }, timeoutMs)
})
