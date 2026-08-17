export type VideoConversionSettings = {
  videoCodec?: string
  audioCodec?: string
  resolution?: string
  width?: number
  height?: number
  frameRate?: string
  videoBitrate?: string
  audioBitrate?: string
  sampleRate?: string
  channels?: string | number
}

export type VideoConversionPlan = {
  muxer: string
  videoCodec: string
  audioCodec: string
  outputSize: string
  frameRate?: number
  videoBitrate?: string
  audioBitrate?: string
  sampleRate?: number
  audioChannels?: number
  outputOptions: string[]
}

type StrictProfile = {
  muxer: string
  videoCodec: string
  audioCodec: string
  sampleRate?: number
  audioChannels?: number
  maxFrameRate?: number
  maxVideoBitrate?: number
  maxAudioBitrate?: number
  outputOptions?: string[]
}

const muxerMap: Record<string, string> = {
  wmv: 'asf',
  asf: 'asf',
  f4v: 'f4v',
  swf: 'swf',
  ogv: 'ogg',
  mpg: 'mpeg',
  ts: 'mpegts',
  m2ts: 'mpegts',
  mts: 'mpegts',
  m2t: 'mpegts',
  mkv: 'matroska',
  m4v: 'mp4',
}

const uiVideoCodecMap: Record<string, string> = {
  h264: 'libx264',
  h265: 'libx265',
  vp9: 'libvpx-vp9',
}

const uiAudioCodecMap: Record<string, string> = {
  aac: 'aac',
  mp3: 'libmp3lame',
}

const yuv420p = ['-pix_fmt', 'yuv420p']

const strictProfiles: Record<string, StrictProfile> = {
  avi: { muxer: 'avi', videoCodec: 'mpeg4', audioCodec: 'libmp3lame', maxFrameRate: 30, outputOptions: yuv420p },
  wmv: { muxer: 'asf', videoCodec: 'wmv2', audioCodec: 'wmav2', maxFrameRate: 30 },
  asf: { muxer: 'asf', videoCodec: 'wmv2', audioCodec: 'wmav2', maxFrameRate: 30 },
  flv: { muxer: 'flv', videoCodec: 'libx264', audioCodec: 'aac', sampleRate: 44100, audioChannels: 2, maxFrameRate: 30, outputOptions: [...yuv420p, '-flvflags', 'add_keyframe_index'] },
  f4v: { muxer: 'f4v', videoCodec: 'libx264', audioCodec: 'aac', sampleRate: 44100, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  swf: { muxer: 'swf', videoCodec: 'flv', audioCodec: 'libmp3lame', sampleRate: 44100, audioChannels: 2, maxFrameRate: 30, maxVideoBitrate: 1200, maxAudioBitrate: 128, outputOptions: yuv420p },
  mp4: { muxer: 'mp4', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: [...yuv420p, '-movflags', '+faststart'] },
  m4v: { muxer: 'mp4', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: [...yuv420p, '-movflags', '+faststart'] },
  mkv: { muxer: 'matroska', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  mov: { muxer: 'mov', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  webm: { muxer: 'webm', videoCodec: 'libvpx-vp9', audioCodec: 'libopus', sampleRate: 48000, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  '3gp': { muxer: '3gp', videoCodec: 'libx264', audioCodec: 'aac', sampleRate: 44100, audioChannels: 2, maxFrameRate: 30, outputOptions: [...yuv420p, '-profile:v', 'baseline'] },
  vob: { muxer: 'vob', videoCodec: 'mpeg2video', audioCodec: 'mp2', sampleRate: 48000, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  mpg: { muxer: 'mpeg', videoCodec: 'mpeg2video', audioCodec: 'mp2', sampleRate: 48000, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  mpeg: { muxer: 'mpeg', videoCodec: 'mpeg2video', audioCodec: 'mp2', sampleRate: 48000, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  ts: { muxer: 'mpegts', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  m2ts: { muxer: 'mpegts', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  mts: { muxer: 'mpegts', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  m2t: { muxer: 'mpegts', videoCodec: 'libx264', audioCodec: 'aac', outputOptions: yuv420p },
  wtv: { muxer: 'wtv', videoCodec: 'mpeg2video', audioCodec: 'mp2', sampleRate: 48000, audioChannels: 2, maxFrameRate: 30, outputOptions: yuv420p },
  ogv: { muxer: 'ogg', videoCodec: 'libvpx', audioCodec: 'libvorbis', sampleRate: 44100, audioChannels: 2, maxFrameRate: 30, maxVideoBitrate: 1600, maxAudioBitrate: 128, outputOptions: yuv420p },
}

export const outputExtensionFromPath = (outputPath: string, fallbackFormat = 'mp4') => {
  const match = /\.([^.\\/]+)$/.exec(outputPath)
  return (match?.[1] || fallbackFormat).toLowerCase()
}

export const outputFormatFromExtension = (format: string) => {
  const normalized = format.toLowerCase()
  return muxerMap[normalized] || normalized
}

export const outputFormatFromPath = (outputPath: string, fallbackFormat = 'mp4') =>
  outputFormatFromExtension(outputExtensionFromPath(outputPath, fallbackFormat))

export const outputSizeFromSettings = (settings?: Pick<VideoConversionSettings, 'resolution' | 'width' | 'height'>) => {
  if (settings?.width && settings?.height) {
    return `${settings.width}x${settings.height}`
  }

  const resolution = String(settings?.resolution || '')
  if (resolution && resolution !== 'auto' && !resolution.startsWith('custom')) {
    return resolution
  }

  return ''
}

const selectedVideoCodec = (codec?: string) => {
  if (!codec || codec === 'auto') return 'libx264'
  return uiVideoCodecMap[codec] || codec
}

const selectedAudioCodec = (codec?: string) => {
  if (!codec || codec === 'auto') return 'aac'
  return uiAudioCodecMap[codec] || codec
}

const selectedBitrate = (bitrate?: string, maxBitrate?: number) => {
  if (!bitrate || bitrate === 'auto') return undefined
  const numeric = Number(bitrate)
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return String(Math.round(maxBitrate ? Math.min(numeric, maxBitrate) : numeric))
}

const selectedSampleRate = (sampleRate?: string) => {
  if (!sampleRate || sampleRate === 'auto') return undefined
  const numeric = Number(sampleRate)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined
}

const selectedChannels = (channels?: string | number) => {
  if (channels === undefined || channels === null || channels === '' || channels === 'auto') return undefined
  if (channels === 'mono') return 1
  if (channels === 'stereo') return 2

  const numeric = Number(channels)
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined
}

const selectedFrameRate = (frameRate?: string, maxFrameRate?: number) => {
  if (!frameRate || frameRate === 'auto') return undefined
  const numeric = Number(frameRate)
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined
  return maxFrameRate ? Math.min(numeric, maxFrameRate) : numeric
}

export const createVideoConversionPlan = (format: string, settings: VideoConversionSettings = {}): VideoConversionPlan => {
  const normalized = format.toLowerCase()
  const profile = strictProfiles[normalized]
  const muxer = profile?.muxer || outputFormatFromExtension(normalized)

  return {
    muxer,
    videoCodec: profile?.videoCodec || selectedVideoCodec(settings.videoCodec),
    audioCodec: profile?.audioCodec || selectedAudioCodec(settings.audioCodec),
    outputSize: outputSizeFromSettings(settings),
    frameRate: selectedFrameRate(settings.frameRate, profile?.maxFrameRate),
    videoBitrate: selectedBitrate(settings.videoBitrate, profile?.maxVideoBitrate),
    audioBitrate: selectedBitrate(settings.audioBitrate, profile?.maxAudioBitrate),
    sampleRate: profile?.sampleRate || selectedSampleRate(settings.sampleRate),
    audioChannels: profile?.audioChannels || selectedChannels(settings.channels),
    outputOptions: [...(profile?.outputOptions || [])],
  }
}
