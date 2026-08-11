import { ref } from 'vue'
import { useAuthCodeStore } from '@/stores/authCodeStore'
import { useI18n } from 'vue-i18n'
import { platformService } from '@/services/platformService'

export function useAuthCheck() {
  const { t } = useI18n()
  const authCodeStore = useAuthCodeStore()
  const showAuthDialog = ref(false)
  let pendingCallback: (() => void | Promise<void>) | null = null

  const checkAuthAndExecute = async (callback: () => void | Promise<void>) => {
    if (!platformService.isElectron) {
      await callback()
      return
    }

    try {
      const isAuthorized = await authCodeStore.checkAuthBeforeAction()

      if (isAuthorized) {
        await callback()
      } else {
        pendingCallback = callback
        showAuthDialog.value = true
      }
    } catch (error) {
      console.error(t('error.authCheckFailed') + ':', error)
      pendingCallback = callback
      showAuthDialog.value = true
    }
  }

  const handleAuthSuccess = async () => {
    showAuthDialog.value = false
    if (pendingCallback) {
      await pendingCallback()
      pendingCallback = null
    }
  }

  return {
    showAuthDialog,
    checkAuthAndExecute,
    handleAuthSuccess,
  }
}
