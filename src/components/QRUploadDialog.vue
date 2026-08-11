<template>
  <el-dialog v-model="visible" :title="t('common.qrUpload')" width="400px" :close-on-click-modal="false" class="qr-upload-dialog">
    <div class="qr-content">
      <div class="qr-code" v-if="qrCodeUrl">
        <img :src="qrCodeUrl" :alt="t('common.qrUpload')" />
      </div>
      <div class="qr-loading" v-else>
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ t('common.startingService') }}</span>
      </div>
      <div class="qr-tips">
        <p class="main-tip">{{ t('common.qrUploadMainTip') }}</p>
        <p class="sub-tip">{{ t('common.qrUploadSubTip') }}</p>
        <p class="ip-tip" v-if="serverUrl">{{ t('common.serviceAddress') }}: {{ serverUrl }}</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="close">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'files-uploaded'])

import { platformService } from '@/services/platformService'

const visible = ref(false)
const qrCodeUrl = ref('')
const serverUrl = ref('')

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && platformService.isElectron) {
    await startServer()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val && platformService.isElectron) {
    stopServer()
  }
})

const startServer = async () => {
  try {
    const result = await platformService.startUploadServer()
    if (result.success) {
      serverUrl.value = `http://${result.ip}:${result.port}`
      const qr = await platformService.generateQRCode(serverUrl.value)
      qrCodeUrl.value = qr
    }
  } catch (err) {
    console.error(t('error.startUploadServerFailed'), err)
  }
}

const stopServer = async () => {
  qrCodeUrl.value = ''
  serverUrl.value = ''
}

const close = () => {
  visible.value = false
}

onMounted(() => {
  if (platformService.isElectron) {
    platformService.onFilesUploaded((filePaths: string[]) => {
      if (filePaths && filePaths.length > 0) {
        emit('files-uploaded', filePaths)
        visible.value = false
      }
    })
  }
})

onUnmounted(() => {
  if (platformService.isElectron) {
    platformService.removeFilesUploadedListeners()
  }
})
</script>

<style lang="scss" scoped>
.qr-upload-dialog {
  .qr-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    
    .qr-code {
      width: 200px;
      height: 200px;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 20px;
      
      img {
        width: 100%;
        height: 100%;
      }
    }
    
    .qr-loading {
      width: 200px;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #999;
      
      .el-icon {
        font-size: 32px;
        color: #36d1c4;
      }
    }
    
    .qr-tips {
      text-align: center;
      
      .main-tip {
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
      }
      
      .sub-tip {
        font-size: 12px;
        color: #999;
        margin-bottom: 8px;
      }
      
      .ip-tip {
        font-size: 12px;
        color: #36d1c4;
        font-family: monospace;
      }
    }
  }
}
</style>
