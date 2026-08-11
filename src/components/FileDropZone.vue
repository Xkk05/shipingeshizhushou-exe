<template>
  <div 
    class="drop-zone"
    :class="{ 'drag-over': isDragOver, 'is-web-drop-zone': !platformService.isElectron }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent.stop="handleDrop"
    @click="selectFiles"
  >
    <div class="drop-content">
      <div class="drop-icon">
        <div class="folder-wrapper">
          <!-- 文件夹图标 -->
          <svg class="folder-svg" viewBox="0 0 100 80" width="100" height="80">
            <!-- 文件夹背面 -->
            <path d="M10 20 L40 20 L45 10 L90 10 L90 70 L10 70 Z" fill="#b8f0eb" stroke="#36d1c4" stroke-width="2"/>
            <!-- 文件夹正面 -->
            <path d="M5 25 L35 25 L40 18 L95 18 L95 75 L5 75 Z" fill="#e8f8f6" stroke="#36d1c4" stroke-width="2"/>
            <!-- 播放按钮 -->
            <circle cx="50" cy="50" r="15" fill="#36d1c4"/>
            <path d="M46 42 L46 58 L58 50 Z" fill="white"/>
          </svg>
          <!-- 加号图标 -->
          <div class="plus-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#36d1c4">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
        </div>
      </div>
      <p class="drop-text">{{ t('common.dropHint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { handleDragDropEvent, MEDIA_EXTENSIONS } from '@/utils/dragDropUtils'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const emit = defineEmits(['files-selected'])

const isDragOver = ref(false)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  // 检查是否真的离开了拖拽区域
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    isDragOver.value = false
  }
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false
  
  try {
    const mediaFiles = await handleDragDropEvent(e, MEDIA_EXTENSIONS)
    if (mediaFiles.length) {
      emit('files-selected', mediaFiles)
    } else {
      console.warn(t('common.noSupportedFiles'))
    }
  } catch (error) {
    console.error(t('error.dragDropFailed'), error)
  }
}

import { platformService } from '@/services/platformService'

const selectFiles = async () => {
  try {
    const filePaths = await platformService.selectFiles([
      { name: 'Media Files', extensions: MEDIA_EXTENSIONS }
    ])
    if (filePaths?.length) {
      emit('files-selected', filePaths)
    }
  } catch (error) {
    console.error(t('common.selectFilesFailed'), error)
  }
}
</script>

<style lang="scss" scoped>
.drop-zone {
  flex: 1;
  margin: 20px;
  border: 2px dashed #36d1c4;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafffe;

  &:hover, &.drag-over {
    background: #e8f8f6;
    border-color: #2bb5a9;
  }

  .drop-content {
    text-align: center;
  }

  .drop-icon {
    margin: 0 auto 20px;
    
    .folder-wrapper {
      position: relative;
      width: 100px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .folder-svg {
        filter: drop-shadow(0 2px 4px rgba(54, 209, 196, 0.2));
      }
      
      .plus-icon {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 24px;
        height: 24px;
        background: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }
    }
  }

  .drop-text {
    color: #999;
    font-size: 14px;
  }
  &.is-web-drop-zone {
    min-height: 360px;
    margin: 12px;
    border-width: 1px;
    border-style: solid;
    border-color: rgba(20, 184, 166, 0.28);
    border-radius: 28px;
    background:
      radial-gradient(circle at top, rgba(45, 212, 191, 0.12), transparent 38%),
      linear-gradient(180deg, #fbfffe 0%, #f8fafc 100%);

    &:hover,
    &.drag-over {
      border-color: rgba(15, 118, 110, 0.42);
      background:
        radial-gradient(circle at top, rgba(45, 212, 191, 0.18), transparent 38%),
        linear-gradient(180deg, #f4fffd 0%, #f8fafc 100%);
    }

    .drop-icon {
      margin-bottom: 24px;
    }

    .folder-wrapper {
      width: 136px;
      height: 112px;
    }

    .drop-text {
      color: #334155;
      font-size: 16px;
      font-weight: 600;
    }
  }
}

@media (max-width: 720px) {
  .drop-zone {
    margin: 8px;
    min-height: 280px;

    .drop-text {
      font-size: 15px;
      line-height: 1.6;
      padding: 0 16px;
    }
  }
}
</style>
