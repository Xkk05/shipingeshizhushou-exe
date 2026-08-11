<template>
  <div class="user-login-button">
    <!-- 未登录状态 -->
    <el-button
      v-if="!authStore.isLoggedIn"
      :class="['login-btn', { 'icon-only': props.iconOnly }]"
      @click="handleDirectLogin"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <span v-if="!props.iconOnly">{{ props.label }}</span>
    </el-button>

    <!-- 已登录状态 -->
    <el-dropdown v-else trigger="click" @command="handleUserCommand">
      <div :class="['user-info', { 'icon-only': props.iconOnly }]">
        <img v-if="authStore.userInfo?.avatar" :src="authStore.userInfo.avatar" :alt="authStore.userInfo.nickname" class="avatar" />
        <span v-else class="avatar-placeholder">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </span>
        <span v-if="!props.iconOnly" class="nickname">{{ authStore.userInfo?.nickname }}</span>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#666" style="margin-right: 8px">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            {{ $t('common.logout') }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 登录进度对话框 -->
    <el-dialog v-model="showLoginProgress" :title="$t('common.loggingIn')" width="420px" :close-on-click-modal="false" :close-on-press-escape="false">
      <div class="login-progress">
        <el-icon class="is-loading">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#36d1c4">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
          </svg>
        </el-icon>
        <p>{{ $t('common.waitingForLogin') }}</p>
        <div v-if="currentLoginUrl" class="login-manual">
          <p class="manual-tip">如果浏览器没有自动打开，请手动继续：</p>
          <div class="manual-actions">
            <el-button @click="handleOpenLoginUrl">再次打开</el-button>
            <el-button type="primary" plain @click="handleCopyLoginUrl">复制登录链接</el-button>
          </div>
          <div class="manual-url">{{ currentLoginUrl }}</div>
        </div>
      </div>
      <template #footer>
        <el-button type="danger" @click="handleCancelLogin">{{ $t('common.cancelLogin') }}</el-button>
      </template>
    </el-dialog>

    <!-- 退出登录确认对话框 -->
    <el-dialog v-model="showLogoutConfirm" :title="$t('common.confirmLogout')" width="300px">
      <p>{{ $t('common.confirmLogoutDesc') }}</p>
      <template #footer>
        <el-button @click="showLogoutConfirm = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="danger" @click="handleConfirmLogout">{{ $t('common.confirmExit') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import * as loginService from '@/services/loginService'
import { platformService } from '@/services/platformService'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = withDefaults(defineProps<{ iconOnly?: boolean; label?: string }>(), {
  iconOnly: false,
  label: '登录/注册',
})
const authStore = useAuthStore()
const showLoginProgress = ref(false)
const showLogoutConfirm = ref(false)
const currentLoginUrl = ref('')

onMounted(() => {
  // 初始化token
  authStore.initToken()
  // 验证登录状态
  if (authStore.token) {
    authStore.verifyLogin()
  }
})

const handleDirectLogin = async () => {
  try {
    // 1. 由服务端生成带签名的 nonce，避免浏览器环境差异导致登录失败
    const { encodedNonce } = await loginService.getSignedNonce()

    // 2. 获取网页端登录地址
    const webLoginUrl = await loginService.getWebLoginUrl()

    // 3. 构造完整的登录URL
    const loginUrl = `${webLoginUrl}?client_type=desktop&client_nonce=${encodedNonce}`
    currentLoginUrl.value = loginUrl

    // 4. 打开浏览器
    await platformService.openExternalUrl(loginUrl)

    // 5. 显示登录进度对话框
    showLoginProgress.value = true

    // 6. 启动轮询获取Token
    const newToken = await loginService.pollToken(encodedNonce, 300, () => !showLoginProgress.value)

    // 7. 保存token
    authStore.token = newToken
    localStorage.setItem('login_token', newToken)

    // 8. 获取用户信息
    const info = await loginService.getUserInfo(newToken)
    authStore.userInfo = info

    // 9. 关闭对话框并显示成功提示
    showLoginProgress.value = false
    currentLoginUrl.value = ''
    ElMessage.success(t('common.loginSuccess'))
  } catch (error: any) {
    showLoginProgress.value = false
    ElMessage.error(error.message || t('common.loginFailed'))
  }
}

const handleCancelLogin = () => {
  showLoginProgress.value = false
  currentLoginUrl.value = ''
  ElMessage.info(t('common.loginCancelled'))
}

const handleOpenLoginUrl = async () => {
  if (!currentLoginUrl.value) return
  try {
    await platformService.openExternalUrl(currentLoginUrl.value)
    ElMessage.success('已再次尝试打开浏览器')
  } catch (error: any) {
    ElMessage.error(error.message || '再次打开浏览器失败')
  }
}

const handleCopyLoginUrl = async () => {
  if (!currentLoginUrl.value) return
  try {
    if ((window as any).require) {
      const { clipboard } = (window as any).require('electron')
      clipboard.writeText(currentLoginUrl.value)
    } else {
      await navigator.clipboard.writeText(currentLoginUrl.value)
    }
    ElMessage.success('登录链接已复制')
  } catch (error: any) {
    ElMessage.error(error.message || '复制登录链接失败')
  }
}

const handleUserCommand = (command: string) => {
  if (command === 'logout') {
    showLogoutConfirm.value = true
  }
}

const handleConfirmLogout = async () => {
  try {
    await authStore.logout()
    showLogoutConfirm.value = false
    ElMessage.success(t('common.logoutSuccess'))
  } catch (error: any) {
    ElMessage.error(error.message || t('common.logoutFailed'))
  }
}
</script>

<style lang="scss" scoped>
.user-login-button {
  .login-btn {
    background: #36d1c4;
    border: 1px solid #36d1c4;
    color: #fff;
    border-radius: 999px;
    padding: 8px 18px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 4px 10px rgba(27, 71, 125, 0.06);

    &:hover {
      background: #2bb5a9;
      border-color: #2bb5a9;
      color: #fff;
    }

    &.icon-only {
      width: 42px;
      height: 42px;
      padding: 0;
      border-radius: 999px;
      justify-content: center;

      :deep(span) {
        margin-left: 0;
      }
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
      background: #f5f5f5;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #36d1c4;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .nickname {
      font-size: 13px;
      color: #333;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.icon-only {
      width: 42px;
      height: 42px;
      padding: 0;
      justify-content: center;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #b9d1ee;

      .nickname {
        display: none;
      }

      .avatar,
      .avatar-placeholder {
        width: 28px;
        height: 28px;
      }
    }
  }

  .login-progress {
    text-align: center;
    padding: 20px 0;

    .is-loading {
      animation: spin 2s linear infinite;
      margin-bottom: 16px;
    }

    p {
      color: #666;
      font-size: 14px;
    }

    .login-manual {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #f0f0f0;
      text-align: left;

      .manual-tip {
        margin: 0 0 10px;
        color: #666;
        font-size: 13px;
      }

      .manual-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }

      .manual-url {
        padding: 10px 12px;
        border-radius: 8px;
        background: #f7f8fa;
        color: #555;
        font-size: 12px;
        line-height: 1.5;
        word-break: break-all;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
