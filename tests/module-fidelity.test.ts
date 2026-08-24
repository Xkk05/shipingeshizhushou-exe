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
import { createVideoConversionPlan, type VideoConversionPlan, type VideoConversionSettings } from '../electron/videoConversionProfiles'
import { buildWatermarkFilters, type WatermarkSpec } from '../electron/watermarkFilters'

type ProbeStream = {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  sample_rate?: string
  duration?: string
  tags?: Record<string, string>
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
const timeoutMs = 1_200_000
const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null'

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const videoFormats = [
  'mp4',
  'avi',
  'wmv',
  'flv',
  'mkv',
  'mov',
  'webm',
  '3gp',
  'f4v',
  'ogv',
  'asf',
  'vob',
  'mpg',
  'mpeg',
  'wtv',
  'ts',
  'm2ts',
  'mts',
  'm2t',
  'm4v',
]

const audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'm4r', 'mp2', 'aac', 'wma', 'aiff']
const testOutputWidth = 96
const testOutputHeight = 54

const expectedVideoCodec: Record<string, string> = {
  flv: 'flv1',
  libx264: 'h264',
  libtheora: 'theora',
  libvpx: 'vp8',
  'libvpx-vp9': 'vp9',
  mpeg2video: 'mpeg2video',
  mpeg4: 'mpeg4',
  wmv2: 'wmv2',
}

const expectedVideoContainer: Partial<Record<string, string>> = {
  ogv: 'ogg',
  webm: 'webm',
  wtv: 'wtv',
}

const expectedVideoAudioCodec: Record<string, string> = {
  aac: 'aac',
  libmp3lame: 'mp3',
  libopus: 'opus',
  libvorbis: 'vorbis',
  mp2: 'mp2',
  wmav2: 'wmav2',
}

const expectedAudioCodecByFormat: Record<string, string> = {
  aac: 'aac',
  aiff: 'pcm_s16be',
  flac: 'flac',
  m4a: 'aac',
  m4r: 'aac',
  mp2: 'mp2',
  mp3: 'mp3',
  ogg: 'vorbis',
  wav: 'pcm_s16le',
  wma: 'wmav2',
}

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

const expectStreamDecodesWithoutErrors = (filePath: string, streamType: 'audio' | 'video') =>
  new Promise<void>((resolve, reject) => {
    const streamArgs = streamType === 'video'
      ? ['-map', '0:v:0', '-frames:v', '3', '-f', 'null', nullOutput]
      : ['-map', '0:a:0', '-t', '0.25', '-f', 'null', nullOutput]

    execFile(
      ffmpegPath,
      ['-v', 'error', '-i', filePath, ...streamArgs],
      { windowsHide: true },
      (error, _stdout, stderr) => {
        if (error || stderr.trim()) {
          reject(new Error(`${streamType} decode failed for ${filePath}: ${stderr || error?.message}`))
          return
        }
        resolve()
      },
    )
  })

const expectDecodesWithoutErrors = async (filePath: string, streamTypes: Array<'audio' | 'video'>) => {
  for (const streamType of streamTypes) {
    await expectStreamDecodesWithoutErrors(filePath, streamType)
  }
}

const videoStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'video')
const audioStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'audio')
const fileSize = async (filePath: string) => (await fs.stat(filePath)).size

const tagDuration = (value?: string) => {
  if (!value) return 0
  const match = value.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/)
  if (!match) return Number(value) || 0
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

const duration = (data: ProbeData) => {
  const formatDuration = Number(data.format?.duration || 0)
  if (formatDuration > 0) return formatDuration

  return Math.max(
    0,
    ...(data.streams || []).map((stream) => Number(stream.duration || 0) || tagDuration(stream.tags?.DURATION)),
  )
}

const assertContainer = (format: string, metadata: ProbeData) => {
  const expected = expectedVideoContainer[format]
  if (!expected) return

  expect(metadata.format?.format_name || '', `${format} container`).toContain(expected)
}

const assertPlayableVideoOutput = async (
  format: string,
  outputPath: string,
  plan: VideoConversionPlan,
  options: { width?: number; height?: number; minDuration?: number; requireDuration?: boolean } = {},
) => {
  const metadata = await probe(outputPath)
  const expectedVideo = expectedVideoCodec[plan.videoCodec]
  const expectedAudio = expectedVideoAudioCodec[plan.audioCodec]

  expect(expectedVideo, `${format} has a known video codec expectation`).toBeTruthy()
  expect(expectedAudio, `${format} has a known audio codec expectation`).toBeTruthy()
  expect(videoStream(metadata), `${format} should include a video stream`).toBeTruthy()
  expect(audioStream(metadata), `${format} should include an audio stream`).toBeTruthy()
  expect(videoStream(metadata)?.codec_name, `${format} video codec`).toBe(expectedVideo)
  expect(audioStream(metadata)?.codec_name, `${format} audio codec`).toBe(expectedAudio)

  if (options.width) expect(videoStream(metadata)?.width, `${format} width`).toBe(options.width)
  if (options.height) expect(videoStream(metadata)?.height, `${format} height`).toBe(options.height)
  if (options.requireDuration !== false) {
    expect(duration(metadata), `${format} duration`).toBeGreaterThan(options.minDuration || 0.5)
  }

  assertContainer(format, metadata)
  expect(await fileSize(outputPath), `${format} file size`).toBeGreaterThan(1024)
  await expectDecodesWithoutErrors(outputPath, ['video', 'audio'])
  return metadata
}

const assertAudioOnlyOutput = async (format: string, outputPath: string, minDuration = 1.2) => {
  const metadata = await probe(outputPath)

  expect(videoStream(metadata), `${format} should not include a video stream`).toBeUndefined()
  expect(audioStream(metadata), `${format} should include an audio stream`).toBeTruthy()
  expect(audioStream(metadata)?.codec_name, `${format} audio codec`).toBe(expectedAudioCodecByFormat[format])
  expect(duration(metadata), `${format} duration`).toBeGreaterThan(minDuration)
  expect(await fileSize(outputPath), `${format} file size`).toBeGreaterThan(256)
  await expectDecodesWithoutErrors(outputPath, ['audio'])
}

const runAudioConversionPlan = (inputPath: string, outputPath: string, plan: AudioConversionPlan) =>
  new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo().audioCodec(plan.audioCodec)

    if (plan.audioBitrate) command = command.audioBitrate(plan.audioBitrate)
    if (plan.sampleRate) command = command.audioFrequency(plan.sampleRate)
    if (plan.audioChannels) command = command.audioChannels(plan.audioChannels)
    if (plan.outputOptions.length > 0) command = command.outputOptions(plan.outputOptions)

    command.toFormat(plan.muxer).on('end', resolve).on('error', reject).save(outputPath)
  })

const applyVideoPlan = (
  command: ffmpeg.FfmpegCommand,
  plan: VideoConversionPlan,
  extraOutputOptions: string[] = [],
  options: { skipOutputSize?: boolean } = {},
) => {
  let nextCommand = command.videoCodec(plan.videoCodec).audioCodec(plan.audioCodec)

  if (plan.outputSize && !options.skipOutputSize) nextCommand = nextCommand.size(plan.outputSize)
  if (plan.frameRate) nextCommand = nextCommand.fps(plan.frameRate)
  if (plan.videoBitrate) nextCommand = nextCommand.videoBitrate(`${plan.videoBitrate}k`)
  if (plan.audioBitrate) nextCommand = nextCommand.audioBitrate(`${plan.audioBitrate}k`)
  if (plan.sampleRate) nextCommand = nextCommand.audioFrequency(plan.sampleRate)
  if (plan.audioChannels) nextCommand = nextCommand.audioChannels(plan.audioChannels)

  const outputOptions = [...plan.outputOptions, ...extraOutputOptions]
  if (outputOptions.length > 0) nextCommand = nextCommand.outputOptions(outputOptions)

  return nextCommand.toFormat(plan.muxer)
}

const appendScaleToComplexOutput = (filters: string[], outputSize: string) => {
  const size = outputSize.match(/^(\d+)x(\d+)$/)
  if (!size || filters.length === 0) return filters

  const scaledFilters = [...filters]
  const lastIndex = scaledFilters.length - 1
  if (!/\[out\]\s*$/.test(scaledFilters[lastIndex])) return filters

  scaledFilters[lastIndex] = scaledFilters[lastIndex].replace(/\[out\]\s*$/, '[preout]')
  scaledFilters.push(`[preout]${scaleFilterFromOutputSize(`${size[1]}x${size[2]}`)}[out]`)

  return scaledFilters
}

const scaleFilterFromOutputSize = (outputSize: string) => {
  const size = outputSize.match(/^(\d+)x(\d+)$/)
  return size ? `scale=${size[1]}:${size[2]}:force_original_aspect_ratio=decrease,pad=${size[1]}:${size[2]}:(ow-iw)/2:(oh-ih)/2,setsar=1` : ''
}

const compressionOptionsForPlan = (plan: VideoConversionPlan, modeKey = 'speed') => {
  const crfMap: Record<string, number> = { clarity: 24, quality: 28, speed: 30 }
  const presetMap: Record<string, string> = { clarity: 'slow', quality: 'medium', speed: 'veryfast' }
  const outputOptions: string[] = []

  if (plan.videoCodec === 'libx264') {
    outputOptions.push('-preset', presetMap[modeKey] || 'veryfast', '-crf', String(crfMap[modeKey] || 30))
  } else if (plan.videoCodec === 'libvpx-vp9' || plan.videoCodec === 'libvpx') {
    outputOptions.push('-crf', String(crfMap[modeKey] || 30))
  }

  if (plan.videoBitrate) {
    const bitrate = Number(plan.videoBitrate)
    if (Number.isFinite(bitrate) && bitrate > 0) {
      outputOptions.push('-maxrate', `${bitrate}k`, '-bufsize', `${bitrate * 2}k`)
    }
  }

  return outputOptions
}

const runCompressionLikeModule = (inputPath: string, outputPath: string, format: string) =>
  new Promise<VideoConversionPlan>((resolve, reject) => {
    const plan = createVideoConversionPlan(format, {
      audioBitrate: '48',
      frameRate: '24',
      height: testOutputHeight,
      videoBitrate: '180',
      width: testOutputWidth,
    })

    applyVideoPlan(ffmpeg(inputPath), plan, compressionOptionsForPlan(plan))
      .on('end', () => resolve(plan))
      .on('error', reject)
      .save(outputPath)
  })

const runMergeLikeModule = (inputTsFiles: string[], outputPath: string, format: string) =>
  new Promise<VideoConversionPlan>((resolve, reject) => {
    const plan = createVideoConversionPlan(format)
    const concatList = inputTsFiles.map((filePath) => filePath.replace(/\\/g, '/')).join('|')
    const extraOptions = plan.videoCodec === 'libx264' ? ['-preset', 'veryfast', '-crf', '23'] : []

    applyVideoPlan(ffmpeg().input(`concat:${concatList}`).inputOptions(['-f', 'mpegts']), plan, extraOptions)
      .on('end', () => resolve(plan))
      .on('error', reject)
      .save(outputPath)
  })

const runGifLikeModule = (
  inputPath: string,
  outputPath: string,
  options: { fps?: number; width?: number; startTime?: number; duration?: number; speed?: number },
) =>
  new Promise<void>((resolve, reject) => {
    const { fps = 10, width = 120, startTime, duration: seconds, speed = 1 } = options
    const speedValue = Number.isFinite(Number(speed)) && Number(speed) > 0 ? Number(speed) : 1
    const filters = [
      `scale=${width}:-1:flags=lanczos`,
      `fps=${fps}`,
      ...(Math.abs(speedValue - 1) > 0.001 ? [`setpts=${(1 / speedValue).toFixed(6)}*PTS`] : []),
    ]
    let command = ffmpeg(inputPath)

    if (startTime !== undefined) command = command.setStartTime(startTime)
    if (seconds !== undefined) command = command.setDuration(seconds)

    command
      .outputOptions([`-vf ${filters.join(',')}`])
      .toFormat('gif')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })

const firstExistingFont = async () => {
  const candidates = [
    'C:\\Windows\\Fonts\\simhei.ttf',
    'C:\\Windows\\Fonts\\msyh.ttc',
    'C:\\Windows\\Fonts\\arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ]

  for (const fontPath of candidates) {
    try {
      await fs.access(fontPath)
      return fontPath
    } catch {
      // Try the next common system font.
    }
  }

  return undefined
}

const runAddWatermarkLikeModule = async (
  inputPath: string,
  outputPath: string,
  format: string,
  watermarks: WatermarkSpec[],
  fontFile: string,
) =>
  new Promise<VideoConversionPlan>((resolve, reject) => {
    const plan = createVideoConversionPlan(format, { height: testOutputHeight, width: testOutputWidth })
    const { filters, imagePaths } = buildWatermarkFilters(watermarks, () => fontFile)
    let command = ffmpeg(inputPath)
    let startedCommand = ''
    const stderrLines: string[] = []

    imagePaths.forEach((imagePath) => {
      command = command.input(imagePath)
    })

    const outputFilters = appendScaleToComplexOutput(filters, plan.outputSize)
    command = command.complexFilter(outputFilters).outputOptions(['-map [out]', '-map 0:a?'])

    applyVideoPlan(command, plan, [], { skipOutputSize: outputFilters !== filters })
      .on('start', (cmd: string) => {
        startedCommand = cmd
      })
      .on('stderr', (line: string) => {
        stderrLines.push(line)
      })
      .on('end', () => resolve(plan))
      .on('error', (error) => {
        reject(new Error(`${error.message}\n${stderrLines.slice(-20).join('\n')}\n${startedCommand}\nfilters=${filters.join(';')}`))
      })
      .save(outputPath)
  })

const runRemoveWatermarkLikeModule = (
  inputPath: string,
  outputPath: string,
  format: string,
  mode: 'blur' | 'color',
) =>
  new Promise<VideoConversionPlan>((resolve, reject) => {
    const plan = createVideoConversionPlan(format, { height: testOutputHeight, width: testOutputWidth })
    let command = ffmpeg(inputPath)

    if (mode === 'blur') {
      const outputFilters = appendScaleToComplexOutput(
        ['[0:v]crop=64:32:18:14,boxblur=8:2[blur0];[0:v][blur0]overlay=18:14[out]'],
        plan.outputSize,
      )
      command = command
        .complexFilter(outputFilters)
        .outputOptions(['-map [out]', '-map 0:a?'])
      applyVideoPlan(command, plan, [], { skipOutputSize: outputFilters.length > 1 })
        .on('end', () => resolve(plan))
        .on('error', reject)
        .save(outputPath)
      return
    } else {
      const filters = ['drawbox=x=18:y=14:w=64:h=32:color=0x202020:t=fill']
      const scaleFilter = scaleFilterFromOutputSize(plan.outputSize)
      if (scaleFilter) filters.push(scaleFilter)
      command = command.videoFilters(filters)
      applyVideoPlan(command, plan, [], { skipOutputSize: Boolean(scaleFilter) })
        .on('end', () => resolve(plan))
        .on('error', reject)
        .save(outputPath)
      return
    }
  })

const assertGifOutput = async (outputPath: string, expectedWidth: number, minDuration: number, maxDuration?: number) => {
  const metadata = await probe(outputPath)

  expect(videoStream(metadata)?.codec_name).toBe('gif')
  expect(videoStream(metadata)?.width).toBe(expectedWidth)
  expect(duration(metadata)).toBeGreaterThan(minDuration)
  if (maxDuration) expect(duration(metadata)).toBeLessThan(maxDuration)
  await expectDecodesWithoutErrors(outputPath, ['video'])
}

describe('module fidelity workflows', () => {
  let tempDir = ''
  let sourceA = ''
  let sourceB = ''
  let sourceC = ''
  let audioSource = ''
  let logoPng = ''
  let mergeTsFiles: string[] = []

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
      '1.2',
      '-c:v',
      'libx264',
      '-b:v',
      '1800k',
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
      'smptebars=size=320x180:rate=24',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=660:sample_rate=48000',
      '-t',
      '0.9',
      '-c:v',
      'libx264',
      '-b:v',
      '1200k',
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
      'testsrc=size=320x180:rate=25',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=48000',
      '-t',
      '0.9',
      '-c:v',
      'libvpx',
      '-b:v',
      '900k',
      '-deadline',
      'realtime',
      '-cpu-used',
      '8',
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
      '1.3',
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

    mergeTsFiles = [sourceA, sourceB, sourceC].map((_, index) => path.join(tempDir, `merge-temp-${index}.ts`))
    for (let index = 0; index < mergeTsFiles.length; index++) {
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
        mergeTsFiles[index],
      ])
    }
  }, timeoutMs)

  afterAll(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('video compression module exports every supported video format as playable smaller video', async () => {
    for (const format of videoFormats) {
      const outputPath = path.join(tempDir, `compress-${format}.${format}`)
      const plan = await runCompressionLikeModule(sourceA, outputPath, format)

      await assertPlayableVideoOutput(format, outputPath, plan, {
        height: testOutputHeight,
        minDuration: 0.8,
        width: testOutputWidth,
      })
      expect(await fileSize(outputPath), `${format} should be smaller than source after compression`).toBeLessThan(await fileSize(sourceA))
    }
  }, timeoutMs)

  it('audio conversion module exports every supported audio format as playable audio-only output', async () => {
    const settings: AudioConversionSettings = {
      audioBitrate: '256',
      channels: 'stereo',
      sampleRate: '24000',
    }

    for (const format of audioFormats) {
      const outputPath = path.join(tempDir, `audio-convert.${format}`)
      await runAudioConversionPlan(audioSource, outputPath, createAudioConversionPlan(format, settings))
      await assertAudioOnlyOutput(format, outputPath)
    }
  }, timeoutMs)

  it('video extract audio module exports every supported audio format as playable audio-only output', async () => {
    const settings: AudioConversionSettings = {
      audioBitrate: '192',
      channels: 'stereo',
      sampleRate: '44100',
    }

    for (const [index, format] of audioFormats.entries()) {
      const inputPath = index % 2 === 0 ? sourceA : sourceC
      const outputPath = path.join(tempDir, `extract-audio.${format}`)

      await runAudioConversionPlan(inputPath, outputPath, createAudioConversionPlan(format, settings))
      await assertAudioOnlyOutput(format, outputPath, 0.6)
    }
  }, timeoutMs)

  it('video to GIF module covers full file, cropped clip, multi-clip, and speed outputs', async () => {
    const fullOutput = path.join(tempDir, 'gif-full.gif')
    await runGifLikeModule(sourceA, fullOutput, { fps: 10, width: 120 })
    await assertGifOutput(fullOutput, 120, 0.9, 1.6)

    const clippedOutput = path.join(tempDir, 'gif-clipped.gif')
    await runGifLikeModule(sourceA, clippedOutput, { duration: 0.5, fps: 8, startTime: 0.2, width: 96 })
    await assertGifOutput(clippedOutput, 96, 0.25, 0.8)

    const fastOutput = path.join(tempDir, 'gif-speed-2x.gif')
    await runGifLikeModule(sourceA, fastOutput, { duration: 1, fps: 12, speed: 2, startTime: 0, width: 112 })
    await assertGifOutput(fastOutput, 112, 0.25, 0.8)

    const clipOutputs = [
      { outputPath: path.join(tempDir, 'gif-multi-1.gif'), startTime: 0.1, width: 80 },
      { outputPath: path.join(tempDir, 'gif-multi-2.gif'), startTime: 0.6, width: 88 },
    ]
    for (const clip of clipOutputs) {
      await runGifLikeModule(sourceA, clip.outputPath, { duration: 0.4, fps: 8, startTime: clip.startTime, width: clip.width })
      await assertGifOutput(clip.outputPath, clip.width, 0.2, 0.7)
    }
  }, timeoutMs)

  it('video merge module exports every supported video format as one playable combined video', async () => {
    for (const format of videoFormats) {
      const outputPath = path.join(tempDir, `merge-${format}.${format}`)
      const plan = await runMergeLikeModule(mergeTsFiles, outputPath, format)

      await assertPlayableVideoOutput(format, outputPath, plan, {
        minDuration: 2.4,
      })
    }
  }, timeoutMs)

  it('video watermark add module exports every supported video format with styled text and image watermarks', async () => {
    const fontFile = await firstExistingFont()
    expect(fontFile).toBeTruthy()

    const watermarks: WatermarkSpec[] = [
      {
        actualFontSize: 18,
        actualX: 18,
        actualY: 16,
        bold: true,
        endTime: 1.8,
        fontSize: 18,
        italic: true,
        opacity: 85,
        rotation: 12,
        startTime: 0.1,
        text: "QA: don't fail",
        type: 'text',
        underline: true,
        x: 18,
        y: 16,
      },
      {
        actualX: 24,
        actualY: 20,
        opacity: 70,
        path: logoPng,
        rotation: -10,
        scale: 70,
        type: 'image',
        x: 24,
        y: 20,
      },
    ]

    for (const format of videoFormats) {
      const outputPath = path.join(tempDir, `watermark-add-${format}.${format}`)
      const plan = await runAddWatermarkLikeModule(sourceA, outputPath, format, watermarks, fontFile || '')

      await assertPlayableVideoOutput(format, outputPath, plan, {
        height: testOutputHeight,
        minDuration: 0.8,
        width: testOutputWidth,
      })
    }
  }, timeoutMs)

  it('video watermark remove module exports every supported video format in color-fill mode', async () => {
    for (const format of videoFormats) {
      const outputPath = path.join(tempDir, `watermark-remove-color-${format}.${format}`)
      const plan = await runRemoveWatermarkLikeModule(sourceA, outputPath, format, 'color')

      await assertPlayableVideoOutput(format, outputPath, plan, {
        height: testOutputHeight,
        minDuration: 0.8,
        width: testOutputWidth,
      })
    }
  }, timeoutMs)

  it('video watermark remove module exports every supported video format in blur mode', async () => {
    for (const format of videoFormats) {
      const outputPath = path.join(tempDir, `watermark-remove-blur-${format}.${format}`)
      const plan = await runRemoveWatermarkLikeModule(sourceA, outputPath, format, 'blur')

      await assertPlayableVideoOutput(format, outputPath, plan, {
        height: testOutputHeight,
        minDuration: 0.8,
        width: testOutputWidth,
      })
    }
  }, timeoutMs)
})
