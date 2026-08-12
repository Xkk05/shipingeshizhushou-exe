<template>
  <div class="module-page" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <TopToolbar :show-url-download="true" @add-files="addFiles" @add-folder="addFolder" @add-device="showQRUpload = true" @add-url="showURLDialog = true" @clear="clearFiles" />
    
    <div class="content-area">
      <FileDropZone v-if="!files.length" @files-selected="onFilesFromDropZone" />
      <div v-else class="file-list-wrapper">
        <SelectionToolbar
          :all-selected="allSelectableSelected"
          :some-selected="someSelectableSelected"
          :disabled="!selectableFiles.length"
          :selected-count="selectedFiles.length"
          :ready-count="selectedReadyFiles.length"
          @toggle-all="toggleSelectAll"
        />
        <div class="file-list">
          <div v-for="(file, index) in files" :key="file.id" class="merge-item">
            <div class="selection-cell" @click.stop>
              <el-checkbox
                :model-value="selectedFileIds.includes(file.id)"
                :disabled="file.status === 'converting'"
                :aria-label="`${$t('common.selectFile')} ${file.name}`"
                @change="setFileSelected(file, Boolean($event))"
              />
            </div>
            <div class="thumbnail" @click="playVideo(file)">
              <img v-if="file.thumbnail" :src="file.thumbnail" alt="" />
              <div v-else class="video-icon">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div class="play-overlay">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div class="duration">{{ file.duration || '00:00' }}</div>
              <div class="size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-info">
              <div class="filename">{{ file.name }}</div>
              <div class="meta"><span class="tag">{{ $t('common.format') }}</span><span class="value">{{ file.format?.toUpperCase() }}</span></div>
              <div class="meta" v-if="file.resolution"><span class="tag">{{ $t('common.resolution') }}</span><span class="value">{{ file.resolution }}</span></div>
            </div>
            <div class="order-btns">
              <div :class="['order-btn', { disabled: index === 0 }]" @click="index > 0 && moveUp(index)">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
              </div>
              <div :class="['order-btn', { disabled: index === files.length - 1 }]" @click="index < files.length - 1 && moveDown(index)">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 20l8-8h-5V4h-6v8H4z"/></svg>
              </div>
            </div>
            <el-button class="delete-btn" text @click="deleteFile(file)">×</el-button>
          </div>
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
          <span class="label">{{ $t('common.outputFormat') }}</span>
          <div class="format-selector" @click="showSettings = true">
            <span>{{ outputFormat.toUpperCase() }}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="#36d1c4"><path d="M7 10l5 5 5-5z"/></svg>
          </div>
        </div>
        <div class="option-item">
          <span class="label">{{ $t('common.outputFileName') }}</span>
          <el-input v-model="outputName" class="name-input" :placeholder="$t('common.mergedVideoDefaultName')" />
        </div>
        <div class="action-area">
          <el-button type="primary" class="action-btn" :disabled="mergeActionDisabled" @click="mergeAll">
            {{ merging ? $t('common.merging') : $t('common.startMerge') }}
          </el-button>
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
        <div v-if="merging" class="progress-info"><el-progress :percentage="progress" :stroke-width="8" /></div>
        <div v-else-if="mergeStatus === 'completed'" class="status-text success">{{ $t('common.mergeSuccess') }}</div>
        <div v-else-if="mergeStatus === 'error'" class="status-text error">{{ $t('common.mergeFailed') }}</div>
      </div>
    </div>

    <SettingsDialog v-model="showSettings" type="video" @confirm="handleSettingsConfirm" />
    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import { handleDragDropEvent, VIDEO_EXTENSIONS } from '@/utils/dragDropUtils'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { useI18n } from 'vue-i18n'
import { getWebVideoMeta } from '@/utils/webMediaMeta'
import { useSelectableFiles } from '@/composables/useSelectableFiles'

const { t } = useI18n()
import { platformService } from '@/services/platformService'

const fileStore = useFileStore()
const { videoMergeFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const outputFormat = ref('mp4')
const showSettings = ref(false)
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const outputName = ref(t('common.mergedVideoDefaultName'))
const outputDir = ref('')
const outputPathType = ref('default')
const merging = ref(false)
const progress = ref(0)
const mergeStatus = ref('')
const isDragging = ref(false)
const isProcessingDrop = ref(false)
const {
  selectedFileIds,
  selectableFiles,
  selectedFiles,
  selectedReadyFiles,
  allSelectableSelected,
  someSelectableSelected,
  setFileSelected,
  toggleSelectAll,
  clearSelection,
  removeSelection,
} = useSelectableFiles(files)
const mergeActionDisabled = computed(() => selectedReadyFiles.value.length < 2 || merging.value)

const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', '3gp', 'ts', 'm2ts']

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  platformService.onConvertProgress((data: { percent: number }) => { progress.value = Math.round(data.percent) }, 'merge-progress')
})

onUnmounted(() => { platformService.removeConvertProgressListeners('merge-progress') })

const formatSize = (bytes: number) => {
  if (!bytes) return '0B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60)
  return h > 0 ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
      resolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
      duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00',
      size: videoInfo.size, thumbnail, status: 'pending'
    })
  }
}

const handleFilesSelected = addFilesToList

const clearFiles = () => { files.value = []; mergeStatus.value = ''; clearSelection() }
const deleteFile = (file: any) => { files.value = files.value.filter(f => f.id !== file.id); removeSelection(file) }
const moveUp = (index: number) => { if (index > 0) { const temp = files.value[index]; files.value[index] = files.value[index - 1]; files.value[index - 1] = temp } }
const moveDown = (index: number) => { if (index < files.value.length - 1) { const temp = files.value[index]; files.value[index] = files.value[index + 1]; files.value[index + 1] = temp } }
const playVideo = async (file: any) => { if (file.path) await platformService.playVideo(file.path) }

const handlePathTypeChange = (type: string) => { if (type === 'custom') selectOutputDir() }
const selectOutputDir = async () => {
  const dir = await platformService.selectOutputDir()
  if (dir) { outputDir.value = dir; outputPathType.value = 'custom' }
  else if (outputPathType.value === 'custom') outputPathType.value = 'default'
}

const getOutputPath = (targetFiles = selectedReadyFiles.value) => {
  if (!platformService.isElectron) return `${outputName.value}.${outputFormat.value}`
  if (outputPathType.value === 'source' && targetFiles.length > 0) return platformService.join(platformService.dirname(targetFiles[0].path), `${outputName.value}.${outputFormat.value}`)
  return platformService.join(outputDir.value, `${outputName.value}.${outputFormat.value}`)
}

const mergeAll = async () => {
  if (mergeActionDisabled.value) return
  await checkAuthAndExecute(async () => {
    const targetFiles = [...selectedReadyFiles.value]
    if (targetFiles.length < 2) return
    merging.value = true; progress.value = 0; mergeStatus.value = ''
    try {
      await platformService.convertVideo({ 
        id: `merge-${Date.now()}`, 
        inputPaths: targetFiles.map(f => f.path),
        outputPath: getOutputPath(targetFiles),
        format: outputFormat.value,
        type: 'merge'
      })
      mergeStatus.value = 'completed'; progress.value = 100
      clearSelection()
    } catch (err) { mergeStatus.value = 'error'; console.error('合并失败:', err) }
    finally { merging.value = false }
  })
}

const handleSettingsConfirm = (data: { format: string; settings: any }) => {
  outputFormat.value = data.format.toLowerCase()
  // 重置合并状态，允许重新合并
  mergeStatus.value = ''
  progress.value = 0
}
const handleFilesUploaded = (filePaths: string[]) => { handleFilesSelected(filePaths); showQRUpload.value = false }
const handleURLDownloaded = (filePath: string) => { handleFilesSelected([filePath]) }
</script>

<style lang="scss" scoped>
.module-page { height: 100%; display: flex; flex-direction: column; background: #f8f9fa; }
.content-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list { flex: 1; overflow-y: auto; padding: 0 20px; }

.merge-item {
  display: flex; align-items: center; gap: 16px; padding: 16px;
  background: #fff; border-radius: 12px; margin-bottom: 12px; border: 1px solid #f0f0f0;

  .selection-cell {
    width: 28px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.el-checkbox__inner) {
      border-radius: 5px;
      border-color: #9bd8d1;
    }

    :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
      background: #36d1c4;
      border-color: #36d1c4;
    }
  }

  .thumbnail {
    width: 120px; height: 80px; background: #e8f8f6; border-radius: 8px;
    position: relative; overflow: hidden; cursor: pointer;
    img { height: 100%; width: auto; max-width: none; object-fit: contain; display: block; margin: 0 auto; }
    .video-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .play-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.3); opacity: 0; transition: opacity 0.2s; }
    &:hover .play-overlay { opacity: 1; }
    .duration, .size { position: absolute; bottom: 6px; background: rgba(0,0,0,0.6); color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
    .duration { left: 6px; } .size { right: 6px; }
  }

  .file-info { flex: 1;
    .filename { font-size: 14px; color: #333; margin-bottom: 8px; }
    .meta { display: flex; gap: 8px; margin-bottom: 4px; .tag { font-size: 12px; color: #36d1c4; } .value { font-size: 12px; color: #666; } }
  }

  .order-btns { display: flex; gap: 20px;
    .order-btn { width: 50px; height: 50px; border-radius: 50%; background: #36d1c4; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
      &:hover:not(.disabled) { background: #2bb5a9; transform: scale(1.05); }
      &.disabled { background: #d9d9d9; cursor: not-allowed; }
    }
  }
  .delete-btn { font-size: 20px; color: #999; }
}

.drag-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(54, 209, 196, 0.1); border: 2px dashed #36d1c4;
  display: flex; align-items: center; justify-content: center; z-index: 10;
  .drag-hint { text-align: center; p { color: #36d1c4; font-size: 16px; margin-top: 12px; } }
}

.action-bar {
  padding: 16px 20px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 12px;
  .options-row { display: flex; align-items: center; gap: 30px;
    .option-item { display: flex; align-items: center; gap: 12px;
      .label { font-size: 13px; color: #666; white-space: nowrap; }
      .name-input { width: 150px; }
      .format-selector { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border: 1px solid #36d1c4; border-radius: 4px; cursor: pointer; font-size: 13px; color: #333; min-width: 100px; justify-content: space-between; &:hover { background: #e8f8f6; } }
    }
    .action-area { margin-left: auto;
      .action-btn { background: #36d1c4; border-color: #36d1c4; padding: 14px 40px; border-radius: 24px; font-size: 15px; &:hover { background: #2bb5a9; border-color: #2bb5a9; } &:disabled { background: #ccc; border-color: #ccc; } }
    }
  }
  .path-row { display: flex; align-items: center; justify-content: space-between;
    .output-path { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; } .path-select { width: 200px; } .folder-btn { padding: 8px 12px; border: none; background: transparent; &:hover { background: #e8f8f6; } } }
    .progress-info { width: 200px; }
    .status-text { font-size: 13px; &.success { color: #36d1c4; } &.error { color: #f56c6c; } }
  }
}
</style>
