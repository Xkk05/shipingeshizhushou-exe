<template>
  <div class="module-page" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <TopToolbar :show-url-download="true" @add-files="addFiles" @add-folder="addFolder" @add-device="showQRUpload = true" @add-url="showURLDialog = true" @clear="clearFiles" />
    
    <div class="content-area">
      <FileDropZone v-if="!files.length" @files-selected="onFilesFromDropZone" />
      <div v-else class="file-list-wrapper">
        <div class="file-list">
          <FileListItem v-for="file in files" :key="file.id" :file="file" :action-text="$t('common.compress')"
            @settings="openSettings()" @convert="compressFile(file)" @delete="deleteFile(file)" />
        </div>
        <div v-if="isDragging" class="drag-overlay">
          <div class="drag-hint">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#36d1c4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <p>{{ $t('common.dropFilesToAdd') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="options-row">
        <div class="option-item">
          <span class="label">{{ $t('common.compressMode') }}</span>
          <el-radio-group v-model="compressMode" class="compress-mode">
            <el-radio value="speed">{{ $t('common.speedPriority') }}</el-radio>
            <el-radio value="clarity">{{ $t('common.clarityPriority') }}</el-radio>
            <el-radio value="quality">{{ $t('common.qualityPriority') }}</el-radio>
          </el-radio-group>
        </div>
        <div class="batch-settings" @click="showBatchSettings = true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#36d1c4"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <span>{{ $t('common.batchSettings') }}</span>
        </div>
        <div class="action-area">
          <el-button type="primary" class="action-btn" @click="compressAll">{{ $t('common.compressAll') }}</el-button>
        </div>
      </div>
      <div v-if="platformService.isElectron" class="path-row">
        <div class="output-path">
          <span class="label">{{ $t('common.outputPath') }}</span>
          <el-select v-model="outputPathType" class="path-select" @change="handlePathTypeChange">
            <el-option :label="$t('common.videoConverterFolder')" value="default" />
            <el-option :label="$t('common.sameAsSource')" value="source" />
            <el-option :label="$t('common.customFolder')" value="custom" />
          </el-select>
          <el-button class="folder-btn" @click="selectOutputDir">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#36d1c4"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          </el-button>
        </div>
      </div>
    </div>

    <SettingsDialog v-model="showSettings" type="video" @confirm="handleSettingsConfirm" />
    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />
    
    <el-dialog v-model="showBatchSettings" :title="$t('common.batchSettings')" width="500px" :close-on-click-modal="false" class="batch-dialog">
      <div class="batch-form">
        <div class="form-item"><label>{{ $t('common.resolution') }}</label>
          <el-select v-model="batchSettings.resolution" style="width: 200px">
            <el-option :label="$t('common.keepOriginal')" value="auto" /><el-option label="1920x1080" value="1920x1080" />
            <el-option label="1280x720" value="1280x720" /><el-option label="854x480" value="854x480" /><el-option label="640x360" value="640x360" />
          </el-select>
        </div>
        <div class="form-item"><label>{{ $t('common.videoBitrate') }}</label>
          <el-select v-model="batchSettings.videoBitrate" style="width: 200px">
            <el-option :label="$t('common.auto')" value="auto" /><el-option label="5000kbps" value="5000" /><el-option label="2400kbps" value="2400" />
            <el-option label="1600kbps" value="1600" /><el-option label="1200kbps" value="1200" /><el-option label="1024kbps" value="1024" />
            <el-option label="768kbps" value="768" /><el-option label="512kbps" value="512" />
          </el-select>
        </div>
        <div class="form-item"><label>{{ $t('common.frameRate') }}</label>
          <el-select v-model="batchSettings.frameRate" style="width: 200px">
            <el-option :label="$t('common.keepOriginal')" value="auto" /><el-option label="60fps" value="60" /><el-option label="30fps" value="30" />
            <el-option label="25fps" value="25" /><el-option label="24fps" value="24" />
          </el-select>
        </div>
        <div class="form-item"><label>{{ $t('common.audioBitrate') }}</label>
          <el-select v-model="batchSettings.audioBitrate" style="width: 200px">
            <el-option :label="$t('common.auto')" value="auto" /><el-option label="320kbps" value="320" /><el-option label="192kbps" value="192" />
            <el-option label="128kbps" value="128" /><el-option label="96kbps" value="96" /><el-option label="64kbps" value="64" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBatchSettings = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="applyBatchSettings">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import { handleDragDropEvent, VIDEO_EXTENSIONS } from '@/utils/dragDropUtils'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import FileListItem from '@/components/FileListItem.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { platformService } from '@/services/platformService'
import { getWebVideoMeta } from '@/utils/webMediaMeta'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const fileStore = useFileStore()
const { videoCompressFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const compressMode = ref('quality')
const showSettings = ref(false)
const showBatchSettings = ref(false)
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const outputDir = ref('')
const outputPathType = ref('default')
const isDragging = ref(false)
const isProcessingDrop = ref(false)

const batchSettings = ref({ resolution: 'auto', videoBitrate: 'auto', frameRate: 'auto', audioBitrate: 'auto' })
const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', '3gp', 'ts', 'm2ts']

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  platformService.onConvertProgress((data: { id: string; percent: number }) => {
    const file = files.value.find(f => f.id === data.id)
    if (file && file.status === 'converting') {
      file.progress = Math.round(data.percent)
    }
  }, 'compress-progress')
})

onUnmounted(() => { platformService.removeConvertProgressListeners('compress-progress') })

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 拖拽事件
const onDragOver = (e: DragEvent) => { 
  e.preventDefault()
  if (files.value.length) isDragging.value = true 
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    isDragging.value = false
  }
}

const onDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
  
  // 如果文件列表为空，让 FileDropZone 处理
  if (!files.value.length) return
  
  try {
    const mediaFiles = await handleDragDropEvent(e, VIDEO_EXTENSIONS)
    if (mediaFiles.length) {
      addFilesToList(mediaFiles)
    }
  } catch (error) {
    console.error(t('error.dragDropFailed'), error)
  }
}

const onFilesFromDropZone = (filePaths: string[]) => {
  addFilesToList(filePaths)
}

const addFiles = async () => {
  const selectedFiles = await platformService.selectFiles([{ name: t('common.videoFiles'), extensions: videoExtensions }])
  if (selectedFiles?.length) addFilesToList(selectedFiles)
}

const addFolder = async () => {
  const selectedFiles = await platformService.selectFolder(videoExtensions)
  if (selectedFiles?.length) addFilesToList(selectedFiles)
}

const addFilesToList = async (selectedFiles: any[]) => {
  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i]
    let filePath = '', fileName = '', fileId = ''
    let browserFile: File | null = null
    if (typeof f === 'string') {
      filePath = f
      fileName = platformService.basename(f)
      fileId = `${Date.now()}-${i}`
    } else {
      filePath = f.path || ''
      fileName = f.name || ''
      fileId = f.id || `${Date.now()}-${i}`
      browserFile = f.file instanceof File ? f.file : (f instanceof File ? f : null)
    }
    if (!filePath && !fileId) continue
    if (files.value.some(file => file.path === filePath || file.id === fileId)) continue

    let videoInfo: any = {}, thumbnail = ''
    if (!platformService.isElectron && browserFile) {
      const webMeta = await getWebVideoMeta(browserFile)
      videoInfo = {
        duration: webMeta.duration,
        size: browserFile.size,
      }
      thumbnail = webMeta.thumbnail
    } else {
      try { videoInfo = await platformService.getVideoInfo(filePath) } catch (e) {}
      try { thumbnail = await platformService.getVideoThumbnail(filePath) } catch (e) {}
    }

    files.value.push({
      id: fileId, name: fileName, path: filePath,
      format: platformService.extname(fileName).slice(1),
      outputName: fileName?.replace(/\.[^.]+$/, `_compress.mp4`),
      outputFormat: 'mp4',
      resolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
      outputResolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
      duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00',
      size: videoInfo.size, estimatedSize: videoInfo.size ? Math.round(videoInfo.size * 0.7) : 0,
      bitrate: videoInfo.bitrate ? `${Math.round(videoInfo.bitrate / 1000)}kbps` : '',
      thumbnail, status: 'pending', progress: 0
    })
  }
}

const handleFilesSelected = addFilesToList

const clearFiles = () => { files.value = [] }
const deleteFile = (file: any) => { files.value = files.value.filter(f => f.id !== file.id) }
const openSettings = () => { showSettings.value = true }

const handleSettingsConfirm = (data: { format: string; settings: any }) => {
  // 更新文件格式并重置已完成文件的状态，允许重新压缩
  files.value.forEach(f => {
    f.outputFormat = data.format.toLowerCase()
    f.outputName = f.name.replace(/\.[^.]+$/, `_compress.${data.format.toLowerCase()}`)
    if (f.status === 'completed' || f.status === 'error') {
      f.status = 'pending'
      f.progress = 0
    }
  })
}

const applyBatchSettings = () => {
  // 应用批量设置并重置已完成文件的状态
  files.value.forEach(f => {
    if (batchSettings.value.resolution !== 'auto') f.outputResolution = batchSettings.value.resolution
    if (f.status === 'completed' || f.status === 'error') {
      f.status = 'pending'
      f.progress = 0
    }
  })
  showBatchSettings.value = false
}

const handlePathTypeChange = (type: string) => { if (type === 'custom') selectOutputDir() }
const selectOutputDir = async () => {
  const dir = await platformService.selectOutputDir()
  if (dir) { outputDir.value = dir; outputPathType.value = 'custom' }
}

const getOutputPath = (file: any) => {
  if (!platformService.isElectron) return file.outputName
  return outputPathType.value === 'source' ? platformService.join(platformService.dirname(file.path), file.outputName) : platformService.join(outputDir.value, file.outputName)
}

const compressFile = async (file: any, showDialog = true) => {
  await checkAuthAndExecute(async () => {
    if (file.status === 'converting') return
    file.status = 'converting'; file.progress = 0
    try {
      await platformService.convertVideo({
        id: file.id, inputPath: file.path, outputPath: getOutputPath(file), mode: compressMode.value,
        resolution: batchSettings.value.resolution, videoBitrate: batchSettings.value.videoBitrate,
        frameRate: batchSettings.value.frameRate, audioBitrate: batchSettings.value.audioBitrate,
        type: 'compress-video'
      })
      file.status = 'completed'; file.progress = 100
    } catch (err) { file.status = 'error'; console.error('压缩失败:', err) }
  })
}

const compressAll = async () => {
  await checkAuthAndExecute(async () => {
    const pendingFiles = files.value.filter(f => f.status === 'pending' || f.status === 'error')
    let completedCount = 0
    for (const file of pendingFiles) { 
      if (file.status === 'converting') continue
      file.status = 'converting'; file.progress = 0
      try {
        await platformService.convertVideo({
          id: file.id, inputPath: file.path, outputPath: getOutputPath(file), mode: compressMode.value,
          resolution: batchSettings.value.resolution, videoBitrate: batchSettings.value.videoBitrate,
          frameRate: batchSettings.value.frameRate, audioBitrate: batchSettings.value.audioBitrate,
          type: 'compress-video'
        })
        file.status = 'completed'; file.progress = 100
        completedCount++
      } catch (err) { 
        file.status = 'error'; 
        console.error('压缩失败:', err) 
      }
    }
  })
}

const handleFilesUploaded = (filePaths: string[]) => { handleFilesSelected(filePaths); showQRUpload.value = false }
const handleURLDownloaded = (filePath: string) => { handleFilesSelected([filePath]) }
</script>

<style lang="scss" scoped>
.module-page { height: 100%; display: flex; flex-direction: column; background: #f8f9fa; }
.content-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list { flex: 1; overflow-y: auto; padding: 0 20px; }

.drag-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(54, 209, 196, 0.1); border: 2px dashed #36d1c4;
  display: flex; align-items: center; justify-content: center; z-index: 10;
  .drag-hint { text-align: center; p { color: #36d1c4; font-size: 16px; margin-top: 12px; } }
}

.action-bar {
  padding: 16px 20px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 12px;
  .options-row { display: flex; align-items: center; gap: 30px;
    .option-item { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; }
      .compress-mode {
        :deep(.el-radio) { margin-right: 20px; .el-radio__label { font-size: 13px; } }
        :deep(.el-radio__input.is-checked .el-radio__inner) { border-color: #36d1c4; background: #36d1c4; }
        :deep(.el-radio__input.is-checked + .el-radio__label) { color: #36d1c4; }
      }
    }
    .batch-settings { display: flex; align-items: center; gap: 6px; color: #36d1c4; font-size: 13px; cursor: pointer; padding: 6px 12px; border-radius: 4px; &:hover { background: #e8f8f6; } }
    .action-area { margin-left: auto; .action-btn { background: #36d1c4; border-color: #36d1c4; padding: 14px 40px; border-radius: 24px; font-size: 15px; &:hover { background: #2bb5a9; border-color: #2bb5a9; } } }
  }
  .path-row { display: flex; align-items: center;
    .output-path { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; } .path-select { width: 200px; } .folder-btn { padding: 8px 12px; border: none; background: transparent; &:hover { background: #e8f8f6; } } }
  }
}

.batch-form { .form-item { display: flex; align-items: center; margin-bottom: 16px; label { width: 100px; font-size: 14px; color: #666; } } }

:deep(.batch-dialog) {
  .el-dialog__header { border-bottom: 1px solid #f0f0f0; padding: 16px 20px; }
  .el-dialog__body { padding: 20px; }
  .el-dialog__footer { border-top: 1px solid #f0f0f0; padding: 12px 20px;
    .el-button--primary { background: #36d1c4; border-color: #36d1c4; &:hover { background: #2bb5a9; border-color: #2bb5a9; } }
  }
}

@media (max-width: 720px) {
  .file-list { padding: 0 12px; }

  .action-bar {
    padding: 14px;

    .options-row,
    .path-row,
    .output-path {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .option-item {
      flex-wrap: wrap;
    }

    .batch-settings,
    .action-area,
    .action-btn,
    .folder-btn,
    .path-select {
      width: 100%;
    }

    .action-area {
      margin-left: 0;
    }

    .action-btn,
    .folder-btn {
      justify-content: center;
    }
  }

  .batch-form .form-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;

    label {
      width: auto;
    }
  }
}
</style>
