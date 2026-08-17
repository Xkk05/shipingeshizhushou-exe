const audioOutputFormats = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'm4r', 'mp2', 'aac', 'wma', 'aiff'])

const conversionChannelMap: Record<string, string> = {
  'compress-video': 'compress-video',
  'audio-convert': 'convert-audio',
  'extract-audio': 'extract-audio',
  'video-to-gif': 'video-to-gif',
  merge: 'merge-videos',
}

export const isAudioOutputFormat = (format?: string) =>
  Boolean(format && audioOutputFormats.has(String(format).toLowerCase()))

export const resolveElectronConversionChannel = (options: { type?: string; format?: string } = {}) =>
  conversionChannelMap[options.type || ''] || (isAudioOutputFormat(options.format) ? 'convert-audio' : 'convert-video')
