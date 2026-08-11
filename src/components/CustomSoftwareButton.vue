<template>
  <div class="custom-software-button">
    <el-button class="custom-btn" @click="handleCustomSoftware">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
      {{ $t('common.softwareCustomization') }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as loginService from '@/services/loginService'
import { platformService } from '@/services/platformService'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const handleCustomSoftware = async () => {
  try {
    const response = await loginService.getCustomUrl()
    if (response.code === 1 && response.data?.url) {
      platformService.openExternalUrl(response.data.url)
    } else {
      ElMessage.warning(t('error.getCustomUrlFailed'))
    }
  } catch (error) {
    console.error('获取定制链接失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.custom-software-button {
  .custom-btn {
    background: #36d1c4;
    border-color: #36d1c4;
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: white;

    &:hover {
      background: #2bb5a9;
      border-color: #2bb5a9;
    }
  }
}
</style>