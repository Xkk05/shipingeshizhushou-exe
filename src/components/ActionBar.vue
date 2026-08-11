<template>
  <div class="action-bar" :class="{ 'is-web-action-bar': !platformService.isElectron }">
    <!-- 第一行：输出格式 -->
    <div class="options-row">
      <div class="option-item">
        <span class="label">{{ t('common.outputFormat') }}</span>
        <div class="format-selector" @click="$emit('show-settings')">
          <span>{{ outputFormat.toUpperCase() }}</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="#36d1c4"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
      </div>
      <div class="action-area">
        <el-button type="primary" class="action-btn" @click="$emit('action')">
          {{ actionText }}
        </el-button>
      </div>
    </div>
    <!-- 第二行：输出路径 -->
    <div v-if="platformService.isElectron" class="path-row">
      <div class="output-path">
        <span class="label">{{ t('common.outputPath') }}</span>
        <el-select v-model="outputPathType" class="path-select" @change="handlePathTypeChange">
          <el-option :label="t('common.videoConverterFolder')" value="default" />
          <el-option :label="t('common.sameAsSource')" value="source" />
          <el-option :label="t('common.customFolder')" value="custom" />
        </el-select>
        <el-button class="folder-btn" @click="selectOutputDir">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#36d1c4">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

import { platformService } from '@/services/platformService'

const props = defineProps<{
  actionText: string
  currentFormat?: string
}>()

const emit = defineEmits(['action', 'show-settings', 'output-path-change'])

const outputPathType = ref('default')
const customPath = ref('')
const defaultPath = ref('')
const outputFormat = ref('mp4')

// 监听外部格式变化
watch(() => props.currentFormat, (newFormat) => {
  if (newFormat) {
    outputFormat.value = newFormat
  }
})

onMounted(async () => {
  defaultPath.value = await platformService.getDefaultOutputDir()
  emit('output-path-change', { type: 'default', path: defaultPath.value })
})

const handlePathTypeChange = (type: string) => {
  if (type === 'custom') {
    selectOutputDir()
  } else {
    emit('output-path-change', { type, path: type === 'default' ? defaultPath.value : '' })
  }
}

const selectOutputDir = async () => {
  const dir = await platformService.selectOutputDir()
  if (dir) {
    customPath.value = dir
    outputPathType.value = 'custom'
    emit('output-path-change', { type: 'custom', path: dir })
  } else if (outputPathType.value === 'custom' && !customPath.value) {
    outputPathType.value = 'default'
  }
}

watch(outputPathType, (type) => {
  if (type !== 'custom') {
    emit('output-path-change', { type, path: type === 'default' ? defaultPath.value : '' })
  }
})
</script>

<style lang="scss" scoped>
.action-bar {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .options-row {
    display: flex;
    align-items: center;
    gap: 40px;

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .label {
        font-size: 13px;
        color: #666;
        white-space: nowrap;
      }

      .format-selector {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #fff;
        border: 1px solid #36d1c4;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        color: #333;
        min-width: 100px;
        justify-content: space-between;

        &:hover {
          background: #e8f8f6;
        }
      }
    }

    .action-area {
      margin-left: auto;
      
      .action-btn {
        background: #36d1c4;
        border-color: #36d1c4;
        padding: 14px 40px;
        border-radius: 24px;
        font-size: 15px;
        font-weight: 500;

        &:hover {
          background: #2bb5a9;
          border-color: #2bb5a9;
        }
      }
    }
  }

  .path-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .output-path {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .label {
        font-size: 13px;
        color: #666;
        white-space: nowrap;
      }

      .path-select {
        flex: 1;
        max-width: 400px;
        
        :deep(.el-input__wrapper) {
          border-radius: 4px;
          border-color: #36d1c4;
        }
        
        :deep(.el-input__suffix-inner) {
          color: #36d1c4;
        }
      }

      .folder-btn {
        padding: 8px 12px;
        border: none;
        background: transparent;
        
        &:hover {
          background: #e8f8f6;
        }
      }
    }
  }

  &.is-web-action-bar {
    padding: 18px 20px 20px;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));

    .options-row {
      align-items: end;
    }

    .option-item {
      flex-wrap: wrap;
    }

    .format-selector {
      min-height: 44px;
      border-radius: 14px;
      border-color: rgba(20, 184, 166, 0.22);
      background: #fff;
    }

    .action-btn {
      min-height: 48px;
      padding: 0 28px;
      border-radius: 999px;
      background: linear-gradient(135deg, #0f766e, #14b8a6);
      border-color: #14b8a6;
      box-shadow: 0 18px 36px rgba(20, 184, 166, 0.18);
    }

    .path-select {
      max-width: 460px;
    }
  }
}

@media (max-width: 720px) {
  .action-bar {
    padding: 14px;

    .options-row,
    .path-row,
    .output-path {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .action-area {
      margin-left: 0 !important;
    }

    .action-btn,
    .folder-btn {
      width: 100%;
      justify-content: center;
    }

    .path-select {
      max-width: none !important;
      width: 100%;
    }
  }
}
</style>
