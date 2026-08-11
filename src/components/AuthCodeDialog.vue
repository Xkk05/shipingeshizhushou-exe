<template>
  <el-dialog
    v-model="visible"
    title=""
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="auth-dialog"
    @close="handleClose"
  >
    <div class="auth-content">
      <div class="header">
        <div class="logo">
          <img src="/icon.ico" alt="Logo" class="logo-image" />
        </div>
        <h2>{{ t('common.authTitle') }}</h2>
      </div>

      <div class="description">
        <p>{{ t('common.authDesc1') }}</p>
        <p>{{ t('common.authDesc2') }}</p>
      </div>

      <div class="form-section">
        <label class="input-label">{{ t('common.inputAuthCode') }}</label>
        <el-input
          v-model="authCodeInput"
          :placeholder="t('common.inputAuthCode')"
          size="large"
          class="auth-input"
          :disabled="authCodeStore.isLoading"
          maxlength="20"
          @keyup.enter="handleValidate"
          @paste.prevent="handlePaste"
        />
        
        <div v-if="authCodeStore.error" class="error-message">
          {{ authCodeStore.error }}
        </div>
      </div>

      <el-button
        type="primary"
        size="large"
        class="validate-btn"
        :loading="authCodeStore.isLoading"
        :disabled="!authCodeInput.trim()"
        @click="handleValidate"
      >
        {{ t('common.validateAuth') }}
      </el-button>

      <div class="footer-links">
        <span class="no-auth-text">{{ t('common.noAuthCode') }}</span>
        <a 
          href="#" 
          class="get-auth-link"
          @click.prevent="handleGetAuthCode"
        >
          {{ t('common.clickToGet') }}
        </a>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthCodeStore } from '@/stores/authCodeStore'
import { platformService } from '@/services/platformService'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authCodeStore = useAuthCodeStore()
const authCodeInput = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    // 只有在验证成功后才允许关闭
    if (!value && !authCodeStore.isAuthorized) {
      return
    }
    emit('update:modelValue', value)
  }
})

const handlePaste = (event: ClipboardEvent) => {
  // 获取粘贴的文本
  const pastedText = event.clipboardData?.getData('text') || ''
  // 只保留字母和数字，去除空格和特殊字符
  authCodeInput.value = pastedText.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

const handleValidate = async () => {
  const code = authCodeInput.value.trim()
  
  if (!code) {
    ElMessage.warning(t('common.authCodeRequired'))
    return
  }

  if (code.length < 6) {
    ElMessage.warning(t('common.authCodeInvalid'))
    return
  }

  const success = await authCodeStore.validateAuthCode(code)
  
  if (success) {
    ElMessage.success(t('common.authSuccess'))
    visible.value = false
    emit('success')
  } else {
    // 清空输入框
    authCodeInput.value = ''
  }
}

const handleGetAuthCode = async () => {
  if (authCodeStore.authUrl) {
    platformService.openExternalUrl(authCodeStore.authUrl)
  } else {
    // 如果没有 authUrl，尝试重新获取
    try {
      await authCodeStore.initAuthStatus()
      if (authCodeStore.authUrl) {
        platformService.openExternalUrl(authCodeStore.authUrl)
      } else {
        ElMessage.warning(t('common.getAuthUrlFailed'))
      }
    } catch (error) {
      ElMessage.warning(t('common.getAuthUrlFailed'))
    }
  }
}

const handleClose = () => {
  // 只有在已授权的情况下才清空输入
  if (authCodeStore.isAuthorized) {
    authCodeInput.value = ''
    authCodeStore.error = null
  }
}
</script>

<style lang="scss" scoped>
:deep(.auth-dialog) {
  .el-dialog {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    
    .el-dialog__header {
      display: none;
    }
    
    .el-dialog__body {
      padding: 0;
    }
  }
}

.auth-content {
  padding: 32px;
  background: #ffffff;
  border-radius: 16px;
  color: #333333;

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;

    .logo {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .logo-image {
        width: 48px;
        height: 48px;
        object-fit: contain;
      }
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #333333;
      margin: 0;
    }
  }

  .description {
    margin-bottom: 32px;
    line-height: 1.6;

    p {
      margin: 0 0 8px 0;
      color: #666666;
      font-size: 14px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .form-section {
    margin-bottom: 24px;

    .input-label {
      display: block;
      margin-bottom: 12px;
      color: #333333;
      font-size: 14px;
      font-weight: 500;
    }

    .auth-input {
      :deep(.el-input__wrapper) {
        background: #f8f9fa;
        border: 1px solid #e8e8e8;
        border-radius: 12px;
        box-shadow: none;
        padding: 12px 16px;

        &:hover {
          border-color: #36d1c4;
        }

        &.is-focus {
          border-color: #36d1c4;
          box-shadow: 0 0 0 2px rgba(54, 209, 196, 0.1);
        }

        .el-input__inner {
          color: #333333;
          font-size: 14px;

          &::placeholder {
            color: #999999;
          }
        }
      }
    }

    .error-message {
      margin-top: 8px;
      color: #ff6b6b;
      font-size: 12px;
    }
  }

  .validate-btn {
    width: 100%;
    height: 48px;
    background: linear-gradient(135deg, #36d1c4, #5de0d4);
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 24px;
    color: white;

    &:hover {
      background: linear-gradient(135deg, #2bb5a9, #4dd4c7);
    }

    &.is-loading {
      background: linear-gradient(135deg, #36d1c4, #5de0d4);
      opacity: 0.8;
    }
  }

  .footer-links {
    text-align: center;

    .no-auth-text {
      color: #999999;
      font-size: 14px;
      margin-right: 8px;
    }

    .get-auth-link {
      color: #36d1c4;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
      font-weight: 500;

      &:hover {
        color: #2bb5a9;
        text-decoration: underline;
      }
    }
  }
}
</style>