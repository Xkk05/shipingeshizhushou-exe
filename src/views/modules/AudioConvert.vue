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
          <div v-for="file in files" :key="file.id" class="audio-item" :class="{ converting: file.status === 'converting', completed: file.status === 'completed', error: file.status === 'error' }">
            <div class="selection-cell" @click.stop>
              <el-checkbox
                :model-value="selectedFileIds.includes(file.id)"
                :disabled="file.status === 'converting'"
                :aria-label="`${$t('common.selectFile')} ${file.name}`"
                @change="setFileSelected(file, Boolean($event))"
              />
            </div>
            <div class="audio-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              <div class="duration">{{ file.duration }}</div>
              <div class="size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-info">
              <div class="filename">{{ file.name }}</div>
              <div class="meta-row"><span class="tag">{{ $t('common.format') }}</span><span class="value">{{ file.format?.toUpperCase() }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.bitrate') }}</span><span class="value">{{ file.bitrate || $t('common.unknown') }}</span><span class="tag">{{ $t('common.sampleRate') }}</span><span class="value">{{ file.sampleRate || $t('common.unknown') }}</span></div>
            </div>
            <div class="arrow">→</div>
            <div class="output-info">
              <div class="filename editable" v-if="!file.isEditing" @click="startEditName(file)">
                {{ file.outputName }}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4" class="edit-icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <div class="filename-edit" v-else>
                <el-input v-model="file.editingName" size="small" @blur="confirmEditName(file)" @keyup.enter="confirmEditName(file)" @keyup.escape="cancelEditName(file)" />
              </div>
              <div class="meta-row"><span class="tag">{{ $t('common.format') }}</span><span class="value">{{ file.outputFormat?.toUpperCase() }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.bitrate') }}</span><span class="value">{{ file.outputBitrate || bitrateLabel || $t('common.auto') }}</span><span class="tag">{{ $t('common.sampleRate') }}</span><span class="value">{{ file.outputSampleRate || $t('common.auto') }}</span></div>
              <div v-if="file.status === 'converting'" class="progress-bar"><div class="progress-fill" :style="{ width: file.progress + '%' }"></div><span class="progress-text">{{ file.progress }}%</span></div>
              <div v-else-if="file.status === 'completed'" class="status-text success">{{ $t('common.completed') }}</div>
              <div v-else-if="file.status === 'error'" class="status-text error">{{ $t('common.convertFailed') }}</div>
            </div>
            <el-button class="delete-btn" text @click="deleteFile(file)">×</el-button>
            <div class="actions">
              <el-button class="setting-btn" size="small" circle @click="openSettings(file)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
              </el-button>
              <el-button type="primary" size="small" class="convert-btn" :disabled="file.status === 'converting'" @click="convertFile(file)">
                {{ file.status === 'converting' ? $t('common.converting') : (file.status === 'completed' ? $t('common.completed') : $t('common.convert')) }}
              </el-button>
            </div>
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
          <div class="format-selector" @click="openSettings()">
            <span>{{ outputFormat.toUpperCase() }}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="#36d1c4"><path d="M7 10l5 5 5-5z"/></svg>
          </div>
        </div>
        <div class="option-item">
          <span class="label">{{ $t('common.bitrate') }}</span>
          <el-select v-model="bitrate" class="option-select">
            <el-option :label="$t('common.auto')" value="" /><el-option label="128kbps" value="128k" /><el-option label="192kbps" value="192k" />
            <el-option label="256kbps" value="256k" /><el-option label="320kbps" value="320k" />
          </el-select>
        </div>
        <div class="action-area"><el-button type="primary" class="action-btn" :disabled="batchActionDisabled" @click="convertAll">{{ $t('common.convertAll') }}</el-button></div>
      </div>
      <div v-if="platformService.isElectron" class="path-row">
        <div class="output-path">
          <span class="label">{{ $t('common.outputPath') }}</span>
          <el-select v-model="outputPathType" class="path-select" @change="handlePathTypeChange">
            <el-option :label="$t('common.videoConverterFolder')" value="default" /><el-option :label="$t('common.sameAsSource')" value="source" /><el-option :label="$t('common.customFolder')" value="custom" />
          </el-select>
          <el-button class="folder-btn" @click="selectOutputDir">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#36d1c4"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          </el-button>
        </div>
      </div>
    </div>

    <SettingsDialog v-model="showSettings" type="audio" format-scope="audio" :initial-settings="initialSettingsForDialog" :initial-format="initialFormatForDialog" @confirm="handleSettingsConfirm" />
    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import { handleDragDropEvent, AUDIO_EXTENSIONS } from '@/utils/dragDropUtils'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { platformService } from '@/services/platformService'
import { getWebVideoMeta } from '@/utils/webMediaMeta'
import { useI18n } from 'vue-i18n'
import { useSelectableFiles } from '@/composables/useSelectableFiles'
import {
  isFileOutputCustomized,
  markFileOutputCustomized,
  resetFileOutputStatus,
} from '@/utils/outputSettings'

const { t } = useI18n()

const fileStore = useFileStore()
const { audioConvertFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const outputFormat = ref('mp3')
const bitrate = ref('')
const sampleRate = ref('')
const showSettings = ref(false)
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const outputDir = ref('')
const outputPathType = ref('default')
const isDragging = ref(false)
const isProcessingDrop = ref(false)
const currentEditingFile = ref<any>(null)
const initialSettingsForDialog = ref<any>(null)
const initialFormatForDialog = ref('')

const defaultAudioSettings = {
  audioCodec: 'auto',
  channels: 'auto',
  sampleRate: 'auto',
  audioBitrate: 'auto',
}
const batchAudioSettings = ref({ ...defaultAudioSettings })
const bitrateLabel = computed(() => bitrate.value ? bitrate.value.replace('k', 'kbps') : '')
const {
  selectedFileIds,
  selectableFiles,
  selectedFiles,
  selectedReadyFiles,
  batchActionDisabled,
  allSelectableSelected,
  someSelectableSelected,
  setFileSelected,
  toggleSelectAll,
  clearSelection,
  removeSelection,
} = useSelectableFiles(files)

const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'm4r', 'mp2', 'wma', 'aiff']

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  platformService.onConvertProgress((data: { id: string; percent: number }) => {
    const file = files.value.find(f => f.id === data.id)
    if (file && file.status === 'converting') {
      file.progress = Math.round(data.percent)
    }
  }, 'audio-progress')
})

onUnmounted(() => { platformService.removeConvertProgressListeners('audio-progress') })

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

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
    const mediaFiles = await handleDragDropEvent(e, AUDIO_EXTENSIONS)
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

const cloneSettings = (settings: any) => JSON.parse(JSON.stringify(settings || defaultAudioSettings))
const audioBitrateValue = (settings: any) => settings?.audioBitrate && settings.audioBitrate !== 'auto' ? `${settings.audioBitrate}k` : ''
const audioBitrateText = (settings: any) => settings?.audioBitrate && settings.audioBitrate !== 'auto' ? `${settings.audioBitrate}kbps` : ''
const audioSampleRateText = (settings: any) => settings?.sampleRate && settings.sampleRate !== 'auto' ? `${settings.sampleRate}Hz` : ''

const openSettings = (file?: any) => {
  currentEditingFile.value = file || null
  initialSettingsForDialog.value = cloneSettings(file?.settings || batchAudioSettings.value)
  initialFormatForDialog.value = file?.outputFormat || outputFormat.value
  showSettings.value = true
}

const startEditName = (file: any) => {
  file.isEditing = true; file.editingName = file.outputName
  nextTick(() => { const input = document.querySelector('.filename-edit .el-input__inner') as HTMLInputElement; if (input) { input.focus(); input.select() } })
}

const confirmEditName = (file: any) => {
  if (file.editingName?.trim()) {
    let newName = file.editingName.trim()
    const ext = file.outputFormat || outputFormat.value
    if (!newName.toLowerCase().endsWith(`.${ext}`)) newName = newName.replace(/\.[^.]+$/, '') + `.${ext}`
    file.outputName = newName
  }
  file.isEditing = false
}

const cancelEditName = (file: any) => { file.isEditing = false }

const addFiles = async () => {
  const selectedFiles = await platformService.selectFiles([{ name: t('common.audioFiles'), extensions: audioExtensions }])
  if (selectedFiles?.length) addFilesToList(selectedFiles)
}

const addFolder = async () => {
  const selectedFiles = await platformService.selectFolder(audioExtensions)
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
    if (!filePath) continue
    if (files.value.some(file => file.path === filePath)) continue

    let info: any = {}
    if (!platformService.isElectron && browserFile) {
      const webMeta = await getWebVideoMeta(browserFile)
      info = {
        duration: webMeta.duration,
        size: browserFile.size,
      }
    } else {
      try { info = await platformService.getVideoInfo(filePath) } catch (e) {}
    }

    files.value.push({
      id: fileId, name: fileName, path: filePath,
      format: platformService.extname(fileName).slice(1),
      outputName: fileName?.replace(/\.[^.]+$/, `_convert.${outputFormat.value}`),
      outputFormat: outputFormat.value,
      settings: cloneSettings(batchAudioSettings.value),
      hasCustomOutputSettings: false,
      outputBitrate: bitrateLabel.value,
      outputSampleRate: sampleRate.value,
      duration: info.duration ? formatDuration(info.duration) : '00:00',
      size: info.size,
      bitrate: info.audioBitrate ? `${Math.round(info.audioBitrate / 1000)}kbps` : (info.bitrate ? `${Math.round(info.bitrate / 1000)}kbps` : ''),
      sampleRate: info.sampleRate ? `${info.sampleRate}Hz` : '',
        status: 'pending', progress: 0, isEditing: false, editingName: ''
      })
  }
}

const handleFilesSelected = addFilesToList

const applyAudioSettingsToFile = (f: any, format: string, settings: any, customized: boolean) => {
  f.outputName = f.name.replace(/\.[^.]+$/, `_convert.${format}`)
  f.outputFormat = format
  f.settings = cloneSettings(settings)
  f.outputBitrate = audioBitrateText(settings)
  f.outputSampleRate = audioSampleRateText(settings)
  markFileOutputCustomized(f, customized)
  resetFileOutputStatus(f)
}

const audioBitrateForFile = (file: any) => {
  if (file.settings?.audioBitrate && file.settings.audioBitrate !== 'auto') {
    return `${file.settings.audioBitrate}k`
  }

  return isFileOutputCustomized(file) ? undefined : (bitrate.value || undefined)
}

const handleSettingsConfirm = (data: { format: string; settings: any }) => {
  const nextFormat = data.format.toLowerCase()
  const nextSettings = cloneSettings(data.settings)

  if (currentEditingFile.value) {
    applyAudioSettingsToFile(currentEditingFile.value, nextFormat, nextSettings, true)
  } else {
    outputFormat.value = nextFormat
    batchAudioSettings.value = nextSettings
    bitrate.value = audioBitrateValue(nextSettings)
    sampleRate.value = audioSampleRateText(nextSettings)
    files.value.forEach(f => {
      if (!isFileOutputCustomized(f)) applyAudioSettingsToFile(f, nextFormat, nextSettings, false)
    })
  }
}

const clearFiles = () => { files.value = []; clearSelection() }
const deleteFile = (file: any) => { files.value = files.value.filter(f => f.id !== file.id); removeSelection(file) }

const handlePathTypeChange = (type: string) => {
  if (type === 'custom') selectOutputDir()
}

const selectOutputDir = async () => {
  const dir = await platformService.selectOutputDir()
  if (dir) {
    outputDir.value = dir
    outputPathType.value = 'custom'
  } else if (outputPathType.value === 'custom') {
    outputPathType.value = 'default'
  }
}

const getOutputPath = (file: any) => {
  if (!platformService.isElectron) return file.outputName
  return outputPathType.value === 'source' ? platformService.join(platformService.dirname(file.path), file.outputName) : platformService.join(outputDir.value, file.outputName)
}

const convertFile = async (file: any, showDialog = true) => {
  await checkAuthAndExecute(async () => {
    if (file.status === 'converting') return
    file.status = 'converting'; file.progress = 0
    try {
      await platformService.convertVideo({ 
        id: file.id, 
        inputPath: file.path, 
        outputPath: getOutputPath(file), 
        format: file.outputFormat || outputFormat.value, 
        bitrate: audioBitrateForFile(file),
        sampleRate: file.settings?.sampleRate && file.settings.sampleRate !== 'auto' ? file.settings.sampleRate : undefined,
        channels: file.settings?.channels && file.settings.channels !== 'auto' ? file.settings.channels : undefined,
        settings: file.settings,
        type: 'audio-convert'
      })
      file.status = 'completed'; file.progress = 100
    } catch (err) { file.status = 'error'; console.error('转换失败:', err) }
  })
}

const convertAll = async () => {
  if (batchActionDisabled.value) return
  await checkAuthAndExecute(async () => {
    const pendingFiles = [...selectedReadyFiles.value]
    let completedCount = 0
    for (const file of pendingFiles) { 
      if (file.status === 'converting') continue
      file.status = 'converting'; file.progress = 0
      try {
        await platformService.convertVideo({ 
          id: file.id, 
          inputPath: file.path, 
          outputPath: getOutputPath(file), 
          format: file.outputFormat || outputFormat.value, 
          bitrate: audioBitrateForFile(file),
          sampleRate: file.settings?.sampleRate && file.settings.sampleRate !== 'auto' ? file.settings.sampleRate : undefined,
          channels: file.settings?.channels && file.settings.channels !== 'auto' ? file.settings.channels : undefined,
          settings: file.settings,
          type: 'audio-convert'
        })
        file.status = 'completed'; file.progress = 100
        completedCount++
      } catch (err) { 
        file.status = 'error'; 
        console.error('转换失败:', err) 
      }
    }
    clearSelection()
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

.audio-item {
  display: flex; align-items: center; gap: 16px; padding: 16px; position: relative;
  background: #fff; border-radius: 12px; margin-bottom: 12px; border: 1px solid #f0f0f0;
  &.converting { border-color: #36d1c4; background: #fafffe; }
  &.completed { border-color: #36d1c4; }
  &.error { border-color: #f56c6c; }

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

  .audio-icon {
    width: 100px; height: 80px; background: #36d1c4; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0;
    .duration { position: absolute; left: 6px; bottom: 6px; background: rgba(0, 0, 0, 0.6); color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
    .size { position: absolute; right: 6px; bottom: 6px; background: rgba(0, 0, 0, 0.6); color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
  }
  
  .file-info, .output-info { flex: 1; min-width: 0;
    .filename { font-size: 14px; color: #333; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      &.editable { display: flex; align-items: center; gap: 6px; cursor: pointer; .edit-icon { opacity: 0; transition: opacity 0.2s; } &:hover .edit-icon { opacity: 1; } }
    }
    .filename-edit { margin-bottom: 8px; :deep(.el-input__inner) { font-size: 14px; } }
    .meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; .tag { font-size: 12px; color: #36d1c4; } .value { font-size: 12px; color: #666; margin-right: 16px; } }
    .progress-bar { height: 16px; background: #f0f0f0; border-radius: 8px; position: relative; margin-top: 8px;
      .progress-fill { height: 100%; background: linear-gradient(90deg, #36d1c4, #5de0d4); border-radius: 8px; }
      .progress-text { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; color: #666; }
    }
    .status-text { font-size: 12px; margin-top: 8px; &.success { color: #36d1c4; } &.error { color: #f56c6c; } }
  }
  
  .arrow { color: #ccc; font-size: 20px; padding: 0 16px; }
  .delete-btn { font-size: 20px; color: #999; position: absolute; right: 16px; top: 8px; padding: 0; min-width: auto; }
  .actions { display: flex; align-items: center; gap: 24px;
    .setting-btn { border-color: #e0e0e0; }
    .convert-btn { background: #36d1c4; border-color: #36d1c4; border-radius: 8px; padding: 8px 24px; }
  }
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
    .option-item { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; } .option-select { width: 140px; }
      .format-selector { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border: 1px solid #36d1c4; border-radius: 4px; cursor: pointer; font-size: 13px; color: #333; min-width: 100px; justify-content: space-between; &:hover { background: #e8f8f6; } }
    }
    .action-area { margin-left: auto; .action-btn { background: #36d1c4; border-color: #36d1c4; padding: 14px 40px; border-radius: 24px; } }
  }
  .path-row { .output-path { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; } .path-select { width: 200px; } .folder-btn { padding: 8px 12px; border: none; background: transparent; &:hover { background: #e8f8f6; } } } }
}

@media (max-width: 820px) {
  .file-list { padding: 0 12px; }

  .audio-item {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    .audio-icon {
      width: 100%;
      height: 120px;
    }

    .arrow {
      display: none;
    }

    .delete-btn {
      top: 12px;
    }

    .actions {
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 12px;
    }
  }

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

    .action-area {
      margin-left: 0;
    }

    .action-btn,
    .path-select {
      width: 100%;
    }
  }
}
</style>
