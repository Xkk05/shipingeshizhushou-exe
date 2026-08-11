import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as loginService from '@/services/loginService'
import i18n from '@/i18n'

import { platformService } from '@/services/platformService'

const { t } = i18n.global as any

interface UserInfo {
  avatar: string
  nickname: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const userInfo = ref<UserInfo | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pollCancelFlag = ref(false)

  // 从localStorage恢复token
  const initToken = () => {
    const savedToken = localStorage.getItem('login_token')
    if (savedToken) {
      token.value = savedToken
    }
  }

  // 计算属性：是否已登录
  const isLoggedIn = computed(() => !!token.value)

  /**
   * 启动登录流程
   */
  const startLogin = async () => {
    isLoading.value = true
    error.value = null
    pollCancelFlag.value = false

    try {
      // 1. 生成带签名的nonce
      const { encodedNonce } = await loginService.getSignedNonce()

      // 2. 获取网页端登录地址
      const webLoginUrl = await loginService.getWebLoginUrl()

      // 3. 构造完整的登录URL
      const loginUrl = `${webLoginUrl}?client_type=desktop&client_nonce=${encodedNonce}`

      // 4. 尝试打开外部浏览器
      platformService.openExternalUrl(loginUrl)

      // 5. 启动轮询获取Token
      const newToken = await loginService.pollToken(encodedNonce, 300, () => pollCancelFlag.value)

      // 6. 保存token
      token.value = newToken
      localStorage.setItem('login_token', newToken)

      // 7. 获取用户信息
      const info = await loginService.getUserInfo(newToken)
      userInfo.value = info

      return true
    } catch (err: any) {
      error.value = err.message || t('common.loginFailed')
      console.error(t('error.loginError') + '：', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 取消登录
   */
  const cancelLogin = () => {
    pollCancelFlag.value = true
    isLoading.value = false
  }

  /**
   * 验证并恢复登录状态
   */
  const verifyLogin = async () => {
    if (!token.value) return false

    try {
      const isValid = await loginService.checkLogin(token.value)
      if (isValid) {
        // 获取用户信息
        const info = await loginService.getUserInfo(token.value)
        userInfo.value = info
        return true
      } else {
        // Token无效，清除
        clearLogin()
        return false
      }
    } catch (err) {
      console.error(t('error.verifyLoginFailed') + '：', err)
      clearLogin()
      return false
    }
  }

  /**
   * 退出登录
   */
  const logout = async () => {
    if (!token.value) return

    try {
      await loginService.logout(token.value)
    } catch (err) {
      console.error(t('common.logoutFailed') + '：', err)
    } finally {
      clearLogin()
    }
  }

  /**
   * 清除登录信息
   */
  const clearLogin = () => {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('login_token')
  }

  return {
    token,
    userInfo,
    isLoading,
    error,
    isLoggedIn,
    initToken,
    startLogin,
    cancelLogin,
    verifyLogin,
    logout,
    clearLogin,
  }
})
