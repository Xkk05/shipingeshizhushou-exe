// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkLocalAuthCodeValid,
  getLocalAuthCode,
} from '../src/services/authCodeService'

describe('auth code local validation', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    localStorage.setItem('device_id', 'test-device')
  })

  it('keeps the local auth code when the auth service is temporarily unreachable', async () => {
    localStorage.setItem('auth_code_data', JSON.stringify({ code: 'LOCAL-CODE' }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(checkLocalAuthCodeValid()).resolves.toBe(true)
    expect(getLocalAuthCode()).toBe('LOCAL-CODE')
  })

  it('clears the local auth code when the service confirms it is invalid', async () => {
    localStorage.setItem('auth_code_data', JSON.stringify({ code: 'LOCAL-CODE' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 1,
        msg: 'ok',
        time: Date.now(),
        data: { auth_code_status: 0 },
      }),
    }))

    await expect(checkLocalAuthCodeValid()).resolves.toBe(false)
    expect(getLocalAuthCode()).toBeNull()
  })
})

