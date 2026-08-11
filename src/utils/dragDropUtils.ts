/**
 * 拖拽上传工具函数
 */
import i18n from '@/i18n'
import { platformService } from '@/services/platformService'

const { t } = i18n.global as any

/**
 * 处理拖拽事件，支持文件和文件夹
 * @param e 拖拽事件
 * @param extensions 支持的文件扩展名数组
 * @returns Promise<string[]> 扫描到的文件路径数组
 */
export async function handleDragDropEvent(e: DragEvent, extensions: string[]): Promise<string[]> {
  const items = Array.from(e.dataTransfer?.items || [])
  if (!items.length) return []
  
  if (platformService.isElectron) {
    try {
      const electron = (window as any).require('electron')
      const { ipcRenderer, webUtils } = electron
      const paths: string[] = []
      
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            const file = item.getAsFile()
            if (file) {
              const filePath = webUtils.getPathForFile(file)
              if (filePath) paths.push(filePath)
            }
          }
        }
      }
      
      if (paths.length) {
        const mediaFiles = await ipcRenderer.invoke('scan-dropped-paths', paths, extensions)
        return mediaFiles || []
      }
    } catch (error) {
      console.error('Electron drag-drop failed:', error)
    }
  } else {
    // Web 端处理：返回 File 对象数组，后续由各组件自行处理上传
    const files = Array.from(e.dataTransfer?.files || [])
    return files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      return extensions.includes(ext)
    }) as any[]
  }
  
  return []
}

/**
 * 视频文件扩展名
 */
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'wmv', 'flv', 'mkv', 'mov', 'webm', '3gp', 'ts', 'm2ts', 'mts', 'm2t', 'm4v', 'f4v', 'swf', 'ogv', 'asf', 'vob', 'mpg', 'mpeg', 'wtv']

/**
 * 音频文件扩展名
 */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'aiff']

/**
 * 所有媒体文件扩展名
 */
export const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]