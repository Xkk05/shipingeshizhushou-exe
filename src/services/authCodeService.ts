import i18n from '@/i18n'

const API_BASE_URL = 'https://api-web.kunqiongai.com'
const SOFT_NUMBER = '10005'

const { t } = i18n.global as any

export class AuthNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthNetworkError'
  }
}

export const isAuthNetworkError = (error: unknown): error is AuthNetworkError =>
  error instanceof AuthNetworkError || (error instanceof Error && error.name === 'AuthNetworkError')

interface CheckAuthCodeResponse {
  code: number
  msg: string
  time: number
  data: {
    is_need_auth_code: number
    auth_code_url?: string
  }
}

interface ValidateAuthCodeResponse {
  code: number
  msg: string
  time: number
  data: {
    auth_code_status: number
  }
}

const postAuthRequest = async <T>(pathname: string, body: Record<string, string>): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      throw new AuthNetworkError(`授权服务暂时不可用: HTTP ${response.status}`)
    }

    return await response.json() as T
  } catch (error) {
    if (isAuthNetworkError(error)) throw error
    throw new AuthNetworkError(error instanceof Error ? error.message : String(error))
  }
}

/**
 * 获取真实的机器码（通过 Electron 主进程）
 * 使用与 demo.py 相同的算法：CPU序列号 + MAC地址 + 主板序列号 的 SHA256 哈希
 */
export async function generateDeviceId(): Promise<string> {
  // 尝试从localStorage获取已存在的设备ID
  let deviceId = localStorage.getItem('device_id')
  if (deviceId) {
    return deviceId
  }

  try {
    // 通过 Electron IPC 获取真实的机器码
    const { ipcRenderer } = window.require('electron')
    deviceId = await ipcRenderer.invoke('get-machine-code')
    if (deviceId) {
      localStorage.setItem('device_id', deviceId)
      return deviceId
    }
  } catch (error) {
    console.warn('无法通过 Electron 获取机器码，使用备用方案:', error)
  }

  // 备用方案：使用浏览器指纹生成设备ID
  deviceId = await generateFallbackDeviceId()
  localStorage.setItem('device_id', deviceId)
  return deviceId
}

/**
 * 备用设备ID生成方案（用于非 Electron 环境或获取失败时）
 */
async function generateFallbackDeviceId(): Promise<string> {
  const components: string[] = []
  
  // 收集浏览器指纹信息
  components.push(navigator.userAgent)
  components.push(navigator.language)
  components.push(screen.width.toString())
  components.push(screen.height.toString())
  components.push(screen.colorDepth.toString())
  components.push(new Date().getTimezoneOffset().toString())
  components.push(navigator.hardwareConcurrency?.toString() || '0')
  
  // 使用 Web Crypto API 生成 SHA256 哈希
  const combined = components.join('|')
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

/**
 * 同步获取设备ID（从缓存中获取，如果没有则返回空字符串）
 */
export function getDeviceIdSync(): string {
  return localStorage.getItem('device_id') || ''
}

/**
 * 检查是否需要获取授权码
 */
export async function checkNeedAuthCode(): Promise<{ needAuth: boolean; authUrl?: string; deviceId?: string }> {
  const deviceId = await generateDeviceId()
  
  try {
    const result = await postAuthRequest<CheckAuthCodeResponse>('/soft_desktop/check_get_auth_code', {
      device_id: deviceId,
      soft_number: SOFT_NUMBER,
    })
    
    if (result.code === 1) {
      // 构建完整的授权码获取URL（与 demo.py 保持一致）
      let fullAuthUrl: string | undefined
      if (result.data.is_need_auth_code === 1 && result.data.auth_code_url) {
        fullAuthUrl = `${result.data.auth_code_url}?device_id=${deviceId}&software_code=${SOFT_NUMBER}`
      }
      
      return {
        needAuth: result.data.is_need_auth_code === 1,
        authUrl: fullAuthUrl,
        deviceId: deviceId
      }
    } else {
      throw new Error(result.msg || t('error.checkAuthCodeFailed'))
    }
  } catch (error) {
    console.warn(t('error.checkAuthCodeFailed') + ':', error)
    throw error
  }
}

/**
 * 验证授权码
 */
export async function validateAuthCode(authCode: string): Promise<boolean> {
  const deviceId = await generateDeviceId()
  
  try {
    const result = await postAuthRequest<ValidateAuthCodeResponse>('/soft_desktop/check_auth_code_valid', {
      device_id: deviceId,
      soft_number: SOFT_NUMBER,
      auth_code: authCode,
    })
    
    if (result.code === 1) {
      return result.data.auth_code_status === 1
    } else {
      throw new Error(result.msg || t('error.validateAuthCodeFailed'))
    }
  } catch (error) {
    console.warn(t('error.validateAuthCodeFailed') + ':', error)
    throw error
  }
}

/**
 * 保存授权码到本地
 */
export async function saveAuthCode(authCode: string): Promise<void> {
  const deviceId = await generateDeviceId()
  const authData = {
    code: authCode,
    timestamp: Date.now(),
    deviceId: deviceId
  }
  localStorage.setItem('auth_code_data', JSON.stringify(authData))
}

/**
 * 获取本地保存的授权码
 */
export function getLocalAuthCode(): string | null {
  try {
    const authDataStr = localStorage.getItem('auth_code_data')
    if (!authDataStr) return null
    
    const authData = JSON.parse(authDataStr)
    return authData.code || null
  } catch (error) {
    console.error('获取本地授权码失败:', error)
    return null
  }
}

/**
 * 清除本地授权码
 */
export function clearLocalAuthCode(): void {
  localStorage.removeItem('auth_code_data')
}

/**
 * 检查本地授权码是否仍然有效
 */
export async function checkLocalAuthCodeValid(): Promise<boolean> {
  const localAuthCode = getLocalAuthCode()
  if (!localAuthCode) return false
  
  try {
    const isValid = await validateAuthCode(localAuthCode)
    if (!isValid) clearLocalAuthCode()
    return isValid
  } catch (error) {
    if (isAuthNetworkError(error)) {
      console.warn('授权服务暂时不可用，保留本地授权码:', error)
      return true
    }

    console.warn('检查本地授权码有效性失败:', error)
    clearLocalAuthCode()
    return false
  }
}
