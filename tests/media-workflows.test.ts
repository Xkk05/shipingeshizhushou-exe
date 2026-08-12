// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

import { createVideoConversionPlan, type VideoConversionPlan, type VideoConversionSettings } from '../electron/videoConversionProfiles'

type ProbeStream = {
  index?: number
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
const timeoutMs = 240_000

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

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

const probe = (filePath: string) =>
  new Promise<ProbeData>((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe failed: ${stderr || error.message}`))
          return
        }
        resolve(JSON.parse(stdout) as ProbeData)
      },
    )
  })

const videoStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'video')
const audioStream = (data: ProbeData) => data.streams?.find((stream) => stream.codec_type === 'audio')
const duration = (data: ProbeData) => Number(data.format?.duration || 0)
const fileSize = async (filePath: string) => (await fs.stat(filePath)).size

const staleAdvancedSettings: VideoConversionSettings = {
  videoCodec: 'mpeg4',
  audioCodec: 'ac3',
  frameRate: '120',
  videoBitrate: '1600',
  audioBitrate: '192',
  sampleRate: '22050',
  width: 1500,
  height: 500,
}

const reportedOgvSwfSettings: VideoConversionSettings = {
  ...staleAdvancedSettings,
  videoBitrate: '2400',
  audioBitrate: '256',
  sampleRate: '24000',
  width: 1600,
  height: 500,
}

const runVideoConversionPlan = (inputPath: string, outputPath: string, plan: VideoConversionPlan) =>
  new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath).videoCodec(plan.videoCodec).audioCodec(plan.audioCodec)

    if (plan.outputSize) command = command.size(plan.outputSize)
    if (plan.frameRate) command = command.fps(plan.frameRate)
    if (plan.videoBitrate) command = command.videoBitrate(`${plan.videoBitrate}k`)
    if (plan.audioBitrate) command = command.audioBitrate(`${plan.audioBitrate}k`)
    if (plan.sampleRate) command = command.audioFrequency(plan.sampleRate)
    if (plan.audioChannels) command = command.audioChannels(plan.audioChannels)
    if (plan.outputOptions.length > 0) command = command.outputOptions(plan.outputOptions)

    command.toFormat(plan.muxer).on('end', resolve).on('error', reject).save(outputPath)
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
      return fontPath.replace(/\\/g, '/').replace(/:/g, '\\:')
    } catch {
      // Try the next common Windows font.
    }
  }

  return undefined
}

describe('real media conversion workflows', () => {
  let tempDir = ''
  let inputVideo = ''
  let secondVideo = ''
  let userLikeVerticalVideo = ''

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kunqiu-media-workflows-'))
    inputVideo = path.join(tempDir, 'source.mp4')
    secondVideo = path.join(tempDir, 'source-b.mp4')
    userLikeVerticalVideo = path.join(tempDir, 'user-like-vertical.mp4')

    await runFfmpeg([
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
      'libx264',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      inputVideo,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=160x90:rate=24',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=660:sample_rate=44100',
      '-t',
      '1.5',
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      secondVideo,
    ])

    await runFfmpeg([
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=720x1280:rate=30',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=44100',
      '-t',
      '12',
      '-c:v',
      'libx264',
      '-crf',
      '24',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      userLikeVerticalVideo,
    ])
  }, timeoutMs)

  afterAll(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('converts video to MKV with playable video and audio streams', async () => {
    const outputPath = path.join(tempDir, 'converted.mkv')

    await runFfmpeg(['-i', inputVideo, '-c:v', 'libx264', '-c:a', 'aac', '-f', 'matroska', outputPath])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.codec_name).toBe('h264')
    expect(audioStream(metadata)?.codec_name).toBe('aac')
    expect(metadata.format?.format_name).toContain('matroska')
  }, timeoutMs)

  it('keeps legacy and web output formats playable when stale advanced codecs are incompatible', async () => {
    const expectedCodecs: Record<string, { video: string; audio: string }> = {
      flv: { video: 'h264', audio: 'aac' },
      mkv: { video: 'h264', audio: 'aac' },
      mov: { video: 'h264', audio: 'aac' },
      webm: { video: 'vp9', audio: 'opus' },
      '3gp': { video: 'h264', audio: 'aac' },
      f4v: { video: 'h264', audio: 'aac' },
      swf: { video: 'h264', audio: 'aac' },
      ogv: { video: 'theora', audio: 'vorbis' },
      vob: { video: 'mpeg2video', audio: 'mp2' },
      mpg: { video: 'mpeg2video', audio: 'mp2' },
      mpeg: { video: 'mpeg2video', audio: 'mp2' },
    }

    for (const [format, expected] of Object.entries(expectedCodecs)) {
      const outputPath = path.join(tempDir, `stale-settings.${format}`)
      const plan = createVideoConversionPlan(format, staleAdvancedSettings)

      await runVideoConversionPlan(inputVideo, outputPath, plan)

      const metadata = await probe(outputPath)
      expect(videoStream(metadata)?.codec_name, `${format} should keep a video stream`).toBe(expected.video)
      expect(audioStream(metadata)?.codec_name, `${format} should keep an audio stream`).toBe(expected.audio)
      expect(videoStream(metadata)?.width, `${format} should apply the requested width`).toBe(1500)
      expect(videoStream(metadata)?.height, `${format} should apply the requested height`).toBe(500)
    }
  }, timeoutMs)

  it('exports user-reported OGV and SWF cases with visible video streams', async () => {
    const ogvOutputPath = path.join(tempDir, 'reported-case.ogv')
    const swfOutputPath = path.join(tempDir, 'reported-case.swf')

    await runVideoConversionPlan(userLikeVerticalVideo, ogvOutputPath, createVideoConversionPlan('ogv', reportedOgvSwfSettings))
    await runVideoConversionPlan(userLikeVerticalVideo, swfOutputPath, createVideoConversionPlan('swf', reportedOgvSwfSettings))

    const ogvMetadata = await probe(ogvOutputPath)
    expect(ogvMetadata.format?.format_name).toContain('ogg')
    expect(videoStream(ogvMetadata)?.codec_name).toBe('theora')
    expect(audioStream(ogvMetadata)?.codec_name).toBe('vorbis')
    expect(videoStream(ogvMetadata)?.width).toBe(1600)
    expect(videoStream(ogvMetadata)?.height).toBe(500)
    expect(duration(ogvMetadata)).toBeGreaterThan(11)

    const swfMetadata = await probe(swfOutputPath)
    expect(swfMetadata.format?.format_name).toContain('flv')
    expect(swfMetadata.streams?.[0]?.codec_type).toBe('video')
    expect(videoStream(swfMetadata)?.codec_name).toBe('h264')
    expect(audioStream(swfMetadata)?.codec_name).toBe('aac')
    expect(videoStream(swfMetadata)?.width).toBe(1600)
    expect(videoStream(swfMetadata)?.height).toBe(500)
    expect(duration(swfMetadata)).toBeGreaterThan(11)
  }, timeoutMs)

  it('compresses video to a smaller, downsized MP4', async () => {
    const outputPath = path.join(tempDir, 'compressed.mp4')

    await runFfmpeg([
      '-i',
      inputVideo,
      '-c:v',
      'libx264',
      '-b:v',
      '180k',
      '-maxrate',
      '180k',
      '-bufsize',
      '360k',
      '-preset',
      'veryfast',
      '-crf',
      '30',
      '-vf',
      'scale=80:44',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      '-movflags',
      '+faststart',
      '-f',
      'mp4',
      outputPath,
    ])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.width).toBe(80)
    expect(videoStream(metadata)?.height).toBe(44)
    expect(await fileSize(outputPath)).toBeLessThan(await fileSize(inputVideo))
  }, timeoutMs)

  it('compresses video to WebM with VP9 and Opus streams', async () => {
    const outputPath = path.join(tempDir, 'compressed.webm')

    await runFfmpeg([
      '-i',
      inputVideo,
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '180k',
      '-crf',
      '34',
      '-vf',
      'scale=80:44',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      '64k',
      '-f',
      'webm',
      outputPath,
    ])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.codec_name).toBe('vp9')
    expect(audioStream(metadata)?.codec_name).toBe('opus')
    expect(metadata.format?.format_name).toContain('webm')
  }, timeoutMs)

  it('extracts FLAC audio from video with the correct codec', async () => {
    const outputPath = path.join(tempDir, 'extracted.flac')

    await runFfmpeg(['-i', inputVideo, '-vn', '-c:a', 'flac', '-f', 'flac', outputPath])

    const metadata = await probe(outputPath)
    expect(audioStream(metadata)?.codec_name).toBe('flac')
    expect(videoStream(metadata)).toBeUndefined()
  }, timeoutMs)

  it('converts audio to MP3 with selected bitrate and sample rate', async () => {
    const outputPath = path.join(tempDir, 'audio.mp3')

    await runFfmpeg(['-i', inputVideo, '-vn', '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '44100', '-f', 'mp3', outputPath])

    const metadata = await probe(outputPath)
    expect(audioStream(metadata)?.codec_name).toBe('mp3')
    expect(audioStream(metadata)?.sample_rate).toBe('44100')
  }, timeoutMs)

  it('exports a GIF clip with the requested width and approximate duration', async () => {
    const outputPath = path.join(tempDir, 'clip.gif')

    await runFfmpeg(['-ss', '0.25', '-t', '0.8', '-i', inputVideo, '-vf', 'scale=120:-1:flags=lanczos,fps=8', '-f', 'gif', outputPath])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.width).toBe(120)
    expect(duration(metadata)).toBeGreaterThan(0.5)
    expect(duration(metadata)).toBeLessThan(1.2)
  }, timeoutMs)

  it('merges videos into one playable output with combined duration', async () => {
    const listPath = path.join(tempDir, 'concat.txt')
    const outputPath = path.join(tempDir, 'merged.mp4')
    const list = [inputVideo, secondVideo]
      .map((filePath) => `file '${filePath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      .join('\n')

    await fs.writeFile(listPath, list, 'utf8')
    await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.codec_name).toBe('h264')
    expect(audioStream(metadata)?.codec_name).toBe('aac')
    expect(duration(metadata)).toBeGreaterThan(3.2)
  }, timeoutMs)

  it('adds a text watermark while preserving the selected output resolution', async () => {
    const outputPath = path.join(tempDir, 'watermarked.mp4')
    const fontFile = await firstExistingFont()

    expect(fontFile).toBeTruthy()

    await runFfmpeg([
      '-i',
      inputVideo,
      '-vf',
      `drawtext=text='测试':fontfile='${fontFile}':fontsize=18:fontcolor=white@0.9:x=12:y=10,scale=96:54`,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'copy',
      '-f',
      'mp4',
      outputPath,
    ])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.width).toBe(96)
    expect(videoStream(metadata)?.height).toBe(54)
    expect(audioStream(metadata)?.codec_name).toBe('aac')
  }, timeoutMs)

  it('removes a watermark area by filling the selected rectangle', async () => {
    const outputPath = path.join(tempDir, 'watermark-removed.mp4')

    await runFfmpeg([
      '-i',
      inputVideo,
      '-vf',
      'drawbox=x=8:y=8:w=40:h=20:color=0x222222:t=fill,scale=96:54',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-f',
      'mp4',
      outputPath,
    ])

    const metadata = await probe(outputPath)
    expect(videoStream(metadata)?.width).toBe(96)
    expect(videoStream(metadata)?.height).toBe(54)
    expect(audioStream(metadata)?.codec_name).toBe('aac')
  }, timeoutMs)
})
