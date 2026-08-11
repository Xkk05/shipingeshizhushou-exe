<template>
  <div class="feedback-button">
    <el-button class="feedback-btn" @click="handleOpenFeedback">
      <span>{{ $t('common.feedback') }}</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as loginService from '@/services/loginService'
import { useI18n } from 'vue-i18n'
import { platformService } from '@/services/platformService'

const { t } = useI18n()

const handleOpenFeedback = async () => {
  try {
    const response = await loginService.getFeedbackUrl()
    if (response.code === 1 && response.data?.url) {
      platformService.openExternalUrl(response.data.url)
    } else {
      ElMessage.warning(t('error.getFeedbackUrlFailed'))
    }
  } catch (error) {
    console.error(t('error.openFeedbackPageFailed') + ':', error)
    ElMessage.error(t('error.openFeedbackPageFailed'))
  }
}
</script>

<style lang="scss" scoped>
.feedback-button {
  .feedback-btn {
    background: #409eff;
    border-color: #409eff;
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: white;

    &:hover {
      background: #66b1ff;
      border-color: #66b1ff;
    }
  }
}
</style>
