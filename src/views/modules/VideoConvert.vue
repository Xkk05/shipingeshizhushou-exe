<template>
  <div class="module-page" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <TopToolbar :show-url-download="true" @add-files="addFiles" @add-folder="addFolder" @add-device="showQRUpload = true" @add-url="showURLDialog = true" @clear="clearFiles" />

    <div class="content-area">
      <FileDropZone v-if="!files.length" @files-selected="onFilesFromDropZone" />
      <div v-else class="file-list-wrapper">
        <div class="file-list">
          <FileListItem v-for="file in files" :key="file.id" :file="file" :action-text="t('common.convert')" @settings="openSettings(file)" @convert="convertFile(file)" @delete="deleteFile(file)" />
        </div>
        <div v-if="isDragging" class="drag-overlay">
          <div class="drag-hint">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#36d1c4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <p>{{ t('common.dropFilesToAdd') }}</p>
          </div>
        </div>
      </div>
    </div>

    <ActionBar :action-text="t('common.convertAll')" :current-format="outputFormat" @action="convertAll" @show-settings="openSettings()" @output-path-change="handleOutputPathChange" />
    <SettingsDialog v-model="showSettings" type="video" :initial-settings="initialSettingsForDialog" :initial-format="initialFormatForDialog" @confirm="handleSettingsConfirm" @close="showSettings = false" />
    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import FileListItem from '@/components/FileListItem.vue'
import ActionBar from '@/components/ActionBar.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import { handleDragDropEvent, VIDEO_EXTENSIONS } from '@/utils/dragDropUtils'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { platformService } from '@/services/platformService'

const { t } = useI18n()

const fileStore = useFileStore()
const { videoConvertFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const showSettings = ref(false)
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const outputFormat = ref('mp4')
const outputDir = ref('')
const outputPathType = ref('default')
const convertSettings = ref<any>({
  clarity: 'quality',
  quality: 'auto',
  resolution: 'auto',
  width: 0,
  height: 0,
  videoCodec: 'auto',
  frameRate: 'auto',
  videoBitrate: '2400',
  audioCodec: 'auto',
  channels: 'auto',
  sampleRate: 'auto',
  audioBitrate: 'auto',
})
const isDragging = ref(false)
const currentEditingFile = ref<any>(null)
const initialSettingsForDialog = ref<any>(null)
const initialFormatForDialog = ref<string>('')

const videoExtensions = ['mp4', 'avi', 'wmv', 'flv', 'mkv', 'mov', 'webm', '3gp', 'f4v', 'swf', 'ogv', 'asf', 'vob', 'mpg', 'mpeg', 'wtv', 'ts', 'm2ts', 'mts', 'm2t', 'm4v']

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  platformService.onConvertProgress((data: { id: string; percent: number }) => {
    const file = files.value.find((f) => f.id === data.id)
    if (file && file.status === 'converting') {
      file.progress = Math.round(data.percent)
    }
  })
})

onUnmounted(() => {
  platformService.removeConvertProgressListeners()
})

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
  if (!files.value.length) return

  try {
    const mediaFiles = await handleDragDropEvent(e, VIDEO_EXTENSIONS)
    if (mediaFiles.length) addFilesToList(mediaFiles)
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

const getWebVideoMeta = (file: File): Promise<{ duration: number; thumbnail: string }> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 180
        const ctx = canvas.getContext('2d')
        let thumbnail = ''
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          thumbnail = canvas.toDataURL('image/jpeg', 0.82)
        }
        resolve({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          thumbnail,
        })
      } finally {
        cleanup()
      }
    }

    video.onerror = () => {
      cleanup()
      resolve({ duration: 0, thumbnail: '' })
    }
  })

const addFilesToList = async (selectedFiles: any[]) => {
  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i]
    let filePath = ''
    let fileName = ''
    let browserFile: File | null = null

    if (typeof f === 'string') {
      filePath = f
      fileName = f.split(/[/\\]/).pop() || ''
    } else {
      filePath = f.path || ''
      fileName = f.name || ''
      browserFile = f.file instanceof File ? f.file : (f instanceof File ? f : null)
    }

    if (!filePath) continue
    if (files.value.some((file) => file.path === filePath)) continue

    let videoInfo: any = {}
    let thumbnail = ''

    if (!platformService.isElectron && browserFile) {
      const webMeta = await getWebVideoMeta(browserFile)
      videoInfo = {
        duration: webMeta.duration,
        size: browserFile.size,
      }
      thumbnail = webMeta.thumbnail
    } else {
      try {
        videoInfo = await platformService.getVideoInfo(filePath)
      } catch (e) {
        console.error(t('error.getVideoInfoFailed'), e)
      }
      try {
        thumbnail = await platformService.getVideoThumbnail(filePath)
      } catch (e) {
        console.error(t('error.getThumbnailFailed'), e)
      }
    }

    files.value.push({
      id: f.id || `${Date.now()}-${i}`,
      name: fileName,
      path: filePath,
      format: platformService.extname(fileName).slice(1),
      outputName: fileName.replace(/\.[^.]+$/, `_convert.${outputFormat.value}`),
      outputFormat: outputFormat.value,
      resolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
      outputResolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
      duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00',
      size: videoInfo.size || 0,
      bitrate: videoInfo.bitrate ? `${Math.round(videoInfo.bitrate / 1000)}kbps` : '',
      thumbnail,
      status: 'pending',
      progress: 0,
      settings: JSON.parse(JSON.stringify(convertSettings.value)),
    })
  }
}

const handleFilesSelected = addFilesToList

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const clearFiles = () => { files.value = [] }
const deleteFile = (file: any) => { files.value = files.value.filter((f) => f.id !== file.id) }

const openSettings = (file?: any) => {
  if (file) {
    currentEditingFile.value = file
    initialSettingsForDialog.value = file.settings
    initialFormatForDialog.value = file.outputFormat
  } else {
    currentEditingFile.value = null
    initialSettingsForDialog.value = convertSettings.value
    initialFormatForDialog.value = outputFormat.value
  }
  showSettings.value = true
}

const handleOutputPathChange = (data: { type: string; path: string }) => {
  outputPathType.value = data.type
  if (data.path) outputDir.value = data.path
}

const getOutputPath = (file: any) => {
  if (outputPathType.value === 'source') {
    return platformService.join(platformService.dirname(file.path), file.outputName)
  }
  return platformService.join(outputDir.value, file.outputName)
}

const convertFile = async (file: any, showDialog = true) => {
  await checkAuthAndExecute(async () => {
    if (file.status === 'converting') return
    file.status = 'converting'
    file.progress = 0
    try {
      const settings = JSON.parse(JSON.stringify(file.settings || convertSettings.value))
      await platformService.convertVideo({ id: file.id, inputPath: file.path, outputPath: getOutputPath(file), format: file.outputFormat, settings })
      file.status = 'completed'
      file.progress = 100
    } catch (err: any) {
      file.status = 'error'
      console.error(t('error.convertFailed'), err)
    }
  })
}

const convertAll = async () => {
  await checkAuthAndExecute(async () => {
    const pendingFiles = files.value.filter((f) => f.status === 'pending' || f.status === 'error')
    let completedCount = 0
    for (const file of pendingFiles) {
      if (file.status === 'converting') continue
      file.status = 'converting'
      file.progress = 0
      try {
        const settings = JSON.parse(JSON.stringify(file.settings || convertSettings.value))
        await platformService.convertVideo({ id: file.id, inputPath: file.path, outputPath: getOutputPath(file), format: file.outputFormat, settings })
        file.status = 'completed'
        file.progress = 100
        completedCount++
      } catch (err: any) {
        file.status = 'error'
        console.error(t('error.convertFailed'), err)
      }
    }
  })
}

const handleSettingsConfirm = (data: any) => {
  const newFormat = data.format.toLowerCase()
  const newSettings = data.settings

  const updateFileDisplay = (f: any) => {
    f.outputFormat = newFormat
    f.settings = JSON.parse(JSON.stringify(newSettings))
    f.outputName = f.name.replace(/\.[^.]+$/, `_convert.${newFormat}`)

    if (newSettings.resolution === 'auto') {
      f.outputResolution = f.resolution
    } else if (newSettings.width && newSettings.height) {
      f.outputResolution = `${newSettings.width}x${newSettings.height}`
    } else if (newSettings.resolution && newSettings.resolution !== 'custom') {
      f.outputResolution = newSettings.resolution
    }

    if (f.status === 'completed' || f.status === 'error') {
      f.status = 'pending'
      f.progress = 0
    }
  }

  if (currentEditingFile.value) {
    updateFileDisplay(currentEditingFile.value)
  } else {
    outputFormat.value = newFormat
    convertSettings.value = JSON.parse(JSON.stringify(newSettings))
    files.value.forEach((f) => updateFileDisplay(f))
  }
}

const handleFilesUploaded = (filePaths: string[]) => {
  handleFilesSelected(filePaths)
  showQRUpload.value = false
}

const handleURLDownloaded = (filePath: string) => {
  handleFilesSelected([filePath])
}
</script>

<style lang="scss" scoped>
.module-page { height: 100%; display: flex; flex-direction: column; background: transparent; }
.content-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.file-list { flex: 1; overflow-y: auto; padding: 0 20px; }
.drag-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(54, 209, 196, 0.1); border: 2px dashed #36d1c4; display: flex; align-items: center; justify-content: center; z-index: 10; .drag-hint { text-align: center; p { color: #36d1c4; font-size: 16px; margin-top: 12px; } } }
.module-page :deep(.toolbar) { padding: 0 2px 18px; background: transparent; }
.module-page :deep(.drop-zone), .module-page :deep(.top-toolbar), .module-page :deep(.action-bar) { border-radius: 18px; border: 1px solid #d8e4f0; background: #fff; box-shadow: 0 12px 30px rgba(62, 102, 150, 0.08); }
.module-page :deep(.top-toolbar) { padding: 16px 18px; }
.module-page :deep(.content-area) { min-height: 420px; }
.module-page :deep(.drop-zone) { min-height: 360px; }
.module-page :deep(.action-bar) { margin-top: 20px; }
@media (max-width: 900px) { .file-list { padding: 0 8px; } .module-page :deep(.top-toolbar) { padding: 12px; } .module-page :deep(.action-bar) { margin-top: 14px; } }
</style>
