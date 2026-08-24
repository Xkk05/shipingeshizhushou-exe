export type FormatScope = 'all' | 'video' | 'audio'

export const VIDEO_FORMATS = [
  'MP4',
  'AVI',
  'WMV',
  'FLV',
  'MKV',
  'MOV',
  'WEBM',
  '3GP',
  'F4V',
  'OGV',
  'ASF',
  'VOB',
  'MPG',
  'MPEG',
  'WTV',
  'TS',
  'M2TS',
  'MTS',
  'M2T',
  'M4V',
] as const

export const AUDIO_FORMATS = ['MP3', 'WAV', 'OGG', 'FLAC', 'M4A', 'M4R', 'MP2', 'AAC', 'WMA', 'AIFF'] as const

export const VIDEO_INPUT_EXTENSIONS = [
  'mp4',
  'avi',
  'wmv',
  'flv',
  'mkv',
  'mov',
  'webm',
  '3gp',
  'ts',
  'm2ts',
  'mts',
  'm2t',
  'm4v',
  'f4v',
  'swf',
  'ogv',
  'asf',
  'vob',
  'mpg',
  'mpeg',
  'wtv',
] as const

export const DEFAULT_VIDEO_FORMAT = 'MP4'
export const DEFAULT_AUDIO_FORMAT = 'MP3'

export const normalizeMediaFormat = (format?: string) => String(format || '').trim().toUpperCase()

export const extensionFromFileName = (fileName?: string) => {
  const base = String(fileName || '').split(/[\\/]/).pop() || ''
  const dotIndex = base.lastIndexOf('.')
  return dotIndex >= 0 ? base.slice(dotIndex + 1).toLowerCase() : ''
}

export const isVideoFormat = (format?: string) => VIDEO_FORMATS.includes(normalizeMediaFormat(format) as any)

export const isAudioFormat = (format?: string) => AUDIO_FORMATS.includes(normalizeMediaFormat(format) as any)

export const isVideoFileName = (fileName?: string) =>
  VIDEO_INPUT_EXTENSIONS.includes(extensionFromFileName(fileName) as any)

export const defaultFormatForScope = (scope: FormatScope) => (scope === 'audio' ? DEFAULT_AUDIO_FORMAT : DEFAULT_VIDEO_FORMAT)

export const coerceFormatForScope = (format: string | undefined, scope: FormatScope) => {
  const normalized = normalizeMediaFormat(format)

  if (scope === 'video') return isVideoFormat(normalized) ? normalized : DEFAULT_VIDEO_FORMAT
  if (scope === 'audio') return isAudioFormat(normalized) ? normalized : DEFAULT_AUDIO_FORMAT

  return isVideoFormat(normalized) || isAudioFormat(normalized) ? normalized : DEFAULT_VIDEO_FORMAT
}
