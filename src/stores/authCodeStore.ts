import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as authCodeService from '@/services/authCodeService'
import i18n from '@/i18n'
import { platformService } from '@/services/platformService'

const { t } = i18n.global as any

export const useAuthCodeStore = defineStore('authCode', () => {
  const isAuthorized = ref(false)
  const authCode = ref<string | null>(null)
  const authUrl = ref<string | null>(null)
  const deviceId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const initAuthStatus = async () => {
    if (!platformService.isElectron) {
      isAuthorized.value = true
      authUrl.value = null
      error.value = null
      return true
    }

    try {
      deviceId.value = await authCodeService.generateDeviceId()

      const localAuthCode = authCodeService.getLocalAuthCode()
      if (localAuthCode) {
        const isValid = await authCodeService.checkLocalAuthCodeValid()
        if (isValid) {
          authCode.value = localAuthCode
          isAuthorized.value = true
          return true
        }
      }

      const result = await authCodeService.checkNeedAuthCode()
      if (!result.needAuth) {
        isAuthorized.value = true
        return true
      }

      authUrl.value = result.authUrl || null
      isAuthorized.value = false
      return false
    } catch (err: any) {
      error.value = err.message || t('error.initAuthStatusFailed')
      isAuthorized.value = false
      return false
    }
  }

  const validateAuthCode = async (code: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const isValid = await authCodeService.validateAuthCode(code)

      if (isValid) {
        await authCodeService.saveAuthCode(code)
        authCode.value = code
        isAuthorized.value = true
        return true
      }

      error.value = t('error.authCodeInvalidOrExpired')
      return false
    } catch (err: any) {
      error.value = err.message || t('error.validateAuthCodeFailed')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const clearAuth = () => {
    authCodeService.clearLocalAuthCode()
    authCode.value = null
    isAuthorized.value = false
    error.value = null
  }

  const checkAuthBeforeAction = async (): Promise<boolean> => {
    if (!platformService.isElectron) {
      isAuthorized.value = true
      return true
    }

    if (isAuthorized.value) {
      return true
    }

    return await initAuthStatus()
  }

  const getDeviceId = async (): Promise<string> => {
    if (!deviceId.value) {
      deviceId.value = await authCodeService.generateDeviceId()
    }
    return deviceId.value
  }

  return {
    isAuthorized,
    authCode,
    authUrl,
    deviceId,
    isLoading,
    error,
    initAuthStatus,
    validateAuthCode,
    clearAuth,
    checkAuthBeforeAction,
    getDeviceId,
  }
})
