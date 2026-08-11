import { defineStore } from 'pinia'
import { ref } from 'vue'

// 各模块的文件存储
export const useFileStore = defineStore('files', () => {
  // 视频格式转换
  const videoConvertFiles = ref<any[]>([])
  
  // 视频合并
  const videoMergeFiles = ref<any[]>([])
  
  // 视频压缩
  const videoCompressFiles = ref<any[]>([])
  
  // 音频转换
  const audioConvertFiles = ref<any[]>([])
  
  // 视频提取音频
  const videoExtractAudioFiles = ref<any[]>([])
  
  // 视频转GIF
  const videoToGifFiles = ref<any[]>([])
  
  // 视频水印
  const videoWatermarkFiles = ref<any[]>([])

  return {
    videoConvertFiles,
    videoMergeFiles,
    videoCompressFiles,
    audioConvertFiles,
    videoExtractAudioFiles,
    videoToGifFiles,
    videoWatermarkFiles
  }
})
