<template>
  <!-- VideoWatermark v3 -->
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
          <div v-for="file in files" :key="file.id" class="watermark-item">
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
              <div v-else class="video-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="#36d1c4"><path d="M8 5v14l11-7z"/></svg></div>
              <div class="duration">{{ file.duration }}</div>
              <div class="size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-info">
              <div class="filename">{{ file.name }}</div>
              <div class="meta-row"><span class="tag">{{ $t('common.format') }}</span><span class="value">{{ file.format?.toUpperCase() }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.resolution') }}</span><span class="value">{{ file.resolution }}</span></div>
            </div>
            <div class="arrow">→</div>
            <div class="output-info">
              <div class="filename-row">
                <span v-if="!file.isEditing" class="filename" @click="startEditName(file)">{{ file.outputName }}</span>
                <el-input v-else v-model="file.editingName" size="small" class="edit-input" @blur="confirmEditName(file)" @keyup.enter="confirmEditName(file)" @keyup.escape="cancelEditName(file)" />
                <svg v-if="!file.isEditing" viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4" class="edit-icon" @click="startEditName(file)"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <div class="meta-row"><span class="tag">{{ $t('common.format') }}</span><span class="value">{{ file.outputFormat?.toUpperCase() }}</span></div>
              <div class="meta-row"><span class="tag">{{ $t('common.resolution') }}</span><span class="value">{{ file.outputResolution || file.resolution }}</span></div>
              <!-- 进度条显示 -->
              <div v-if="file.status === 'converting'" class="progress-section">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
                </div>
                <span class="progress-text">{{ $t('common.processing') }} {{ file.progress }}%</span>
              </div>
              <div v-else-if="file.status === 'completed'" class="status-text success">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#67c23a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                {{ $t('common.processSuccess') }}
              </div>
              <div v-else-if="file.status === 'error'" class="status-text error">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#f56c6c"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                {{ file.errorMsg || $t('common.processFailed') }}
              </div>
            </div>
            <div class="right-actions">
              <div class="watermark-links">
                <a class="link" @click="openRemoveWatermark(file)"><svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>{{ $t('common.removeWatermark') }}</a>
                <a class="link" @click="openAddWatermark(file)"><svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4"><circle cx="12" cy="12" r="3"/></svg>{{ $t('common.addWatermark') }}</a>
              </div>
              <div class="action-btns">
                <el-button class="setting-btn" size="small" circle @click="openSettings(file)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                </el-button>
                <el-button :type="file.status === 'converting' ? 'danger' : 'primary'" size="small" :class="['process-btn', { 'cancel-btn': file.status === 'converting' }]" @click="file.status === 'converting' ? cancelFile(file) : processFile(file)">
                  {{ file.status === 'converting' ? $t('common.cancel') : $t('common.process') }}
                </el-button>
              </div>
              <span class="delete-btn" @click="deleteFile(file)">×</span>
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

    <ActionBar :action-text="$t('common.processAll')" :action-disabled="batchActionDisabled" :current-format="outputFormat" @action="processAll" @show-settings="openSettings()" @output-path-change="handleOutputPathChange" />
    <SettingsDialog
      v-model="showSettingsDialog"
      type="video"
      format-scope="video"
      :initial-format="initialFormatForDialog"
      :initial-settings="initialSettingsForDialog"
      @confirm="handleSettingsConfirm"
      @close="showSettingsDialog = false"
    />

    <!-- 添加水印弹窗 -->
    <el-dialog v-model="showWatermarkDialog" :title="$t('common.addWatermark')" width="950px" :close-on-click-modal="false" class="watermark-dialog">
      <div class="dialog-content">
        <div class="video-preview">
          <div class="video-container" ref="videoContainerRef">
            <div class="video-wrapper" ref="videoWrapperRef" :style="videoWrapperStyle">
              <video ref="videoRef" :src="watermarkPreviewSrc" @loadedmetadata="onVideoLoaded" @timeupdate="onTimeUpdate"></video>
              <div class="watermark-layer" ref="watermarkLayerRef">
              <template v-for="(wm, idx) in watermarkList" :key="idx">
                <template v-if="wm.position === 'tile'">
                  <div v-for="(pos, tileIdx) in getTilePositions(wm)" :key="`tile-${idx}-${tileIdx}`" class="watermark-preview tile-item" :style="getTileWatermarkStyle(wm, pos)">
                    <img v-if="wm.type === 'image'" :src="wm.src" :style="getImageWatermarkStyle(wm)" @load="rememberImageSize($event, wm)" />
                    <span v-else class="text-watermark" :style="getTextWatermarkStyle(wm)">{{ wm.text }}</span>
                  </div>
                </template>
                <template v-else-if="wm.position === 'grid'">
                  <div v-for="(pos, gridIdx) in getGridPositions()" :key="`grid-${idx}-${gridIdx}`" class="watermark-preview grid-item" :style="getGridWatermarkStyle(wm, pos)">
                    <img v-if="wm.type === 'image'" :src="wm.src" :style="getImageWatermarkStyle(wm)" @load="rememberImageSize($event, wm)" />
                    <span v-else class="text-watermark" :style="getTextWatermarkStyle(wm)">{{ wm.text }}</span>
                  </div>
                </template>
                <div v-else class="watermark-preview custom-item" :class="{ selected: selectedWatermark === idx }" :style="getWatermarkStyle(wm)" @mousedown="startDrag($event, wm, idx)">
                  <img v-if="wm.type === 'image'" :src="wm.src" :style="getImageWatermarkStyle(wm)" @load="rememberImageSize($event, wm)" />
                  <span v-else class="text-watermark" :style="getTextWatermarkStyle(wm)">{{ wm.text }}</span>
                  <div class="selection-box" v-if="selectedWatermark === idx">
                    <div class="corner top-left"></div><div class="corner top-right"></div><div class="corner bottom-left"></div><div class="corner bottom-right"></div>
                  </div>
                </div>
              </template>
              </div>
            </div>
          </div>
          <div class="video-progress"><el-slider v-model="currentTime" :max="videoDuration" :show-tooltip="false" @change="seekTo" /></div>
          <div class="video-controls">
            <span class="time">{{ formatTime(currentTime) }}/{{ formatTime(videoDuration) }}</span>
            <div class="control-btns">
              <el-button text @click="seekBackward"><svg viewBox="0 0 24 24" width="20" height="20" fill="#666"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg></el-button>
              <el-button text @click="togglePlay"><svg viewBox="0 0 24 24" width="28" height="28" fill="#36d1c4"><path :d="isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'"/></svg></el-button>
              <el-button text @click="seekForward"><svg viewBox="0 0 24 24" width="20" height="20" fill="#666"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg></el-button>
            </div>
          </div>
        </div>
        <div class="watermark-settings">
          <div class="add-btns">
            <el-button class="add-btn" @click="addImageWatermark"><svg viewBox="0 0 24 24" width="16" height="16" fill="#36d1c4"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>{{ $t('common.addImage') }}</el-button>
            <el-button class="add-btn" @click="addTextWatermark"><svg viewBox="0 0 24 24" width="16" height="16" fill="#36d1c4"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>{{ $t('common.addText') }}</el-button>
            <el-button text class="clear-btn" @click="clearWatermarks">{{ $t('common.clear') }}</el-button>
          </div>
          <div class="watermark-list">
            <div v-for="(wm, idx) in watermarkList" :key="idx" class="wm-item" :class="{ active: selectedWatermark === idx }" @click="selectedWatermark = idx">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              <span class="wm-name">{{ wm.type === 'image' ? wm.name : wm.text }}</span>
              <span class="wm-time">{{ watermarkTimeLabel(wm) }}</span>
              <span class="wm-delete" @click.stop="removeWatermark(idx)">×</span>
            </div>
          </div>
          <div class="settings-section" v-if="selectedWatermark !== null && watermarkList[selectedWatermark]">
            <h4>{{ $t('common.watermarkSettings') }}</h4>
            <template v-if="watermarkList[selectedWatermark].type === 'text'">
              <div class="text-toolbar">
                <el-select v-model="watermarkList[selectedWatermark].fontFamily" size="small" class="font-select">
                  <el-option label="A" value="Arial" /><el-option :label="t('common.microsoftYaHei')" value="Microsoft YaHei" /><el-option :label="t('common.simSun')" value="SimSun" />
                </el-select>
                <el-input-number v-model="watermarkList[selectedWatermark].fontSize" :min="8" :max="200" size="small" class="font-size-input" />
                <div class="text-style-btns">
                  <el-button :type="watermarkList[selectedWatermark].bold ? 'primary' : 'default'" size="small" @click="watermarkList[selectedWatermark].bold = !watermarkList[selectedWatermark].bold">B</el-button>
                  <el-button :type="watermarkList[selectedWatermark].underline ? 'primary' : 'default'" size="small" @click="watermarkList[selectedWatermark].underline = !watermarkList[selectedWatermark].underline" class="underline-btn">U</el-button>
                  <el-button :type="watermarkList[selectedWatermark].italic ? 'primary' : 'default'" size="small" @click="watermarkList[selectedWatermark].italic = !watermarkList[selectedWatermark].italic" class="italic-btn">I</el-button>
                </div>
              </div>
              <div class="text-input-area"><el-input v-model="watermarkList[selectedWatermark].text" type="textarea" :rows="3" :placeholder="$t('common.inputWatermarkText')" /></div>
            </template>
            <div class="setting-row" v-if="watermarkList[selectedWatermark].type === 'image'">
              <span class="setting-label">{{ $t('common.imageSize') }}</span>
              <el-slider v-model="watermarkList[selectedWatermark].scale" :min="10" :max="200" class="setting-slider" />
              <el-input-number v-model="watermarkList[selectedWatermark].scale" :min="10" :max="200" size="small" class="setting-input" /><span class="unit">%</span>
            </div>
            <div class="setting-row"><span class="setting-label">{{ $t('common.rotationAngle') }}</span><el-slider v-model="watermarkList[selectedWatermark].rotation" :min="-180" :max="180" class="setting-slider" /><el-input-number v-model="watermarkList[selectedWatermark].rotation" :min="-180" :max="180" size="small" class="setting-input" /><span class="unit">{{ t('common.unitDegree') }}</span></div>
            <div class="setting-row"><span class="setting-label">{{ $t('common.opacity') }}</span><el-slider v-model="watermarkList[selectedWatermark].opacity" :min="0" :max="100" class="setting-slider" /><el-input-number v-model="watermarkList[selectedWatermark].opacity" :min="0" :max="100" size="small" class="setting-input" /><span class="unit">%</span></div>
            <div class="setting-row"><span class="setting-label">{{ $t('common.position') }}</span><el-radio-group v-model="watermarkList[selectedWatermark].position"><el-radio value="custom">{{ $t('common.custom') }}</el-radio><el-radio value="tile">{{ $t('common.tile') }}</el-radio><el-radio value="grid">{{ $t('common.grid') }}</el-radio></el-radio-group></div>
            <div class="setting-row"><span class="setting-label">{{ $t('common.selectTime') }}</span><el-input v-model="watermarkList[selectedWatermark].startTimeStr" size="small" class="time-input" placeholder="00:00:00" @input="syncWatermarkTime(watermarkList[selectedWatermark])" /><span class="time-sep">—</span><el-input v-model="watermarkList[selectedWatermark].endTimeStr" size="small" class="time-input" placeholder="00:00:00" @input="syncWatermarkTime(watermarkList[selectedWatermark])" /></div>
          </div>
        </div>
      </div>
      <template #footer><el-button @click="showWatermarkDialog = false">{{ $t('common.cancel') }}</el-button><el-button type="primary" @click="saveWatermark">{{ $t('common.save') }}</el-button></template>
    </el-dialog>

    <QRUploadDialog v-model="showQRUpload" @files-uploaded="handleFilesUploaded" />
    <M3U8Dialog v-model="showURLDialog" @download-complete="handleURLDownloaded" />
    <AuthCodeDialog v-model="showAuthDialog" @success="handleAuthSuccess" />

    <!-- 去除水印弹窗 -->
    <el-dialog v-model="showRemoveWatermarkDialog" :title="$t('common.removeWatermark')" width="950px" :close-on-click-modal="false" class="remove-watermark-dialog">
      <div class="dialog-content">
        <div class="video-preview">
          <div class="video-container" ref="removeVideoContainerRef">
            <div class="video-wrapper" ref="removeVideoWrapperRef" :style="removeVideoWrapperStyle">
              <video ref="removeVideoRef" :src="removePreviewSrc" @loadedmetadata="onRemoveVideoLoaded" @timeupdate="onRemoveTimeUpdate"></video>
              <!-- 水印区域选择层 -->
              <div class="watermark-select-layer" ref="watermarkSelectLayerRef" @mousedown="startSelectArea">
                <!-- 已选择的水印区域 -->
                <div v-for="(area, idx) in removeAreaList" :key="idx" class="remove-area" :class="{ selected: selectedRemoveArea === idx }" :style="getRemoveAreaStyle(area)" @mousedown.stop="selectArea($event, idx)">
                  <div class="area-label">{{ $t('common.area') }} {{ idx + 1 }}</div>
                  <div class="resize-handle se" @mousedown.stop="startResize($event, idx, 'se')"></div>
                  <span class="area-delete" @click.stop="deleteRemoveArea(idx)">×</span>
                </div>
                <!-- 正在绘制的区域 -->
                <div v-if="isDrawing" class="remove-area drawing" :style="drawingAreaStyle"></div>
              </div>
            </div>
          </div>
          <div class="video-progress"><el-slider v-model="removeCurrentTime" :max="removeVideoDuration" :show-tooltip="false" @change="seekRemoveTo" /></div>
          <div class="video-controls">
            <span class="time">{{ formatTime(removeCurrentTime) }}/{{ formatTime(removeVideoDuration) }}</span>
            <div class="control-btns">
              <el-button text @click="seekRemoveBackward"><svg viewBox="0 0 24 24" width="20" height="20" fill="#666"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg></el-button>
              <el-button text @click="toggleRemovePlay"><svg viewBox="0 0 24 24" width="28" height="28" fill="#36d1c4"><path :d="isRemovePlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'"/></svg></el-button>
              <el-button text @click="seekRemoveForward"><svg viewBox="0 0 24 24" width="20" height="20" fill="#666"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg></el-button>
            </div>
          </div>
        </div>
        <div class="remove-settings">
          <div class="tips-section">
            <div class="tip-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="#36d1c4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>{{ $t('common.usageInstructions') }}</div>
            <ul class="tip-list">
              <li>{{ t('common.selectAreaTip') }}</li>
              <li>{{ t('common.multipleAreasTip') }}</li>
              <li>{{ t('common.adjustPositionTip') }}</li>
              <li>{{ t('common.adjustSizeTip') }}</li>
            </ul>
          </div>
          <div class="area-list-section">
            <div class="section-header">
              <span>{{ t('common.selectedAreas') }} ({{ removeAreaList.length }})</span>
              <el-button text size="small" class="clear-btn" @click="clearRemoveAreas" :disabled="!removeAreaList.length">{{ t('common.clear') }}</el-button>
            </div>
            <div class="area-list">
              <div v-for="(area, idx) in removeAreaList" :key="idx" class="area-item" :class="{ active: selectedRemoveArea === idx }" @click="selectedRemoveArea = idx">
                <span class="area-name">{{ t('common.area') }} {{ idx + 1 }}</span>
                <span class="area-size">{{ Math.round(area.width) }} × {{ Math.round(area.height) }}</span>
                <span class="area-delete-btn" @click.stop="deleteRemoveArea(idx)">×</span>
              </div>
              <div v-if="!removeAreaList.length" class="empty-tip">{{ t('common.emptyAreaTip') }}</div>
            </div>
          </div>
          <div class="mode-section">
            <div class="section-header">{{ t('common.removeMode') }}</div>
            <el-radio-group v-model="removeMode">
              <el-radio value="blur">{{ t('common.blur') }}</el-radio>
              <el-radio value="color">{{ t('common.color') }}</el-radio>
            </el-radio-group>
            <div v-if="removeMode === 'color'" class="color-picker">
              <span class="label">{{ t('common.fillColor') }}</span>
              <el-color-picker v-model="removeFillColor" size="small" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showRemoveWatermarkDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveRemoveWatermark" :disabled="!removeAreaList.length">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFileStore } from '@/stores/fileStore'
import { storeToRefs } from 'pinia'
import { useAuthCheck } from '@/composables/useAuthCheck'
import { handleDragDropEvent, VIDEO_EXTENSIONS } from '@/utils/dragDropUtils'
import TopToolbar from '@/components/TopToolbar.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import ActionBar from '@/components/ActionBar.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import QRUploadDialog from '@/components/QRUploadDialog.vue'
import M3U8Dialog from '@/components/M3U8Dialog.vue'
import AuthCodeDialog from '@/components/AuthCodeDialog.vue'
import { platformService } from '@/services/platformService'
import { getWebVideoMeta } from '@/utils/webMediaMeta'
import { useSelectableFiles } from '@/composables/useSelectableFiles'
import {
  beginConversionRun,
  finishCancelledConversion,
  isConversionCancelRequested,
  isCurrentConversionRun,
  requestConversionCancel,
} from '@/utils/conversionCancel'
import {
  buildOutputName,
  isFileOutputCustomized,
  markFileOutputCustomized,
  resetFileOutputStatus,
} from '@/utils/outputSettings'
import {
  gridLayout,
  imageTileLayout,
  layoutPositions,
  textTileLayout,
} from '@/utils/watermarkLayout'

const { t } = useI18n()

const fileStore = useFileStore()
const { videoWatermarkFiles: files } = storeToRefs(fileStore)
const { showAuthDialog, checkAuthAndExecute, handleAuthSuccess } = useAuthCheck()

const outputFormat = ref('mp4')
const outputPathType = ref('default')
const outputDir = ref('')
const showQRUpload = ref(false)
const showURLDialog = ref(false)
const isDragging = ref(false)

const showWatermarkDialog = ref(false)
const currentFile = ref<any>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const videoContainerRef = ref<HTMLElement | null>(null)
const videoWrapperRef = ref<HTMLElement | null>(null)
const watermarkLayerRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const videoDuration = ref(0)
const watermarkList = ref<any[]>([])
const selectedWatermark = ref<number | null>(null)
const videoSize = ref({ width: 0, height: 0 })
const videoWrapperStyle = ref<any>({})
const showSettingsDialog = ref(false)
const defaultVideoSettings = {
  resolution: 'auto',
  width: 0,
  height: 0,
}
const watermarkSettings = ref<any>({ ...defaultVideoSettings })
const currentEditingSettingsFile = ref<any>(null)
const initialSettingsForDialog = ref<any>(watermarkSettings.value)
const initialFormatForDialog = ref(outputFormat.value)
const getPreviewSrc = (file: any) => {
  if (!file) return ''
  if (!platformService.isElectron && file.previewUrl) return file.previewUrl
  return file.path ? `file://${file.path}` : ''
}
const watermarkPreviewSrc = computed(() => getPreviewSrc(currentFile.value))

// 去水印相关
const showRemoveWatermarkDialog = ref(false)
const removeCurrentFile = ref<any>(null)
const removeVideoRef = ref<HTMLVideoElement | null>(null)
const removeVideoContainerRef = ref<HTMLElement | null>(null)
const removeVideoWrapperRef = ref<HTMLElement | null>(null)
const watermarkSelectLayerRef = ref<HTMLElement | null>(null)
const isRemovePlaying = ref(false)
const removeCurrentTime = ref(0)
const removeVideoDuration = ref(0)
const removeVideoSize = ref({ width: 0, height: 0 })
const removeVideoWrapperStyle = ref<any>({})
const removeAreaList = ref<any[]>([])
const selectedRemoveArea = ref<number | null>(null)
const removeMode = ref('blur')
const removeFillColor = ref('#000000')
const removePreviewSrc = computed(() => getPreviewSrc(removeCurrentFile.value))

// 绘制区域相关
const isDrawing = ref(false)
const drawStartX = ref(0)
const drawStartY = ref(0)
const drawCurrentX = ref(0)
const drawCurrentY = ref(0)
const drawingAreaStyle = ref<any>({})

const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm', '3gp', 'ts', 'm2ts']
const hasWatermarkAction = (file: any) => Boolean(file.removeAreas?.length || file.watermarks?.length)
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
} = useSelectableFiles(files, {
  isReady: file => file.status !== 'converting' && hasWatermarkAction(file),
})

onMounted(async () => {
  outputDir.value = await platformService.getDefaultOutputDir()
  // 监听水印处理进度
  platformService.onConvertProgress((data: { id: string; percent: number }) => {
    const file = files.value.find(f => f.id === data.id)
    if (file && file.status === 'converting') {
      file.progress = Math.round(data.percent)
    }
  }, 'watermark-progress')
})

onUnmounted(() => {
  platformService.removeConvertProgressListeners('watermark-progress')
})

const formatDuration = (seconds: number) => { const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` }
const formatTime = (seconds: number) => { const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60); return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` }
const formatSize = (bytes: number) => { if (!bytes) return '0B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i] }
const clonePlain = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const cloneSettings = (settings: any) => ({ ...defaultVideoSettings, ...clonePlain(settings || {}) })
const resolveOutputResolution = (sourceResolution: string, settings: any) => {
  if (settings?.width && settings?.height) return `${settings.width}x${settings.height}`
  if (settings?.resolution && settings.resolution !== 'auto' && !String(settings.resolution).startsWith('custom')) return settings.resolution
  return sourceResolution || ''
}
const parseTimeInput = (value: string, fallback = 0) => {
  const parts = String(value || '').trim().split(':').map(Number)
  if (parts.some(Number.isNaN)) return fallback
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return fallback
}
const syncWatermarkTime = (wm: any) => {
  if (!wm) return
  wm.startTime = Math.max(0, Math.min(videoDuration.value || Infinity, parseTimeInput(wm.startTimeStr, wm.startTime || 0)))
  wm.endTime = Math.max(wm.startTime, Math.min(videoDuration.value || Infinity, parseTimeInput(wm.endTimeStr, wm.endTime || videoDuration.value || 0)))
}
const syncAllWatermarkTimes = () => watermarkList.value.forEach(syncWatermarkTime)
const watermarkTimeLabel = (wm: any) => `${wm.startTimeStr || formatTime(wm.startTime || 0)} - ${wm.endTimeStr || formatTime(wm.endTime || 0)}`

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

const startEditName = (file: any) => { file.isEditing = true; file.editingName = file.outputName; nextTick(() => { const input = document.querySelector('.edit-input .el-input__inner') as HTMLInputElement; if (input) { input.focus(); input.select() } }) }
const confirmEditName = (file: any) => { if (file.editingName?.trim()) { const ext = file.outputFormat || outputFormat.value; let newName = file.editingName.trim(); if (!newName.toLowerCase().endsWith(`.${ext}`)) newName = newName.replace(/\.[^.]+$/, '') + `.${ext}`; file.outputName = newName }; file.isEditing = false }
const cancelEditName = (file: any) => { file.isEditing = false }

const addFiles = async () => { const selectedFiles = await platformService.selectFiles([{ name: t('common.videoFiles'), extensions: videoExtensions }]); if (selectedFiles?.length) addFilesToList(selectedFiles) }
const addFolder = async () => { const selectedFiles = await platformService.selectFolder(videoExtensions); if (selectedFiles?.length) addFilesToList(selectedFiles) }

const addFilesToList = async (selectedFiles: any[]) => {
  for (let i = 0; i < selectedFiles.length; i++) {
    const f = selectedFiles[i]; let filePath = '', fileName = '', fileId = ''
    let browserFile: File | null = null
    if (typeof f === 'string') { filePath = f; fileName = platformService.basename(f); fileId = `${Date.now()}-${i}` } else { filePath = f.path || ''; fileName = f.name || ''; fileId = f.id || `${Date.now()}-${i}`; browserFile = f.file instanceof File ? f.file : (f instanceof File ? f : null) }
    if (!filePath && !f.id) continue
    if (files.value.some(file => file.path === filePath || file.id === f.id)) continue
    let videoInfo: any = {}, thumbnail = ''
    if (!platformService.isElectron && browserFile) {
      const webMeta = await getWebVideoMeta(browserFile)
      videoInfo = { duration: webMeta.duration, size: browserFile.size }
      thumbnail = webMeta.thumbnail
    } else {
      try { videoInfo = await platformService.getVideoInfo(filePath) } catch (e) {}
      try { thumbnail = await platformService.getVideoThumbnail(filePath) } catch (e) {}
    }
    const sourceResolution = videoInfo.width && videoInfo.height ? `${videoInfo.width}x${videoInfo.height}` : ''
    files.value.push({ id: fileId, name: fileName, path: filePath, previewUrl: browserFile ? URL.createObjectURL(browserFile) : '', format: platformService.extname(fileName).slice(1), outputName: buildOutputName(fileName, '_watermark', outputFormat.value), outputFormat: outputFormat.value, resolution: sourceResolution, outputResolution: resolveOutputResolution(sourceResolution, watermarkSettings.value), settings: cloneSettings(watermarkSettings.value), hasCustomOutputSettings: false, duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '00:00', durationSec: videoInfo.duration || 0, size: videoInfo.size, thumbnail, status: 'pending', progress: 0, watermarks: [], isEditing: false, editingName: '' })
  }
}

const handleFilesSelected = addFilesToList

const clearFiles = () => { files.value = []; clearSelection() }
const deleteFile = (file: any) => { files.value = files.value.filter(f => f.id !== file.id); removeSelection(file) }
const cancelFile = async (file: any) => {
  if (file.status !== 'converting') return
  requestConversionCancel(file, { clearErrorMessage: true })
  try {
    await platformService.cancelConvert(file.id)
  } catch (error) {
    console.error('取消水印处理失败:', error)
  }
}
const openSettings = (file?: any) => {
  currentEditingSettingsFile.value = file || null
  initialSettingsForDialog.value = file ? cloneSettings(file.settings || watermarkSettings.value) : cloneSettings(watermarkSettings.value)
  initialFormatForDialog.value = file?.outputFormat || outputFormat.value
  showSettingsDialog.value = true
}
const applyWatermarkOutputSettings = (file: any, format: string, settings: any, customized: boolean) => {
  const nextFormat = format.toLowerCase()
  const nextSettings = cloneSettings(settings)
  file.outputFormat = nextFormat
  file.outputName = buildOutputName(file.name, '_watermark', nextFormat)
  file.settings = nextSettings
  file.outputResolution = resolveOutputResolution(file.resolution, nextSettings)
  markFileOutputCustomized(file, customized)
  resetFileOutputStatus(file)
}
const handleSettingsConfirm = (data: any) => {
  const nextFormat = data.format.toLowerCase()
  const nextSettings = cloneSettings(data.settings)

  if (currentEditingSettingsFile.value) {
    applyWatermarkOutputSettings(currentEditingSettingsFile.value, nextFormat, nextSettings, true)
    return
  }

  outputFormat.value = nextFormat
  watermarkSettings.value = nextSettings
  files.value.forEach(f => {
    if (!isFileOutputCustomized(f)) applyWatermarkOutputSettings(f, nextFormat, watermarkSettings.value, false)
  })
}
const handleOutputPathChange = (data: { type: string; path: string }) => { outputPathType.value = data.type; if (data.path) outputDir.value = data.path }

const openAddWatermark = (file: any) => { currentFile.value = file; watermarkList.value = file.watermarks?.length ? clonePlain(file.watermarks) : []; selectedWatermark.value = watermarkList.value.length > 0 ? 0 : null; videoDuration.value = file.durationSec || 0; showWatermarkDialog.value = true }
const onVideoLoaded = () => { if (videoRef.value) { videoDuration.value = videoRef.value.duration; setTimeout(() => updateVideoSize(), 100) } }
const updateVideoSize = () => { if (!videoRef.value || !videoContainerRef.value) return; const video = videoRef.value, container = videoContainerRef.value; const containerWidth = container.clientWidth, containerHeight = container.clientHeight, videoRatio = video.videoWidth / video.videoHeight, containerRatio = containerWidth / containerHeight; let displayWidth: number, displayHeight: number; if (videoRatio > containerRatio) { displayWidth = containerWidth; displayHeight = containerWidth / videoRatio } else { displayHeight = containerHeight; displayWidth = containerHeight * videoRatio }; videoSize.value = { width: displayWidth, height: displayHeight }; videoWrapperStyle.value = { width: displayWidth + 'px', height: displayHeight + 'px' } }
const onTimeUpdate = () => { if (videoRef.value) currentTime.value = videoRef.value.currentTime }
const togglePlay = () => { if (!videoRef.value) return; if (isPlaying.value) videoRef.value.pause(); else videoRef.value.play(); isPlaying.value = !isPlaying.value }
const seekTo = (val: number) => { if (videoRef.value) videoRef.value.currentTime = val }
const seekBackward = () => { if (videoRef.value) videoRef.value.currentTime = Math.max(0, videoRef.value.currentTime - 5) }
const seekForward = () => { if (videoRef.value) videoRef.value.currentTime = Math.min(videoDuration.value, videoRef.value.currentTime + 5) }

const addImageWatermark = async () => { const selectedFiles = await platformService.selectFiles([{ name: t('common.imageFiles'), extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]); if (selectedFiles?.length) { const imgFile = selectedFiles[0]; const imgPath = imgFile.path || ''; const imgName = imgFile.name || platformService.basename(imgPath); watermarkList.value.push({ type: 'image', src: (platformService.isElectron ? 'file://' : '') + imgPath, name: imgName, path: imgPath, x: 10, y: 10, rotation: 0, opacity: 100, scale: 50, position: 'custom', startTime: 0, endTime: videoDuration.value, startTimeStr: '00:00:00', endTimeStr: formatTime(videoDuration.value) }); selectedWatermark.value = watermarkList.value.length - 1 } }
const addTextWatermark = () => { watermarkList.value.push({ type: 'text', text: t('common.inputWatermarkText'), x: 10, y: 10, rotation: 0, opacity: 100, scale: 100, position: 'custom', fontFamily: 'Arial', fontSize: 24, bold: false, underline: false, italic: false, startTime: 0, endTime: videoDuration.value, startTimeStr: '00:00:00', endTimeStr: formatTime(videoDuration.value) }); selectedWatermark.value = watermarkList.value.length - 1 }
const removeWatermark = (idx: number) => { watermarkList.value.splice(idx, 1); if (selectedWatermark.value === idx) selectedWatermark.value = watermarkList.value.length > 0 ? 0 : null }
const clearWatermarks = () => { watermarkList.value = []; selectedWatermark.value = null }

const getWatermarkStyle = (wm: any) => ({ left: wm.x + 'px', top: wm.y + 'px', transform: `rotate(${wm.rotation}deg)`, opacity: wm.opacity / 100 })
const previewFontFamily = (fontFamily?: string) => {
  const selected = fontFamily || 'Arial'
  if (selected === 'Arial') return 'Arial, "Microsoft YaHei", "SimHei", sans-serif'
  if (selected === 'SimSun' || selected === '宋体') return `${selected}, "Microsoft YaHei", serif`
  return `${selected}, "Microsoft YaHei", "SimHei", sans-serif`
}
const getTextWatermarkStyle = (wm: any) => ({ fontSize: (wm.fontSize || 24) + 'px', fontFamily: previewFontFamily(wm.fontFamily), fontWeight: wm.bold ? 'bold' : 'normal', fontStyle: wm.italic ? 'italic' : 'normal', textDecoration: wm.underline ? 'underline' : 'none' })
const getPreviewScaleX = () => {
  const actualWidth = videoRef.value?.videoWidth || videoSize.value.width || 0
  return actualWidth && videoSize.value.width ? actualWidth / videoSize.value.width : 1
}
const rememberImageSize = (event: Event, wm: any) => {
  const image = event.target as HTMLImageElement
  if (!image?.naturalWidth || !image?.naturalHeight) return
  wm.imageWidth = image.naturalWidth
  wm.imageHeight = image.naturalHeight
}
const getImageWatermarkStyle = (wm: any) => {
  const naturalWidth = Number(wm.imageWidth || 120)
  const displayWidth = Math.max(1, (naturalWidth * Number(wm.scale || 100) / 100) / getPreviewScaleX())
  return { width: displayWidth + 'px' }
}
const getTilePositions = (wm: any) => {
  const containerWidth = videoSize.value.width || 400
  const containerHeight = videoSize.value.height || 300
  return layoutPositions(wm.type === 'text' ? textTileLayout : imageTileLayout, containerWidth, containerHeight)
}
const getTileWatermarkStyle = (wm: any, pos: { x: number; y: number }) => ({ left: pos.x + 'px', top: pos.y + 'px', transform: `rotate(${wm.rotation}deg)`, opacity: wm.opacity / 100 })
const getGridPositions = () => {
  const containerWidth = videoSize.value.width || 400
  const containerHeight = videoSize.value.height || 300
  return layoutPositions(gridLayout, containerWidth, containerHeight)
}
const getGridWatermarkStyle = (wm: any, pos: { x: number; y: number }) => ({ left: pos.x + 'px', top: pos.y + 'px', transform: `rotate(${wm.rotation}deg)`, opacity: wm.opacity / 100 })
const startDrag = (e: MouseEvent, wm: any, idx: number) => { if (wm.position !== 'custom') return; selectedWatermark.value = idx; const startX = e.clientX - wm.x, startY = e.clientY - wm.y; const onMove = (ev: MouseEvent) => { wm.x = ev.clientX - startX; wm.y = ev.clientY - startY }; const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }
const serializeWatermarks = (watermarks: any[]) => watermarks.map((wm: any) => ({
  type: wm.type,
  path: wm.path,
  text: wm.text,
  x: wm.x,
  y: wm.y,
  rotation: wm.rotation,
  opacity: wm.opacity,
  scale: wm.scale,
  position: wm.position,
  fontFamily: wm.fontFamily,
  fontSize: wm.fontSize,
  bold: wm.bold,
  italic: wm.italic,
  underline: wm.underline,
  actualX: wm.actualX,
  actualY: wm.actualY,
  actualFontSize: wm.actualFontSize,
  imageWidth: wm.imageWidth,
  imageHeight: wm.imageHeight,
  startTime: parseTimeInput(wm.startTimeStr, wm.startTime || 0),
  endTime: parseTimeInput(wm.endTimeStr, wm.endTime || videoDuration.value || 0)
}))
const saveWatermark = () => {
  syncAllWatermarkTimes()
  if (currentFile.value && videoRef.value) {
    // 计算预览尺寸与视频实际尺寸的比例
    const scaleX = videoSize.value.width ? videoRef.value.videoWidth / videoSize.value.width : 1
    const scaleY = videoSize.value.height ? videoRef.value.videoHeight / videoSize.value.height : 1

    // 保存水印时，将坐标和字体大小转换为视频实际尺寸
    currentFile.value.watermarks = clonePlain(watermarkList.value.map(wm => ({
      ...wm,
      // 保存实际视频坐标
      actualX: Math.round(wm.x * scaleX),
      actualY: Math.round(wm.y * scaleY),
      // 保存实际字体大小（文字水印需要按比例放大）
      actualFontSize: wm.type === 'text' ? Math.round((wm.fontSize || 24) * scaleX) : undefined,
      // 保存缩放比例供下次编辑使用
      previewScaleX: scaleX,
      previewScaleY: scaleY
    })))
    if (currentFile.value.status === 'completed' || currentFile.value.status === 'error') {
      currentFile.value.status = 'pending'
      currentFile.value.progress = 0
    }
  } else if (currentFile.value) {
    currentFile.value.watermarks = clonePlain(watermarkList.value)
  }
  showWatermarkDialog.value = false
}

// 去水印相关函数
const openRemoveWatermark = (file: any) => {
  removeCurrentFile.value = file
  removeAreaList.value = file.removeAreas?.length ? clonePlain(file.removeAreas) : []
  selectedRemoveArea.value = removeAreaList.value.length > 0 ? 0 : null
  removeVideoDuration.value = file.durationSec || 0
  removeMode.value = file.removeMode || 'blur'
  removeFillColor.value = file.removeFillColor || '#000000'
  showRemoveWatermarkDialog.value = true
}

const onRemoveVideoLoaded = () => {
  if (removeVideoRef.value) {
    removeVideoDuration.value = removeVideoRef.value.duration
    setTimeout(() => updateRemoveVideoSize(), 100)
  }
}

const updateRemoveVideoSize = () => {
  if (!removeVideoRef.value || !removeVideoContainerRef.value) return
  const video = removeVideoRef.value
  const container = removeVideoContainerRef.value
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  const videoRatio = video.videoWidth / video.videoHeight
  const containerRatio = containerWidth / containerHeight
  let displayWidth: number, displayHeight: number
  if (videoRatio > containerRatio) {
    displayWidth = containerWidth
    displayHeight = containerWidth / videoRatio
  } else {
    displayHeight = containerHeight
    displayWidth = containerHeight * videoRatio
  }
  removeVideoSize.value = { width: displayWidth, height: displayHeight }
  removeVideoWrapperStyle.value = { width: displayWidth + 'px', height: displayHeight + 'px' }
}

const onRemoveTimeUpdate = () => { if (removeVideoRef.value) removeCurrentTime.value = removeVideoRef.value.currentTime }
const toggleRemovePlay = () => { if (!removeVideoRef.value) return; if (isRemovePlaying.value) removeVideoRef.value.pause(); else removeVideoRef.value.play(); isRemovePlaying.value = !isRemovePlaying.value }
const seekRemoveTo = (val: number) => { if (removeVideoRef.value) removeVideoRef.value.currentTime = val }
const seekRemoveBackward = () => { if (removeVideoRef.value) removeVideoRef.value.currentTime = Math.max(0, removeVideoRef.value.currentTime - 5) }
const seekRemoveForward = () => { if (removeVideoRef.value) removeVideoRef.value.currentTime = Math.min(removeVideoDuration.value, removeVideoRef.value.currentTime + 5) }

const getRemoveAreaStyle = (area: any) => ({
  left: area.x + 'px',
  top: area.y + 'px',
  width: area.width + 'px',
  height: area.height + 'px'
})

const startSelectArea = (e: MouseEvent) => {
  if (!watermarkSelectLayerRef.value) return
  const rect = watermarkSelectLayerRef.value.getBoundingClientRect()
  drawStartX.value = e.clientX - rect.left
  drawStartY.value = e.clientY - rect.top
  drawCurrentX.value = drawStartX.value
  drawCurrentY.value = drawStartY.value
  isDrawing.value = true

  const onMove = (ev: MouseEvent) => {
    drawCurrentX.value = ev.clientX - rect.left
    drawCurrentY.value = ev.clientY - rect.top
    // 更新绘制区域样式
    const x = Math.min(drawStartX.value, drawCurrentX.value)
    const y = Math.min(drawStartY.value, drawCurrentY.value)
    const width = Math.abs(drawCurrentX.value - drawStartX.value)
    const height = Math.abs(drawCurrentY.value - drawStartY.value)
    drawingAreaStyle.value = { left: x + 'px', top: y + 'px', width: width + 'px', height: height + 'px' }
  }

  const onUp = () => {
    isDrawing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)

    // 计算最终区域
    const x = Math.min(drawStartX.value, drawCurrentX.value)
    const y = Math.min(drawStartY.value, drawCurrentY.value)
    const width = Math.abs(drawCurrentX.value - drawStartX.value)
    const height = Math.abs(drawCurrentY.value - drawStartY.value)

    // 只有当区域足够大时才添加
    if (width > 10 && height > 10) {
      removeAreaList.value.push({ x, y, width, height })
      selectedRemoveArea.value = removeAreaList.value.length - 1
    }
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const selectArea = (e: MouseEvent, idx: number) => {
  selectedRemoveArea.value = idx
  const area = removeAreaList.value[idx]
  if (!watermarkSelectLayerRef.value) return

  const rect = watermarkSelectLayerRef.value.getBoundingClientRect()
  const startX = e.clientX
  const startY = e.clientY
  const startAreaX = area.x
  const startAreaY = area.y

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    area.x = Math.max(0, Math.min(removeVideoSize.value.width - area.width, startAreaX + dx))
    area.y = Math.max(0, Math.min(removeVideoSize.value.height - area.height, startAreaY + dy))
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const startResize = (e: MouseEvent, idx: number, _handle: string) => {
  e.preventDefault()
  const area = removeAreaList.value[idx]
  const startX = e.clientX
  const startY = e.clientY
  const startWidth = area.width
  const startHeight = area.height

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    area.width = Math.max(20, startWidth + dx)
    area.height = Math.max(20, startHeight + dy)
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const deleteRemoveArea = (idx: number) => {
  removeAreaList.value.splice(idx, 1)
  if (selectedRemoveArea.value === idx) {
    selectedRemoveArea.value = removeAreaList.value.length > 0 ? 0 : null
  } else if (selectedRemoveArea.value !== null && selectedRemoveArea.value > idx) {
    selectedRemoveArea.value--
  }
}

const clearRemoveAreas = () => {
  removeAreaList.value = []
  selectedRemoveArea.value = null
}

const saveRemoveWatermark = () => {
  if (removeCurrentFile.value) {
    // 将显示坐标转换为视频实际坐标
    const video = removeVideoRef.value
    if (video && removeVideoSize.value.width > 0) {
      const scaleX = video.videoWidth / removeVideoSize.value.width
      const scaleY = video.videoHeight / removeVideoSize.value.height

      removeCurrentFile.value.removeAreas = clonePlain(removeAreaList.value.map(area => ({
        x: Math.round(area.x * scaleX),
        y: Math.round(area.y * scaleY),
        width: Math.round(area.width * scaleX),
        height: Math.round(area.height * scaleY),
        // 保存显示坐标用于下次编辑
        displayX: area.x,
        displayY: area.y,
        displayWidth: area.width,
        displayHeight: area.height
      })))
    } else {
      removeCurrentFile.value.removeAreas = clonePlain(removeAreaList.value)
    }
    removeCurrentFile.value.removeMode = removeMode.value
    removeCurrentFile.value.removeFillColor = removeFillColor.value

    // 重置状态为待处理，让用户知道需要重新处理
    if (removeCurrentFile.value.status === 'completed' || removeCurrentFile.value.status === 'error') {
      removeCurrentFile.value.status = 'pending'
      removeCurrentFile.value.progress = 0
    }
  }
  showRemoveWatermarkDialog.value = false
}

const getOutputPath = (file: any) => {
  if (!platformService.isElectron) return file.outputName
  return outputPathType.value === 'source' ? platformService.join(platformService.dirname(file.path), file.outputName) : platformService.join(outputDir.value, file.outputName)
}

const executeWatermarkTask = async (file: any) => {
  const hasRemoveAreas = file.removeAreas && file.removeAreas.length > 0
  const hasWatermarks = file.watermarks && file.watermarks.length > 0

  if (hasRemoveAreas) {
    await platformService.removeWatermark({
      id: file.id,
      inputPath: file.path,
      outputPath: getOutputPath(file),
      areas: file.removeAreas.map((area: any) => ({
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height
      })),
      mode: file.removeMode || 'blur',
      fillColor: file.removeFillColor || '#000000',
      settings: cloneSettings(file.settings || watermarkSettings.value)
    })
    return true
  }

  if (hasWatermarks) {
    const watermarksData = serializeWatermarks(file.watermarks)
    await platformService.addWatermark({
      id: file.id,
      inputPath: file.path,
      outputPath: getOutputPath(file),
      watermarks: watermarksData,
      settings: cloneSettings(file.settings || watermarkSettings.value)
    })
    return true
  }

  return false
}

const runWatermarkProcessingForFile = async (file: any) => {
  if (file.status === 'converting') return false
  const runId = beginConversionRun(file, { clearErrorMessage: true })

  try {
    const processed = await executeWatermarkTask(file)
    if (!isCurrentConversionRun(file, runId)) return false
    if (isConversionCancelRequested(file, runId)) {
      finishCancelledConversion(file, { clearErrorMessage: true })
      return false
    }
    if (!processed) {
      file.status = 'error'
      file.errorMsg = t('common.noWatermarkAction')
      return false
    }
    file.status = 'completed'
    file.progress = 100
    return true
  } catch (err: any) {
    if (!isCurrentConversionRun(file, runId)) return false
    if (isConversionCancelRequested(file, runId)) {
      finishCancelledConversion(file, { clearErrorMessage: true })
      return false
    }
    file.status = 'error'
    file.errorMsg = err?.message || t('common.processFailedCheckSettings')
    console.error(t('common.processFailed'), err)
    return false
  }
}

const processFile = async (file: any, showDialog = true) => {
  await checkAuthAndExecute(async () => {
    await runWatermarkProcessingForFile(file)
  })
}

const processAll = async () => {
  if (batchActionDisabled.value) return
  await checkAuthAndExecute(async () => {
    const filesToProcess = [...selectedReadyFiles.value]

    let completedCount = 0
    for (const file of filesToProcess) {
      if (await runWatermarkProcessingForFile(file)) completedCount++
    }

    if (filesToProcess.length === 0) {
      // 没有可处理的文件，提示用户
      console.log(t('common.noFilesToProcess'))
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
.file-list { flex: 1; overflow-y: auto; padding: 16px 20px; }

.watermark-item {
  display: flex; align-items: center; gap: 20px; padding: 16px 20px; background: #fff; border-radius: 8px; margin-bottom: 12px;
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
  .thumbnail { width: 140px; height: 90px; background: #000; border-radius: 6px; position: relative; overflow: hidden; cursor: pointer; flex-shrink: 0;
    img { height: 100%; width: auto; max-width: none; object-fit: contain; display: block; margin: 0 auto; }
    .video-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #e8f8f6; }
    .duration, .size { position: absolute; bottom: 6px; background: rgba(0,0,0,0.7); color: white; font-size: 11px; padding: 2px 6px; border-radius: 3px; }
    .duration { left: 6px; } .size { right: 6px; }
  }
  .file-info, .output-info { flex: 1; min-width: 120px;
    .filename { font-size: 14px; color: #333; margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .filename-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
      .filename { cursor: pointer; &:hover { color: #36d1c4; } }
      .edit-icon { cursor: pointer; opacity: 0.6; &:hover { opacity: 1; } }
      .edit-input { width: 200px; }
    }
    .meta-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px;
      .tag { font-size: 12px; color: #36d1c4; min-width: 40px; }
      .value { font-size: 12px; color: #666; }
    }
    .progress-section { margin-top: 10px;
      .progress-bar { height: 6px; background: #e8e8e8; border-radius: 3px; overflow: hidden; margin-bottom: 4px;
        .progress-fill { height: 100%; background: linear-gradient(90deg, #36d1c4, #5de0d4); border-radius: 3px; transition: width 0.3s ease; }
      }
      .progress-text { font-size: 12px; color: #36d1c4; }
    }
    .status-text { display: flex; align-items: center; gap: 4px; font-size: 12px; margin-top: 8px;
      &.success { color: #67c23a; }
      &.error { color: #f56c6c; }
    }
  }
  .arrow { color: #ccc; font-size: 18px; flex-shrink: 0; }
  .right-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0;
    .watermark-links { display: flex; flex-direction: column; gap: 6px;
      .link { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #36d1c4; cursor: pointer; &:hover { text-decoration: underline; } }
    }
    .action-btns { display: flex; align-items: center; gap: 12px;
      .setting-btn { border-color: #ddd; }
      .process-btn { background: #36d1c4; border-color: #36d1c4; border-radius: 6px;
        &.cancel-btn { background: #c65f5f; border-color: #c65f5f; }
      }
    }
    .delete-btn { font-size: 18px; color: #999; cursor: pointer; &:hover { color: #f56c6c; } }
  }
}

.drag-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(54, 209, 196, 0.1); border: 2px dashed #36d1c4;
  display: flex; align-items: center; justify-content: center; z-index: 10;
  .drag-hint { text-align: center; p { color: #36d1c4; font-size: 16px; margin-top: 12px; } }
}

.watermark-dialog {
  :deep(.el-dialog__body) { padding: 0; }
  .dialog-content { display: flex; height: 520px; overflow: hidden; }
  .video-preview { width: 55%; background: #1a1a1a; display: flex; flex-direction: column; overflow: hidden; padding: 16px;
    .video-container { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; background: #000; border-radius: 8px;
      .video-wrapper { position: relative;
        video { width: 100%; height: 100%; object-fit: contain; display: block; }
        .watermark-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden;
          .watermark-preview { position: absolute; pointer-events: auto; display: inline-block;
            &.custom-item { cursor: move; }
            &.tile-item, &.grid-item { pointer-events: none; }
            img { max-width: none; height: auto; display: block; }
            .text-watermark { color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); white-space: nowrap; display: block; }
            .selection-box { position: absolute; top: -4px; left: -4px; width: calc(100% + 8px); height: calc(100% + 8px); border: 2px dashed #36d1c4; pointer-events: none; box-sizing: border-box;
              .corner { position: absolute; width: 8px; height: 8px; background: #fff; border: 2px solid #36d1c4; box-sizing: border-box;
                &.top-left { top: -4px; left: -4px; } &.top-right { top: -4px; right: -4px; } &.bottom-left { bottom: -4px; left: -4px; } &.bottom-right { bottom: -4px; right: -4px; }
              }
            }
          }
        }
      }
    }
    .video-progress { padding: 12px 0 8px;
      :deep(.el-slider__runway) { background: rgba(255,255,255,0.2); height: 4px; }
      :deep(.el-slider__bar) { background: #36d1c4; height: 4px; }
      :deep(.el-slider__button) { width: 12px; height: 12px; border-color: #36d1c4; }
    }
    .video-controls { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 0;
      .time { color: #fff; font-size: 13px; font-family: monospace; }
      .control-btns { display: flex; align-items: center; gap: 12px; .el-button { padding: 4px; } }
    }
  }
  .watermark-settings { width: 45%; padding: 20px; overflow-y: auto; background: #fff;
    .add-btns { display: flex; gap: 12px; margin-bottom: 16px; align-items: center;
      .add-btn { border: 1px solid #36d1c4; color: #36d1c4; background: #fff; padding: 8px 16px; display: flex; align-items: center; gap: 6px; &:hover { background: #f0faf9; } }
      .clear-btn { color: #36d1c4; margin-left: auto; }
    }
    .watermark-list { max-height: 100px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; margin-bottom: 20px;
      .wm-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer;
        &:last-child { border-bottom: none; } &:hover, &.active { background: #f0faf9; }
        .wm-name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wm-time { font-size: 11px; color: #999; }
        .wm-delete { color: #999; cursor: pointer; font-size: 16px; &:hover { color: #f56c6c; } }
      }
    }
    .settings-section { h4 { font-size: 14px; color: #333; margin-bottom: 16px; font-weight: 500; border-bottom: 1px solid #eee; padding-bottom: 10px; }
      .text-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 10px; border: 1px solid #eee; border-radius: 6px;
        .font-select { width: 80px; } .font-size-input { width: 90px; }
        .text-style-btns { display: flex; gap: 4px; margin-left: auto;
          .el-button { width: 32px; height: 32px; padding: 0; font-weight: bold; &.underline-btn { text-decoration: underline; } &.italic-btn { font-style: italic; } }
        }
      }
      .text-input-area { margin-bottom: 16px; :deep(.el-textarea__inner) { resize: none; } }
      .setting-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
        .setting-label { width: 60px; font-size: 13px; color: #666; flex-shrink: 0; }
        .setting-slider { flex: 1; min-width: 80px; }
        .setting-input { width: 90px; flex-shrink: 0; }
        .unit { font-size: 12px; color: #999; width: 20px; flex-shrink: 0; }
        .time-input { width: 90px; } .time-sep { color: #999; }
        :deep(.el-radio-group) { display: flex; gap: 16px; flex-wrap: wrap; }
        :deep(.el-radio) { margin-right: 0; }
        :deep(.el-input-number) { width: 90px; }
        :deep(.el-input-number .el-input__inner) { text-align: center; }
      }
    }
  }
}

// 去水印弹窗样式
.remove-watermark-dialog {
  :deep(.el-dialog__body) { padding: 0; }
  .dialog-content { display: flex; height: 520px; overflow: hidden; }
  .video-preview { width: 60%; background: #1a1a1a; display: flex; flex-direction: column; overflow: hidden; padding: 16px;
    .video-container { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; background: #000; border-radius: 8px;
      .video-wrapper { position: relative;
        video { width: 100%; height: 100%; object-fit: contain; display: block; }
        .watermark-select-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair;
          .remove-area { position: absolute; border: 2px solid #f56c6c; background: rgba(245, 108, 108, 0.2); cursor: move;
            &.selected { border-color: #36d1c4; background: rgba(54, 209, 196, 0.2); }
            &.drawing { border: 2px dashed #36d1c4; background: rgba(54, 209, 196, 0.15); pointer-events: none; }
            .area-label { position: absolute; top: -20px; left: 0; font-size: 11px; color: #fff; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
            .resize-handle { position: absolute; width: 12px; height: 12px; background: #fff; border: 2px solid #36d1c4; border-radius: 2px;
              &.se { bottom: -6px; right: -6px; cursor: se-resize; }
            }
            .area-delete { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; background: #f56c6c; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; line-height: 1;
              &:hover { background: #e04040; }
            }
          }
        }
      }
    }
    .video-progress { padding: 12px 0 8px;
      :deep(.el-slider__runway) { background: rgba(255,255,255,0.2); height: 4px; }
      :deep(.el-slider__bar) { background: #36d1c4; height: 4px; }
      :deep(.el-slider__button) { width: 12px; height: 12px; border-color: #36d1c4; }
    }
    .video-controls { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 8px 0;
      .time { color: #fff; font-size: 13px; font-family: monospace; }
      .control-btns { display: flex; align-items: center; gap: 12px; .el-button { padding: 4px; } }
    }
  }
  .remove-settings { width: 40%; padding: 20px; overflow-y: auto; background: #fff;
    .tips-section { background: #f0faf9; border-radius: 8px; padding: 16px; margin-bottom: 20px;
      .tip-title { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #36d1c4; font-weight: 500; margin-bottom: 12px; }
      .tip-list { margin: 0; padding-left: 20px; li { font-size: 12px; color: #666; line-height: 1.8; } }
    }
    .area-list-section { margin-bottom: 20px;
      .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
        span { font-size: 14px; color: #333; font-weight: 500; }
        .clear-btn { color: #f56c6c; &:hover { color: #e04040; } }
      }
      .area-list { border: 1px solid #eee; border-radius: 6px; max-height: 150px; overflow-y: auto;
        .area-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer;
          &:last-child { border-bottom: none; }
          &:hover, &.active { background: #f0faf9; }
          .area-name { font-size: 13px; color: #333; }
          .area-size { flex: 1; font-size: 12px; color: #999; text-align: right; }
          .area-delete-btn { color: #999; font-size: 16px; cursor: pointer; &:hover { color: #f56c6c; } }
        }
        .empty-tip { padding: 30px; text-align: center; color: #999; font-size: 13px; }
      }
    }
    .mode-section {
      .section-header { font-size: 14px; color: #333; font-weight: 500; margin-bottom: 12px; }
      :deep(.el-radio-group) { display: flex; flex-direction: column; gap: 10px; }
      :deep(.el-radio) { margin-right: 0; }
      .color-picker { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding-left: 24px;
        .label { font-size: 13px; color: #666; }
      }
    }
  }
}
</style>
