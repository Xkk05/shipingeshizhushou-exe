<template>
  <el-dialog v-model="visible" :title="t('common.urlDownloadVideo')" width="500px" :close-on-click-modal="false" class="url-download-dialog">
    <div class="url-content">
      <div class="input-section">
        <label>{{ t('common.videoUrlAddress') }}</label>
        <el-input v-model="videoUrl" :placeholder="t('common.inputVideoUrlPlaceholder')" clearable />
      </div>
      <div class="input-section">
        <label>{{ t('common.videoNameOptional') }}</label>
        <el-input v-model="videoName" :placeholder="t('common.autoGenerateNamePlaceholder')" clearable />
      </div>
      <div class="tips">
        <p>{{ t('common.urlDownloadTips1') }}</p>
        <p>{{ t('common.urlDownloadTips2') }}</p>
      </div>
      <div class="progress-section" v-if="isDownloading">
        <el-progress :percentage="downloadProgress" :status="downloadStatus" />
        <p class="progress-text">{{ progressText }}</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="close" :disabled="isDownloading">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="startDownload" :loading="isDownloading">
        {{ isDownloading ? t('common.downloading') : t('common.startDownload') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'download-complete'])

import { platformService } from '@/services/platformService'

const visible = ref(false)
const videoUrl = ref('')
const videoName = ref('')
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadStatus = ref<'' | 'success' | 'exception'>('')
const progressText = ref('')

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    // 重置状态
    videoUrl.value = ''
    videoName.value = ''
    isDownloading.value = false
    downloadProgress.value = 0
    downloadStatus.value = ''
    progressText.value = ''
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const close = () => {
  if (!isDownloading.value) {
    visible.value = false
  }
}

const startDownload = async () => {
  if (!videoUrl.value.trim()) {
    ElMessage.warning(t('common.inputVideoUrlWarning'))
    return
  }
  
  if (!videoUrl.value.startsWith('http')) {
    ElMessage.warning(t('common.inputValidUrlWarning'))
    return
  }
  
  isDownloading.value = true
  downloadProgress.value = 0
  downloadStatus.value = ''
  progressText.value = t('common.downloadingVideo')
  
  try {
    const result = await platformService.downloadVideoUrl({
      url: videoUrl.value.trim(),
      name: videoName.value.trim() || undefined
    })
    
    if (result.success) {
      downloadProgress.value = 100
      downloadStatus.value = 'success'
      progressText.value = t('common.downloadSuccess')
      ElMessage.success(t('common.downloadSuccess'))
      emit('download-complete', result.filePath)
      setTimeout(() => {
        visible.value = false
      }, 1000)
    } else {
      throw new Error(result.error || t('common.downloadFailed'))
    }
  } catch (err: any) {
    downloadStatus.value = 'exception'
    progressText.value = t('common.downloadFailed') + ': ' + (err.message || t('common.unknown'))
    ElMessage.error(t('common.downloadFailed') + ': ' + (err.message || t('common.unknown')))
  } finally {
    isDownloading.value = false
  }
}

onMounted(() => {
  platformService.onUrlDownloadProgress((data: { percent: number; timemark: string }) => {
    if (data.percent) {
      downloadProgress.value = Math.min(Math.round(data.percent), 99)
    }
    if (data.timemark) {
      progressText.value = `${t('common.downloading')}... ${data.timemark}`
    }
  }, 'url-download-progress')
})

onUnmounted(() => {
  platformService.removeUrlDownloadProgressListeners('url-download-progress')
})
</script>

<style lang="scss" scoped>
.url-download-dialog {
  .url-content {
    .input-section {
      margin-bottom: 20px;
      
      label {
        display: block;
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }
    }
    
    .tips {
      background: #f5f7fa;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      
      p {
        font-size: 12px;
        color: #909399;
        margin: 0;
        line-height: 1.8;
        
        &::before {
          content: '•';
          margin-right: 6px;
          color: #36d1c4;
        }
      }
    }
    
    .progress-section {
      margin-top: 20px;
      
      .progress-text {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-top: 8px;
      }
    }
  }
}
</style>
