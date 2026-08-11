<template>
  <el-dialog 
    v-model="visible" 
    :show-close="false"
    width="400px"
    :close-on-click-modal="true"
    class="convert-success-dialog"
  >
    <div class="dialog-content">
      <span class="close-btn" @click="handleClose">×</span>
      
      <!-- 成功图标 -->
      <div class="success-icon">
        <svg viewBox="0 0 200 160" width="200" height="160">
          <!-- 后面的文件夹 -->
          <path d="M40 50 L40 130 L160 130 L160 50 L100 50 L90 40 L50 40 L40 50 Z" fill="#7dd8cf"/>
          <!-- 前面的文件夹 -->
          <path d="M30 60 L30 140 L150 140 L150 60 L90 60 L80 50 L40 50 L30 60 Z" fill="#36d1c4"/>
          <!-- 播放按钮 -->
          <polygon points="75,85 75,115 100,100" fill="white"/>
          <!-- 转换箭头 -->
          <path d="M25 90 Q10 90 10 105 Q10 120 25 120" stroke="#7dd8cf" stroke-width="4" fill="none"/>
          <polygon points="20,125 30,120 25,115" fill="#7dd8cf"/>
          <!-- 成功勾选图标 -->
          <circle cx="155" cy="45" r="20" fill="#36d1c4"/>
          <polyline points="145,45 152,52 167,37" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- 成功文字 -->
      <div class="success-text">
        <svg viewBox="0 0 24 24" width="18" height="18" class="check-icon">
          <circle cx="12" cy="12" r="10" fill="#52c41a"/>
          <polyline points="8,12 11,15 16,9" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ count }}{{ t('common.filesConvertCompleted') }}</span>
      </div>

      <!-- 打开文件夹按钮 -->
      <el-button v-if="platformService.isElectron" type="primary" class="open-folder-btn" @click="openFolder">
        {{ t('common.openFolder') }}
      </el-button>
      <el-button v-else type="primary" class="open-folder-btn" @click="handleClose">
        {{ t('common.confirm') }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
const { t } = useI18n()

import { platformService } from '@/services/platformService'

const props = defineProps<{
  modelValue: boolean
  count: number
  outputPath: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const openFolder = async () => {
  try {
    if (props.outputPath) {
      await platformService.openFolder(props.outputPath)
    }
    handleClose()
  } catch (error) {
    console.error('Open folder failed:', error)
    ElMessage.error('打开文件夹失败')
  }
}
</script>

<style lang="scss">
.convert-success-dialog {
  .el-dialog__header {
    display: none;
  }
  
  .el-dialog__body {
    padding: 0;
  }
}
</style>

<style lang="scss" scoped>
.dialog-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;

  .close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    line-height: 1;

    &:hover {
      color: #666;
    }
  }

  .success-icon {
    margin: 20px 0 30px;
  }

  .success-text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    color: #333;
    margin-bottom: 24px;

    .check-icon {
      flex-shrink: 0;
    }
  }

  .open-folder-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    background: #36d1c4;
    border-color: #36d1c4;
    border-radius: 8px;

    &:hover {
      background: #2bb5a9;
      border-color: #2bb5a9;
    }
  }
}
</style>
