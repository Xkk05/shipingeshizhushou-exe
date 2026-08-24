/**
 * 拖拽上传工具函数
 */
import i18n from '@/i18n'
import { platformService } from '@/services/platformService'
import { VIDEO_INPUT_EXTENSIONS } from '@/utils/mediaFormats'

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
export const VIDEO_EXTENSIONS = [...VIDEO_INPUT_EXTENSIONS]

/**
 * 音频文件扩展名
 */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'm4r', 'mp2', 'wma', 'aiff']

/**
 * 所有媒体文件扩展名
 */
export const MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]
