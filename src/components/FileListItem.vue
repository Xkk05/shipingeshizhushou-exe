<template>
  <div
    class="file-item"
    :class="{
      converting: file.status === 'converting',
      completed: file.status === 'completed',
      error: file.status === 'error',
      'is-web-item': !platformService.isElectron,
    }"
  >
    <!-- 缩略图 -->
    <div class="thumbnail" @click="playVideo">
      <img v-if="file.thumbnail" :src="file.thumbnail" alt="" />
      <div v-else class="video-icon">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="#36d1c4">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <!-- 播放按钮覆盖层 -->
      <div class="play-overlay">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="#36d1c4">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <div class="duration">{{ file.duration || '00:00' }}</div>
      <div class="size">{{ formatSize(file.size) }}</div>
    </div>

    <!-- 源文件信息 -->
    <div class="source-info">
      <div class="filename">{{ file.name }}</div>
      <div class="meta">
        <span class="tag">{{ t('common.format') }}</span>
        <span class="value">{{ file.format?.toUpperCase() }}</span>
      </div>
      <div class="meta" v-if="file.size">
        <span class="tag">{{ t('common.estimatedSize') }}</span>
        <span class="value">{{ formatSize(file.size) }}</span>
      </div>
    </div>

    <!-- 箭头 -->
    <div class="arrow">→</div>

    <!-- 输出文件信息 -->
    <div class="output-info">
      <div class="filename editable" v-if="!isEditing" @click="startEditName">
        {{ file.outputName }}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="#36d1c4" class="edit-icon">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </div>
      <div class="filename-edit" v-else>
        <el-input 
          v-model="editingName" 
          size="small" 
          @blur="confirmEditName"
          @keyup.enter="confirmEditName"
          @keyup.escape="cancelEditName"
        />
      </div>
      <div class="meta">
        <span class="tag">{{ t('common.format') }}</span>
        <span class="value">{{ file.outputFormat?.toUpperCase() }}</span>
      </div>
      <div class="meta" v-if="file.estimatedSize">
        <span class="tag">{{ t('common.estimatedSize') }}</span>
        <span class="value">{{ formatSize(file.estimatedSize) }}</span>
      </div>
      <div class="meta" v-else-if="file.outputResolution">
        <span class="tag">{{ t('common.resolution') }}</span>
        <span class="value">{{ file.outputResolution }}</span>
      </div>
      <!-- 进度条 -->
      <div v-if="file.status === 'converting'" class="progress-bar">
        <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
        <span class="progress-text">{{ file.progress }}%</span>
      </div>
      <div v-else-if="file.status === 'completed'" class="status-text success">{{ t('common.convertSuccess') }}</div>
      <div v-else-if="file.status === 'error'" class="status-text error">{{ t('common.convertFailed') }}</div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <el-button class="setting-btn" size="small" circle @click="$emit('settings', file)" :disabled="file.status === 'converting'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </el-button>
      <el-button 
        type="primary" 
        size="small" 
        class="convert-btn" 
        :disabled="file.status === 'converting'"
        @click="$emit('convert', file)"
      >
        {{ file.status === 'converting' ? t('common.converting') : (file.status === 'completed' ? t('common.completed') : actionText) }}
      </el-button>
      <el-button class="delete-btn" size="small" text @click="$emit('delete', file)" :disabled="file.status === 'converting'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#999">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const props = defineProps<{
  file: any
  actionText?: string
}>()

const emit = defineEmits(['settings', 'convert', 'delete', 'update:file'])

import { platformService } from '@/services/platformService'

const isEditing = ref(false)
const editingName = ref('')

const formatSize = (bytes: number) => {
  if (!bytes) return '0B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

const playVideo = async () => {
  if (props.file.path) {
    await platformService.playVideo(props.file.path)
  }
}

const startEditName = () => {
  isEditing.value = true
  editingName.value = props.file.outputName
  nextTick(() => {
    const input = document.querySelector('.filename-edit .el-input__inner') as HTMLInputElement
    if (input) { input.focus(); input.select() }
  })
}

const confirmEditName = () => {
  if (editingName.value && editingName.value.trim()) {
    let newName = editingName.value.trim()
    const ext = props.file.outputFormat?.toLowerCase() || 'mp4'
    if (!newName.toLowerCase().endsWith(`.${ext}`)) {
      newName = newName.replace(/\.[^.]+$/, '') + `.${ext}`
    }
    props.file.outputName = newName
  }
  isEditing.value = false
}

const cancelEditName = () => {
  isEditing.value = false
}
</script>

<style lang="scss" scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;

  &.converting {
    border-color: #36d1c4;
    background: #fafffe;
  }

  &.completed {
    border-color: #36d1c4;
  }

  &.error {
    border-color: #f56c6c;
  }

  .thumbnail {
    width: 140px;
    height: 90px;
    background: #f5f5f5;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    cursor: pointer;

    img {
      height: 100%;
      width: auto;
      max-width: none;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .video-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e8f8f6;
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.2s;

      svg {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
    }

    &:hover .play-overlay {
      opacity: 1;
    }

    .duration {
      position: absolute;
      left: 8px;
      bottom: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .size {
      position: absolute;
      right: 8px;
      bottom: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }
  }

  .source-info, .output-info {
    flex: 1;
    min-width: 0;

    .filename {
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.editable {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;

        .edit-icon {
          opacity: 0;
          transition: opacity 0.2s;
        }

        &:hover .edit-icon {
          opacity: 1;
        }
      }
    }

    .filename-edit {
      margin-bottom: 8px;
      :deep(.el-input__inner) { font-size: 14px; }
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .tag {
        font-size: 12px;
        color: #36d1c4;
      }

      .value {
        font-size: 12px;
        color: #666;
      }
    }

    .progress-bar {
      height: 16px;
      background: #f0f0f0;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      margin-top: 8px;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #36d1c4, #5de0d4);
        border-radius: 8px;
        transition: width 0.3s;
      }

      .progress-text {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        color: #666;
      }
    }

    .status-text {
      font-size: 12px;
      margin-top: 8px;

      &.success {
        color: #36d1c4;
      }

      &.error {
        color: #f56c6c;
      }
    }
  }

  .arrow {
    color: #ccc;
    font-size: 20px;
    padding: 0 16px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    .setting-btn {
      border-color: #e0e0e0;
    }

    .convert-btn {
      background: #36d1c4;
      border-color: #36d1c4;
      border-radius: 16px;
      padding: 6px 20px;
    }

    .delete-btn {
      padding: 4px;
    }
  }

  &.is-web-item {
    border-radius: 24px;
    border-color: rgba(148, 163, 184, 0.14);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
  }
}

@media (max-width: 820px) {
  .file-item {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;

    .thumbnail {
      width: 100%;
      height: 190px;
    }

    .arrow {
      display: none;
    }

    .actions {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;

      .convert-btn {
        min-width: 128px;
      }
    }
  }
}
</style>
