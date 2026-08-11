<template>
  <div class="module-page" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <TopToolbar :show-url-download="true" @add-files="addFiles" @add-folder="addFolder" @add-device="showQRUpload = true" @add-url="showURLDialog = true" @clear="clearFiles" />
    
    <div class="content-area">
      <FileDropZone v-if="!files.length" @files-selected="onFilesFromDropZone" />
      <div v-else class="file-list-wrapper">
        <div class="file-list">
          <div v-for="file in files" :key="file.id" class="gif-item" :class="{ converting: file.status === 'converting', completed: file.status === 'completed', error: file.status === 'error' }">
            <div class="thumbnail" @click="playVideo(file)">
              <img v-if="file.thumbnail" :src="file.thumbnail" alt="" />
              <div v-else class="video-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg></div>
              <div class="play-overlay"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
              <div class="duration">{{ file.duration }}</div>
              <div class="size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-info">
              <div class="filename">{{ file.name }}</div>
              <div class="meta-row"><span class="tag">{{ $t('common.resolution') }}</span><span class="value">{{ file.resolution }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.timeRange') }}</span><span class="value">{{ file.timeRange }}</span></div>
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
              <div class="meta-row"><span class="tag">{{ $t('common.resolution') }}</span><span class="value">{{ file.outputResolution }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.duration') }}</span><span class="value">{{ file.outputDuration }}</span></div>
              <div v-if="file.status === 'converting'" class="progress-bar"><div class="progress-fill" :style="{ width: file.progress + '%' }"></div><span class="progress-text">{{ file.progress }}%</span></div>
              <div v-else-if="file.status === 'completed'" class="status-text success">{{ $t('common.convertSuccess') }}</div>
              <div v-else-if="file.status === 'error'" class="status-text error">{{ $t('common.convertFailed') }}</div>
            </div>
            <el-button class="delete-btn" text @click="deleteFile(file)">脳</el-button>
            <div class="actions">
              <el-button class="setting-btn" size="small" circle @click="openSettings(file)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
              </el-button>
              <el-button type="primary" size="small" class="convert-btn" :disabled="file.status === 'converting'" @click="convertToGif(file)">
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
          <span class="label">{{ $t('common.quality') }}</span>
          <el-select v-model="quality" class="option-select">
            <el-option :label="$t('common.ultraClearSlow')" value="ultra" /><el-option :label="$t('common.autoHigh')" value="high" />
            <el-option :label="$t('common.medium')" value="medium" /><el-option :label="$t('common.low')" value="low" />
          </el-select>
        </div>
        <div class="option-item">
          <span class="label">{{ $t('common.frameRate') }}</span>
          <el-select v-model="fps" class="option-select">
            <el-option :label="$t('common.auto')" value="auto" /><el-option label="30fps" :value="30" /><el-option label="25fps" :value="25" />
            <el-option label="24fps" :value="24" /><el-option label="15fps" :value="15" /><el-option label="10fps" :value="10" />
          </el-select>
        </div>
        <div class="option-item">
          <span class="label">{{ $t('common.speed') }}</span>
          <el-select v-model="speed" class="option-select">
            <el-option :label="$t('common.auto1x')" value="1" /><el-option label="0.5x" value="0.5" /><el-option label="2x" value="2" />
          </el-select>
        </div>
        <div class="action-area"><el-button type="primary" class="action-btn" @click="convertAll">{{ $t('common.convertAll') }}</el-button></div>
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

    <!-- 瑙嗛瑁佸壀璁剧疆寮圭獥 -->
    <el-dialog v-model="showCropDialog" :title="$t('common.videoCrop')" width="1000px" :close-on-click-modal="false" class="crop-dialog" @opened="onDialogOpen" @close="onDialogClose">
      <div class="crop-content">
        <div class="video-section">
          <div class="video-container">
            <video v-if="canPreviewVideo" ref="videoRef" @loadedmetadata="onVideoLoaded" @timeupdate="onTimeUpdate" @error="onVideoError" @canplay="onVideoCanPlay"></video>
            <div v-else class="video-fallback">
              <img v-if="currentFile?.thumbnail" :src="currentFile.thumbnail" class="fallback-thumbnail" />
              <div v-else class="fallback-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div class="fallback-tip">{{ currentFile?.format?.toUpperCase() }} {{ $t('common.formatNotSupportedPreview') }}</div>
            </div>
          </div>
          <div class="video-controls">
            <!-- 鑷畾涔夊弻婊戝潡鏃堕棿鑼冨洿閫夋嫨鍣?-->
            <div class="range-slider-container" ref="rangeSliderRef">
              <div class="slider-track"></div>
              <div class="slider-selection" :style="selectionStyle"></div>
              <div class="slider-progress" :style="progressStyle"></div>
              <div class="slider-handle start-handle" :style="startHandleStyle" @mousedown="startDragHandle($event, 'start')"></div>
              <div class="slider-handle end-handle" :style="endHandleStyle" @mousedown="startDragHandle($event, 'end')"></div>
              <div class="slider-playhead" :style="playheadStyle" @mousedown="startDragPlayhead"></div>
            </div>
            <div class="time-display">
              <span>{{ formatTimeMs(currentTime) }}/{{ formatTimeMs(videoDuration) }}</span>
              <el-button class="play-btn" circle @click="togglePlay">
                <svg v-if="isPlaying" viewBox="0 0 24 24" width="20" height="20" fill="#36d1c4"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg>
              </el-button>
            </div>
          </div>
          <div class="time-inputs">
            <div class="time-input-group">
              <span class="label">{{ $t('common.startTime') }}</span>
              <el-input v-model="startTimeStr" size="small" class="time-input" @blur="updateStartTime" />
            </div>
            <div class="time-input-group">
              <span class="label">{{ $t('common.endTime') }}</span>
              <el-input v-model="endTimeStr" size="small" class="time-input" @blur="updateEndTime" />
            </div>
            <el-button type="primary" class="add-clip-btn" @click="addClip">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              {{ $t('common.addToList') }}
            </el-button>
          </div>
          <div class="detail-settings">
            <div class="settings-header">{{ $t('common.advancedSettings') }}</div>
            <div class="settings-row">
              <div class="setting-item">
                <span class="label">{{ $t('common.width') }}</span>
                <el-input-number v-model="cropSettings.width" :min="10" :max="1920" size="small" />
              </div>
              <div class="setting-item">
                <span class="label">{{ $t('common.height') }}</span>
                <el-input-number v-model="cropSettings.height" :min="10" :max="1080" size="small" />
              </div>
              <div class="setting-item scale-item">
                <span class="label">{{ $t('common.scaleRatio') }}</span>
                <el-slider v-model="cropSettings.scale" :min="10" :max="100" class="scale-slider" @change="onScaleChange" />
                <el-input-number v-model="cropSettings.scale" :min="10" :max="100" size="small" class="scale-input" @change="onScaleChange" />
                <span class="unit">%</span>
              </div>
            </div>
            <div class="settings-row">
              <div class="setting-item">
                <span class="label">{{ $t('common.quality') }}</span>
                <el-select v-model="cropSettings.quality" size="small">
                  <el-option :label="$t('common.autoHigh')" value="high" />
                  <el-option :label="$t('common.ultraClearSlow')" value="ultra" />
                  <el-option :label="$t('common.medium')" value="medium" />
                  <el-option :label="$t('common.low')" value="low" />
                </el-select>
              </div>
              <div class="setting-item">
                <span class="label">{{ $t('common.frameRate') }}</span>
                <el-select v-model="cropSettings.fps" size="small">
                  <el-option :label="$t('common.auto')" value="auto" />
                  <el-option label="30fps" :value="30" />
                  <el-option label="25fps" :value="25" />
                  <el-option label="24fps" :value="24" />
                  <el-option label="15fps" :value="15" />
                  <el-option label="10fps" :value="10" />
                </el-select>
              </div>
              <div class="setting-item">
                <span class="label">{{ $t('common.speed') }}</span>
                <el-select v-model="cropSettings.speed" size="small">
                  <el-option :label="$t('common.auto1x')" value="1" />
                  <el-option label="0.5x" value="0.5" />
                  <el-option label="2x" value="2" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
        <div class="clips-section">
          <div class="clips-header">{{ $t('common.clipList') }}</div>
          <div class="clips-list">
            <div v-for="(clip, idx) in clipsList" :key="idx" class="clip-item">
              <div class="clip-info">
                <div class="clip-name">{{ clip.name }}</div>
                <div class="clip-meta">
                  <span class="meta-label">{{ $t('common.clip') }}</span>
                  <span class="meta-value">{{ formatTimeMs(clip.startTime) }}/{{ formatTimeMs(clip.endTime) }}</span>
                </div>
                <div class="clip-meta">
                  <span class="meta-label">{{ $t('common.size') }}</span>
                  <span class="meta-value">{{ clip.width }}脳{{ clip.height }}</span>
                </div>
              </div>
              <div class="clip-actions">
                <el-button text size="small" @click="editClip(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </el-button>
                <el-button text size="small" @click="removeClip(idx)">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#999"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </el-button>
              </div>
            </div>
            <div v-if="!clipsList.length" class="empty-clips">{{ $t('common.noClipsYet') }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCropDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCropSettings">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import { handleDragDropEvent, VIDEO_EXTENSIONS } from '@/utils/dragDropUtils'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { platformService } from '@/services/platformService'
import { getWebVideoMeta } from '@/utils/webMediaMeta'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const fileStore = useFileStore()
const { videoToGifFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const quality = ref('high')
const fps = ref<string | number>('auto')
const speed = ref('1')
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const outputDir = ref('')
const outputPathType = ref('default')
const isDragging = ref(false)
const isProcessingDrop = ref(false)

// 瑁佸壀寮圭獥鐩稿叧
const showCropDialog = ref(false)
const currentFile = ref<any>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const rangeSliderRef = ref<HTMLElement | null>(null)
const videoDuration = ref(0)
const currentTime = ref(0)
const isPlaying = ref(false)
const startTimeStr = ref('00:00:00.000')
const endTimeStr = ref('00:00:00.000')
const clipsList = ref<any[]>([])
const originalWidth = ref(0)
const originalHeight = ref(0)
const canPreviewVideo = ref(false)

// 鏃堕棿鑼冨洿閫夋嫨
const rangeStart = ref(0)
const rangeEnd = ref(0)

// 娴忚鍣ㄦ敮鎸侀瑙堢殑瑙嗛鏍煎紡
const previewableFormats = ['mp4', 'webm', 'ogg', 'mov', 'm4v']

// 璁＄畻婊戝潡鏍峰紡
const selectionStyle = computed(() => {
  if (!videoDuration.value || videoDuration.value <= 0) return { left: '0%', width: '100%' }
  const startPercent = (rangeStart.value / videoDuration.value) * 100
  const endPercent = (rangeEnd.value / videoDuration.value) * 100
  return {
    left: `${startPercent}%`,
    width: `${Math.max(0, endPercent - startPercent)}%`
  }
})

const progressStyle = computed(() => {
  if (!videoDuration.value || videoDuration.value <= 0) return { width: '0%' }
  const percent = Math.min(100, (currentTime.value / videoDuration.value) * 100)
  return { width: `${percent}%` }
})

const startHandleStyle = computed(() => {
  if (!videoDuration.value || videoDuration.value <= 0) return { left: '0%' }
  const percent = (rangeStart.value / videoDuration.value) * 100
  return { left: `${percent}%` }
})

const endHandleStyle = computed(() => {
  if (!videoDuration.value || videoDuration.value <= 0) return { left: '100%' }
  const percent = (rangeEnd.value / videoDuration.value) * 100
  return { left: `${percent}%` }
})

const playheadStyle = computed(() => {
  if (!videoDuration.value || videoDuration.value <= 0) return { left: '0%' }
  const percent = Math.min(100, (currentTime.value / videoDuration.value) * 100)
  return { left: `${percent}%` }
})

const cropSettings = reactive({
  width: 270,
  height: 480,
  scale: 38,
  quality: 'high',
  fps: 'auto' as string | number,
  speed: '1'
})

const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', '3gp', 'ts', 'm2ts']

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  platformService.onConvertProgress((data: { id: string; percent: number }) => {
    const file = files.value.find(f => f.id === data.id)
    if (file && file.status === 'converting') {
      file.progress = Math.round(data.percent)
    }
  }, 'gif-progress')
})

onUnmounted(() => { platformService.removeConvertProgressListeners('gif-progress') })

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatTimeMs = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const parseTimeStr = (str: string): number => {
  const parts = str.split(':')
  if (parts.length !== 3) return 0
  const [h, m, rest] = parts
  const [s, ms] = rest.split('.')
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (parseInt(ms || '0') / 1000)
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

const playVideo = async (file: any) => { if (file.path) await platformService.playVideo(file.path) }

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
  
  // 濡傛灉鏂囦欢鍒楄〃涓虹┖锛岃 FileDropZone 澶勭悊
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

const openSettings = (file: any) => {
  currentFile.value = file
  clipsList.value = file.clips || []
  
  // 检测是否支持预览
  const format = file.format?.toLowerCase() || ''
  canPreviewVideo.value = previewableFormats.includes(format)
  
  // 解析原始分辨率
  const resParts = file.resolution?.split('x') || []
  originalWidth.value = parseInt(resParts[0]) || 720
  originalHeight.value = parseInt(resParts[1]) || 1280
  
  // 解析输出分辨率
  const outResParts = String(file.outputResolution || '').split(/[x×脳]/)
  cropSettings.width = parseInt(outResParts[0]) || Math.round(originalWidth.value * 0.375)
  cropSettings.height = parseInt(outResParts[1]) || Math.round(originalHeight.value * 0.375)
  cropSettings.scale = Math.round((cropSettings.width / originalWidth.value) * 100)
  cropSettings.quality = file.quality || 'high'
  cropSettings.fps = file.fps || 'auto'
  cropSettings.speed = file.speed || '1'
  
  // 璁剧疆瑙嗛鏃堕暱锛堜粠鏂囦欢淇℃伅鑾峰彇锛岃В鏋恉uration瀛楃涓诧級
  let duration = file.endTime || 0
  if (!duration && file.duration) {
    // 解析 "00:00:00" 格式的时长
    const parts = file.duration.split(':')
    if (parts.length === 3) {
      duration = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    }
  }
  videoDuration.value = duration || 1 // 鑷冲皯璁句负1绉掞紝閬垮厤闄や互0
  
  // 初始化时间范围
  rangeStart.value = file.startTime || 0
  rangeEnd.value = file.endTime || duration || videoDuration.value
  
  // 瑙ｆ瀽鏃堕棿鑼冨洿
  startTimeStr.value = formatTimeMs(rangeStart.value)
  endTimeStr.value = formatTimeMs(rangeEnd.value)
  
  // 重置播放状态
  isPlaying.value = false
  currentTime.value = 0
  
  showCropDialog.value = true
}

const onDialogOpen = () => {
  // 寮圭獥鎵撳紑鍚庤缃棰戞簮锛堜粎鏀寔棰勮鐨勬牸寮忥級
  if (canPreviewVideo.value && videoRef.value && currentFile.value?.path) {
    const videoPath = 'file://' + currentFile.value.path
    console.log('Loading video:', videoPath)
    videoRef.value.src = videoPath
  }
}

const onDialogClose = () => {
  // Stop playback when the crop dialog closes.
  if (videoRef.value) {
    videoRef.value.pause()
    // 涓嶈璁剧疆 src = ''锛岃繖浼氳Е鍙?MEDIA_ELEMENT_ERROR
    // 浣跨敤 removeAttribute 鏉ユ竻闄ゆ簮
    videoRef.value.removeAttribute('src')
    videoRef.value.load() // Reset media element state.
  }
  isPlaying.value = false
}

const onVideoCanPlay = () => {
  console.log('Video can play')
}

const onVideoError = (e: Event) => {
  const video = e.target as HTMLVideoElement
  // Ignore errors caused by an empty source during cleanup.
  if (!video.src || video.src === '' || video.src === 'about:blank') {
    return
  }
  console.error('Video error:', video.error?.message || 'Unknown error')
}

// 鎷栧姩婊戝潡澶勭悊
const startDragHandle = (e: MouseEvent, type: 'start' | 'end') => {
  e.preventDefault()
  const slider = rangeSliderRef.value
  if (!slider) return
  
  const onMove = (ev: MouseEvent) => {
    const rect = slider.getBoundingClientRect()
    let percent = (ev.clientX - rect.left) / rect.width
    percent = Math.max(0, Math.min(1, percent))
    const time = percent * videoDuration.value
    
    if (type === 'start') {
      rangeStart.value = Math.min(time, rangeEnd.value - 0.1)
      startTimeStr.value = formatTimeMs(rangeStart.value)
    } else {
      rangeEnd.value = Math.max(time, rangeStart.value + 0.1)
      endTimeStr.value = formatTimeMs(rangeEnd.value)
    }
  }
  
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const startDragPlayhead = (e: MouseEvent) => {
  e.preventDefault()
  const slider = rangeSliderRef.value
  if (!slider) return
  
  const onMove = (ev: MouseEvent) => {
    const rect = slider.getBoundingClientRect()
    let percent = (ev.clientX - rect.left) / rect.width
    percent = Math.max(0, Math.min(1, percent))
    const time = percent * videoDuration.value
    currentTime.value = time
    seekTo(time)
  }
  
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const onVideoLoaded = () => {
  if (videoRef.value) {
    videoDuration.value = videoRef.value.duration
    // Initialize the clip range to the full video on first load.
    if (rangeEnd.value === 0) {
      rangeEnd.value = videoDuration.value
      endTimeStr.value = formatTimeMs(videoDuration.value)
    }
  }
}

const onTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const togglePlay = () => {
  if (!videoRef.value) return
  // 妫€鏌ヨ棰戞槸鍚︽湁鏈夋晥鐨勬簮
  if (!videoRef.value.src || videoRef.value.error) {
    console.warn('Video source not ready')
    return
  }
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play().catch(err => {
      console.error('Play error:', err)
    })
  }
  isPlaying.value = !isPlaying.value
}

const seekTo = (val: number) => {
  if (videoRef.value) {
    videoRef.value.currentTime = val
  }
}

const updateStartTime = () => {
  const time = parseTimeStr(startTimeStr.value)
  if (time >= 0 && time < videoDuration.value && time < rangeEnd.value) {
    rangeStart.value = time
    currentTime.value = time
    seekTo(time)
  } else {
    startTimeStr.value = formatTimeMs(rangeStart.value)
  }
}

const updateEndTime = () => {
  const time = parseTimeStr(endTimeStr.value)
  if (time > 0 && time <= videoDuration.value && time > rangeStart.value) {
    rangeEnd.value = time
  } else {
    endTimeStr.value = formatTimeMs(rangeEnd.value)
  }
}

const onScaleChange = () => {
  cropSettings.width = Math.round(originalWidth.value * cropSettings.scale / 100)
  cropSettings.height = Math.round(originalHeight.value * cropSettings.scale / 100)
}

const addClip = () => {
  if (rangeEnd.value <= rangeStart.value) {
    return
  }
  
  const clipName = currentFile.value?.name?.replace(/\.[^.]+$/, '') + `(${clipsList.value.length + 1}).gif`
  
  clipsList.value.push({
    name: clipName,
    startTime: rangeStart.value,
    endTime: rangeEnd.value,
    width: cropSettings.width,
    height: cropSettings.height,
    quality: cropSettings.quality,
    fps: cropSettings.fps,
    speed: cropSettings.speed
  })
}

const editClip = (idx: number) => {
  const clip = clipsList.value[idx]
  rangeStart.value = clip.startTime
  rangeEnd.value = clip.endTime
  startTimeStr.value = formatTimeMs(clip.startTime)
  endTimeStr.value = formatTimeMs(clip.endTime)
  cropSettings.width = clip.width
  cropSettings.height = clip.height
  cropSettings.scale = Math.round((clip.width / originalWidth.value) * 100)
  cropSettings.quality = clip.quality
  cropSettings.fps = clip.fps
  cropSettings.speed = clip.speed
  currentTime.value = clip.startTime
  seekTo(clip.startTime)
}

const removeClip = (idx: number) => {
  clipsList.value.splice(idx, 1)
}

const saveCropSettings = () => {
  if (currentFile.value) {
    currentFile.value.outputResolution = `${cropSettings.width}脳${cropSettings.height}`
    currentFile.value.timeRange = `${formatDuration(rangeStart.value)}-${formatDuration(rangeEnd.value)}`
    currentFile.value.outputDuration = formatDuration(rangeEnd.value - rangeStart.value)
    currentFile.value.startTime = rangeStart.value
    currentFile.value.endTime = rangeEnd.value
    currentFile.value.quality = cropSettings.quality
    currentFile.value.fps = cropSettings.fps
    currentFile.value.speed = cropSettings.speed
    currentFile.value.clips = [...clipsList.value]
    
    // Reset completed or failed files so the user can re-run the export.
    if (currentFile.value.status === 'completed' || currentFile.value.status === 'error') {
      currentFile.value.status = 'pending'
      currentFile.value.progress = 0
    }
  }
  showCropDialog.value = false
}

const startEditName = (file: any) => {
  file.isEditing = true; file.editingName = file.outputName
  nextTick(() => { const input = document.querySelector('.filename-edit .el-input__inner') as HTMLInputElement; if (input) { input.focus(); input.select() } })
}

const confirmEditName = (file: any) => {
  if (file.editingName?.trim()) {
    let newName = file.editingName.trim()
    if (!newName.toLowerCase().endsWith('.gif')) newName = newName.replace(/\.[^.]+$/, '') + '.gif'
    file.outputName = newName
  }
  file.isEditing = false
}

const cancelEditName = (file: any) => { file.isEditing = false }

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

      const outputWidth = videoInfo.width ? Math.round(videoInfo.width * 0.375) : 270
      const outputHeight = videoInfo.height ? Math.round(videoInfo.height * 0.375) : 480

      files.value.push({
        id: fileId, name: fileName, path: filePath,
        format: platformService.extname(fileName).slice(1),
        outputName: fileName?.replace(/\.[^.]+$/, '.gif'),
        resolution: videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : '',
        outputResolution: `${outputWidth}脳${outputHeight}`,
        duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00:00',
        timeRange: `00:00:00-${videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00:00'}`,
        outputDuration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00:00',
        size: videoInfo.size, thumbnail, status: 'pending', progress: 0, isEditing: false, editingName: '',
        startTime: 0, endTime: videoInfo.duration || 0, clips: []
      })
  }
}

const handleFilesSelected = addFilesToList

const clearFiles = () => { files.value = [] }
const deleteFile = (file: any) => { files.value = files.value.filter(f => f.id !== file.id) }

const ensureGifName = (name: string) => name.toLowerCase().endsWith('.gif') ? name : `${name.replace(/\.[^.]+$/, '')}.gif`

const getOutputPath = (file: any, outputName = file.outputName) => {
  const fileName = ensureGifName(outputName)
  if (!platformService.isElectron) return fileName
  return outputPathType.value === 'source' ? platformService.join(platformService.dirname(file.path), fileName) : platformService.join(outputDir.value, fileName)
}

const getOutputWidth = (resolution: string) => parseInt(String(resolution || '').split(/[x×脳]/)[0]) || 320

const exportGifClip = async (file: any, clip?: any) => {
  const fpsValue = clip?.fps && clip.fps !== 'auto'
    ? clip.fps
    : (file.fps && file.fps !== 'auto' ? file.fps : (fps.value === 'auto' ? 10 : fps.value))
  const widthValue = clip?.width || getOutputWidth(file.outputResolution)
  const speedValue = clip?.speed ? parseFloat(clip.speed) : (file.speed ? parseFloat(file.speed) : parseFloat(speed.value))
  const startTime = clip ? clip.startTime : (file.startTime || 0)
  const endTime = clip ? clip.endTime : file.endTime
  const duration = endTime ? endTime - startTime : undefined

  await platformService.convertVideo({
    id: file.id,
    inputPath: file.path,
    outputPath: getOutputPath(file, clip?.name || file.outputName),
    fps: fpsValue,
    width: widthValue,
    speed: speedValue,
    startTime: startTime > 0 ? startTime : undefined,
    duration,
    type: 'video-to-gif'
  })
}

const runGifConversion = async (file: any) => {
  if (file.status === 'converting') return false
  file.status = 'converting'; file.progress = 0
  try {
    const clips = Array.isArray(file.clips) ? file.clips : []
    if (clips.length > 0) {
      for (let i = 0; i < clips.length; i++) {
        await exportGifClip(file, clips[i])
        file.progress = Math.round(((i + 1) / clips.length) * 100)
      }
    } else {
      await exportGifClip(file)
    }
    file.status = 'completed'; file.progress = 100
    return true
  } catch (err) {
    file.status = 'error'
    console.error('转换失败:', err)
    return false
  }
}

const convertToGif = async (file: any, showDialog = true) => {
  await checkAuthAndExecute(async () => {
    await runGifConversion(file)
  })
}

const convertAll = async () => {
  await checkAuthAndExecute(async () => {
    const pendingFiles = files.value.filter(f => f.status === 'pending' || f.status === 'error')
    let completedCount = 0
    for (const file of pendingFiles) { 
      if (await runGifConversion(file)) completedCount++
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

.gif-item {
  display: flex; align-items: center; gap: 16px; padding: 16px;
  background: #fff; border-radius: 12px; margin-bottom: 12px; border: 1px solid #f0f0f0; position: relative;
  &.converting { border-color: #36d1c4; background: #fafffe; }
  &.completed { border-color: #36d1c4; }
  &.error { border-color: #f56c6c; }

  .thumbnail {
    width: 120px; height: 80px; background: #e8f8f6; border-radius: 8px;
    position: relative; overflow: hidden; cursor: pointer; flex-shrink: 0;
    img { height: 100%; width: auto; max-width: none; object-fit: contain; display: block; margin: 0 auto; }
    .video-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .play-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.3); opacity: 0; transition: opacity 0.2s; }
    &:hover .play-overlay { opacity: 1; }
    .duration, .size { position: absolute; bottom: 6px; background: rgba(0,0,0,0.6); color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
    .duration { left: 6px; } .size { right: 6px; }
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
  .options-row { display: flex; align-items: center; gap: 24px;
    .option-item { display: flex; align-items: center; gap: 8px; .label { font-size: 13px; color: #666; } .option-select { width: 120px; } }
    .action-area { margin-left: auto; .action-btn { background: #36d1c4; border-color: #36d1c4; padding: 14px 40px; border-radius: 24px; } }
  }
  .path-row { .output-path { display: flex; align-items: center; gap: 12px; .label { font-size: 13px; color: #666; } .path-select { width: 200px; } .folder-btn { padding: 8px 12px; border: none; background: transparent; &:hover { background: #e8f8f6; } } } }
}

// 瑁佸壀寮圭獥鏍峰紡
.crop-dialog {
  :deep(.el-dialog__header) { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
  :deep(.el-dialog__body) { padding: 0; }
  :deep(.el-dialog__footer) { padding: 16px 20px; border-top: 1px solid #f0f0f0; }
  
  .crop-content {
    display: flex; height: 580px;
    
    .video-section {
      flex: 1; padding: 20px; background: #f8fffe; display: flex; flex-direction: column;
      
      .video-container {
        flex: 1; background: #1a1a1a; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;
        video { max-width: 100%; max-height: 100%; }
        .video-fallback {
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;
          .fallback-thumbnail { max-width: 100%; max-height: 280px; border-radius: 8px; }
          .fallback-icon { padding: 40px; background: rgba(54, 209, 196, 0.1); border-radius: 50%; margin-bottom: 16px; }
          .fallback-tip { color: #999; font-size: 13px; text-align: center; margin-top: 12px; }
        }
      }
      
      .video-controls {
        padding: 12px 0;
        
        .range-slider-container {
          position: relative; height: 32px; margin: 8px 0; cursor: pointer;
          
          .slider-track {
            position: absolute; top: 50%; left: 0; right: 0; height: 6px;
            background: #d0d0d0; border-radius: 3px; transform: translateY(-50%);
          }
          
          .slider-selection {
            position: absolute; top: 50%; height: 6px; background: rgba(147, 112, 219, 0.5);
            border-radius: 3px; transform: translateY(-50%);
          }
          
          .slider-progress {
            position: absolute; top: 50%; left: 0; height: 6px;
            background: #36d1c4; border-radius: 3px; transform: translateY(-50%);
            pointer-events: none;
          }
          
          .slider-handle {
            position: absolute; top: 50%; width: 6px; height: 24px;
            background: #9370db; border-radius: 3px; cursor: ew-resize;
            transform: translate(-50%, -50%); z-index: 2;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            
            &:hover { background: #7b5fc7; }
            &::after {
              content: ''; position: absolute; top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: 2px; height: 10px; background: rgba(255,255,255,0.6);
              border-radius: 1px;
            }
          }
          
          .slider-playhead {
            position: absolute; top: 50%; width: 4px; height: 32px;
            background: #36d1c4; border-radius: 2px; cursor: ew-resize;
            transform: translate(-50%, -50%); z-index: 3;
            box-shadow: 0 1px 4px rgba(54, 209, 196, 0.4);
            
            &::before {
              content: ''; position: absolute; top: -6px; left: 50%;
              transform: translateX(-50%);
              border-left: 6px solid transparent; border-right: 6px solid transparent;
              border-top: 8px solid #36d1c4;
            }
          }
        }
        
        .time-display {
          display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
          span { font-size: 13px; color: #666; font-family: monospace; }
          .play-btn { border-color: #36d1c4; }
        }
      }
      
      .time-inputs {
        display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid #e8e8e8;
        .time-input-group {
          display: flex; align-items: center; gap: 8px;
          .label { font-size: 13px; color: #666; }
          .time-input { width: 120px; }
        }
        .add-clip-btn {
          margin-left: auto; background: #36d1c4; border-color: #36d1c4;
          display: flex; align-items: center; gap: 6px;
        }
      }
      
      .detail-settings {
        padding-top: 12px;
        .settings-header {
          font-size: 13px; color: #36d1c4; font-weight: 500; margin-bottom: 12px;
          padding-left: 8px; border-left: 3px solid #36d1c4;
        }
        .settings-row {
          display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
          .setting-item {
            display: flex; align-items: center; gap: 8px;
            .label { font-size: 12px; color: #666; min-width: 45px; }
            :deep(.el-input-number) { width: 90px; }
            :deep(.el-select) { width: 110px; }
            &.scale-item {
              flex: 1;
              .scale-slider { flex: 1; min-width: 80px; margin: 0 8px; }
              .scale-input { width: 70px; }
              .unit { font-size: 12px; color: #999; }
            }
          }
        }
      }
    }
    
    .clips-section {
      width: 280px; background: #fff; border-left: 1px solid #f0f0f0; display: flex; flex-direction: column;
      
      .clips-header {
        padding: 16px; font-size: 14px; color: #333; font-weight: 500; border-bottom: 1px solid #f0f0f0;
      }
      
      .clips-list {
        flex: 1; overflow-y: auto; padding: 12px;
        
        .clip-item {
          background: #f8fffe; border: 1px solid #e8f8f6; border-radius: 8px; padding: 12px; margin-bottom: 10px;
          display: flex; justify-content: space-between; align-items: flex-start;
          
          .clip-info {
            flex: 1;
            .clip-name { font-size: 13px; color: #333; margin-bottom: 8px; word-break: break-all; }
            .clip-meta {
              display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
              .meta-label { font-size: 11px; color: #36d1c4; }
              .meta-value { font-size: 11px; color: #666; }
            }
          }
          
          .clip-actions {
            display: flex; flex-direction: column; gap: 4px;
            .el-button { padding: 4px; }
          }
        }
        
        .empty-clips {
          text-align: center; color: #999; font-size: 13px; padding: 40px 0;
        }
      }
    }
  }
}

@media (max-width: 820px) {
  .file-list { padding: 0 12px; }

  .gif-item {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    .thumbnail {
      width: 100%;
      height: 180px;
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
    .path-row {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .option-item {
      display: grid;
      grid-template-columns: 72px 1fr;
      align-items: center;
      gap: 10px;
    }

    .action-area {
      margin-left: 0;
      order: 10;
    }

    .action-btn,
    .path-select,
    .option-select,
    .folder-btn {
      width: 100%;
    }

    .action-btn {
      justify-content: center;
      min-height: 46px;
      border-radius: 12px;
    }

    .output-path {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 10px;
      align-items: center;
    }

    .label {
      white-space: nowrap;
    }
  }

  .content-area :deep(.drop-zone) {
    min-height: 240px;
  }

  .content-area :deep(.drop-zone .drop-content) {
    padding: 8px 18px 0;
  }

  .content-area :deep(.drop-zone .drop-icon) {
    margin-bottom: 14px;
  }

  .content-area :deep(.drop-zone .folder-wrapper) {
    width: 122px;
    height: 96px;
  }

  .content-area :deep(.drop-zone .drop-text) {
    font-size: 18px;
    line-height: 1.6;
    color: #1f2937;
    font-weight: 700;
  }
}
</style>

