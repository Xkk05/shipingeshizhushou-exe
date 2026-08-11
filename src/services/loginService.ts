import i18n from '@/i18n'

const { t } = i18n.global as any

const rawApiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || ''
const API_BASE_URL = rawApiBase.replace(/\/+$/, '')
const isElectron = (() => {
  if (typeof window === 'undefined') return false
  try {
    return Boolean((window as any).require?.('electron')?.ipcRenderer || (window as any).electron?.ipcRenderer)
  } catch {
    return Boolean((window as any).electron?.ipcRenderer)
  }
})()

const getElectronIpc = () => {
  if (!isElectron) return null
  try {
    if ((window as any).require) {
      return (window as any).require('electron').ipcRenderer
    }
    if ((window as any).electron?.ipcRenderer) {
      return (window as any).electron.ipcRenderer
    }
  } catch (error) {
    console.error('Failed to get Electron ipcRenderer:', error)
  }
  return null
}

const buildApiUrl = (pathname: string) => `${API_BASE_URL}${pathname}`

interface SignedNonce {
  nonce: string
  timestamp: number
  signature: string
}

interface SignedNonceResponse {
  code: number
  msg: string
  data: {
    signedNonce: SignedNonce
    encodedNonce: string
  }
}

interface TokenResponse {
  code: number
  msg: string
  time: number
  data: {
    token: string
  }
}

interface UserInfoResponse {
  code: number
  msg: string
  time: number
  data: {
    user_info: {
      avatar: string
      nickname: string
    }
  }
}

interface CheckLoginResponse {
  code: number
  msg: string
  time: number
  data: any[]
}

interface WebLoginUrlResponse {
  code: number
  msg: string
  time: number
  data: {
    login_url: string
  }
}

interface CustomUrlResponse {
  code: number
  msg: string
  time: number
  data: {
    url: string
  }
}

interface FeedbackUrlResponse {
  code: number
  msg: string
  time: number
  data: {
    url: string
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text.trim()) {
    throw new Error(t('common.networkError'))
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response from ${response.url}`)
  }
}

async function postJson<T>(pathname: string, body?: unknown): Promise<T> {
  const ipcRenderer = getElectronIpc()
  if (ipcRenderer) {
    const channelMap: Record<string, string> = {
      '/api/login/signed-nonce': 'login:get-signed-nonce',
      '/api/login/web-url': 'login:get-web-url',
      '/api/login/poll-token': 'login:poll-token',
      '/api/login/check': 'login:check',
      '/api/login/user-info': 'login:user-info',
      '/api/login/logout': 'login:logout',
      '/api/login/custom-url': 'login:custom-url',
      '/api/login/feedback-url': 'login:feedback-url',
    }
    const channel = channelMap[pathname]
    if (!channel) {
      throw new Error(`Unsupported desktop login path: ${pathname}`)
    }

    if (pathname === '/api/login/poll-token') {
      return await ipcRenderer.invoke(channel, (body as { client_nonce?: string } | undefined)?.client_nonce || '')
    }
    if (pathname === '/api/login/check' || pathname === '/api/login/user-info' || pathname === '/api/login/logout') {
      return await ipcRenderer.invoke(channel, (body as { token?: string } | undefined)?.token || '')
    }
    return await ipcRenderer.invoke(channel)
  }

  const response = await fetch(buildApiUrl(pathname), {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return parseJsonResponse<T>(response)
}

export async function getSignedNonce(): Promise<{ signedNonce: SignedNonce; encodedNonce: string }> {
  const result = await postJson<SignedNonceResponse>('/api/login/signed-nonce')
  if (result.code === 1) {
    return result.data
  }
  throw new Error(`${t('common.loginFailed')}: ${result.msg}`)
}

export async function getWebLoginUrl(): Promise<string> {
  const result = await postJson<WebLoginUrlResponse>('/api/login/web-url')
  if (result.code === 1) {
    return result.data.login_url
  }
  throw new Error(`${t('error.getLoginUrlFailed')}: ${result.msg}`)
}

export async function pollToken(
  encodedNonce: string,
  timeout: number = 300,
  onCancel?: () => boolean,
): Promise<string> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout * 1000) {
    if (onCancel && onCancel()) {
      throw new Error(t('common.loginCancelled'))
    }

    try {
      const result = await postJson<TokenResponse>('/api/login/poll-token', {
        client_nonce: encodedNonce,
      })

      if (result.code === 1) {
        return result.data.token
      }
    } catch (error) {
      console.error(`${t('error.pollFailed')}: ${error}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error(t('error.loginTimeout'))
}

export async function checkLogin(token: string): Promise<boolean> {
  try {
    const result = await postJson<CheckLoginResponse>('/api/login/check', { token })
    return result.code === 1
  } catch (error) {
    console.error(`Login check failed: ${error}`)
    return false
  }
}

export async function getUserInfo(token: string): Promise<{ avatar: string; nickname: string }> {
  const result = await postJson<UserInfoResponse>('/api/login/user-info', { token })
  if (result.code === 1) {
    return result.data.user_info
  }
  throw new Error(`Get user info failed: ${result.msg}`)
}

export async function logout(token: string): Promise<void> {
  const result = await postJson<{ code: number; msg: string }>('/api/login/logout', { token })
  if (result.code !== 1) {
    throw new Error(`Logout failed: ${result.msg}`)
  }
}

export async function getCustomUrl(): Promise<CustomUrlResponse> {
  const result = await postJson<CustomUrlResponse>('/api/login/custom-url')
  if (result.code === 1) {
    return result
  }
  throw new Error(`Get custom URL failed: ${result.msg}`)
}

export async function getFeedbackUrl(): Promise<FeedbackUrlResponse> {
  const result = await postJson<FeedbackUrlResponse>('/api/login/feedback-url')
  if (result.code === 1) {
    return result
  }
  throw new Error(`Get feedback URL failed: ${result.msg}`)
}
