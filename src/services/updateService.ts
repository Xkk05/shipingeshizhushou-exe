import { APP_CONFIG } from '../config/app.config'
import i18n from '@/i18n'

const { t } = i18n.global as any

const UPDATE_API_BASE = 'http://software.kunqiongai.com:8000'

export interface UpdateInfo {
  has_update: boolean
  version?: string
  update_log?: string
  download_url?: string
  package_size?: number
  package_hash?: string
  is_mandatory?: boolean
  release_date?: string
}

export const updateService = {
  /**
   * 检查更新
   */
  async checkUpdate(): Promise<UpdateInfo> {
    try {
      const url = `${UPDATE_API_BASE}/api/v1/updates/check/?software=${APP_CONFIG.SOFTWARE_ID}&version=${APP_CONFIG.VERSION}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(t('error.networkError'))
      }
      return await response.json()
    } catch (error) {
      console.error(t('error.checkUpdateFailed') + ':', error)
      return { has_update: false }
    }
  },

  /**
   * 启动更新程序
   * @param updateInfo 更新信息
   */
  async startUpdate(updateInfo: UpdateInfo) {
    if (!updateInfo.download_url) return

    const { ipcRenderer } = (window as any).require('electron')
    
    // 发送指令给主进程执行更新程序
    ipcRenderer.send('start-updater', {
      url: updateInfo.download_url,
      hash: updateInfo.package_hash || '',
      version: updateInfo.version
    })
  }
}
