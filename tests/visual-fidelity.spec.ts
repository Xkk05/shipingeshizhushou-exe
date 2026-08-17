import { expect, type Locator, type Page, test, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const routes = [
  { id: 'video-convert', title: '视频格式转换' },
  { id: 'video-compress', title: '视频压缩' },
  { id: 'audio-convert', title: '音频格式转换' },
  { id: 'video-extract-audio', title: '视频提取音频' },
  { id: 'video-to-gif', title: '视频转GIF' },
  { id: 'video-merge', title: '视频合并' },
  { id: 'video-watermark', title: '视频水印' },
] as const

const settingsRoutes = [
  { id: 'video-convert', scope: 'video', open: 'format-selector', targetFormat: 'MKV' },
  { id: 'video-compress', scope: 'video', open: 'row-settings', targetFormat: 'WEBM' },
  { id: 'video-merge', scope: 'video', open: 'format-selector', targetFormat: 'MOV' },
  { id: 'video-watermark', scope: 'video', open: 'format-selector', targetFormat: 'FLV' },
  { id: 'audio-convert', scope: 'audio', open: 'format-selector', targetFormat: 'WAV' },
  { id: 'video-extract-audio', scope: 'audio', open: 'format-selector', targetFormat: 'FLAC' },
] as const

const sampleVideoPath = path.resolve(process.cwd(), 'test-media/sample-small.mp4')

test.beforeEach(async ({ page }) => {
  const browserErrors: string[] = []
  await page.route('**/api/progress**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })

  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    const text = message.text()
    const sourceUrl = message.location().url
    if (message.type() === 'error' && !/favicon|ResizeObserver|\/api\/progress|Failed to fetch progress/i.test(`${text} ${sourceUrl}`)) {
      browserErrors.push(text)
    }
  })
  ;(page as Page & { browserErrors?: string[] }).browserErrors = browserErrors
})

test.afterEach(async ({ page }) => {
  const browserErrors = (page as Page & { browserErrors?: string[] }).browserErrors || []
  expect(browserErrors).toEqual([])
})

const gotoModule = async (page: Page, routeId: string) => {
  await page.goto(`/${routeId}?lang=zh-CN`)
  await expect(page.locator('.module-page')).toBeVisible()
  await expect(page.locator('.content-area')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

const assertVisiblePage = async (page: Page) => {
  const metrics = await page.evaluate(() => {
    const modulePage = document.querySelector('.module-page')?.getBoundingClientRect()
    const interactive = Array.from(document.querySelectorAll('button, .format-selector, .drop-zone, .batch-settings'))
      .some((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return rect.width > 20 && rect.height > 20 && style.visibility !== 'hidden' && style.display !== 'none'
      })

    return {
      bodyTextLength: document.body.innerText.trim().length,
      moduleHeight: modulePage?.height || 0,
      interactive,
    }
  })

  expect(metrics.bodyTextLength).toBeGreaterThan(40)
  expect(metrics.moduleHeight).toBeGreaterThan(300)
  expect(metrics.interactive).toBe(true)
}

const capture = async (page: Page, testInfo: TestInfo, name: string) => {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  })
}

const addSampleVideoByDrop = async (page: Page) => {
  const bytes = fs.readFileSync(sampleVideoPath)
  const dataTransfer = await page.evaluateHandle(({ fileName, data }) => {
    const transfer = new DataTransfer()
    const file = new File([new Uint8Array(data)], fileName, { type: 'video/mp4' })
    transfer.items.add(file)
    return transfer
  }, {
    fileName: path.basename(sampleVideoPath),
    data: Array.from(bytes),
  })

  await page.locator('.drop-zone').dispatchEvent('drop', { dataTransfer })
  await expect(page.locator('.file-list')).toBeVisible()
}

const openSettings = async (page: Page, mode: 'format-selector' | 'row-settings') => {
  if (mode === 'row-settings') {
    await addSampleVideoByDrop(page)
    await page.locator('.file-list .setting-btn, .file-list-wrapper .setting-btn').first().click()
  } else {
    await page.locator('.format-selector').first().click()
  }

  const dialog = page.locator('.settings-dialog .dialog-content')
  await expect(dialog).toBeVisible()
  return dialog
}

const selectFormat = async (dialog: Locator, format: string) => {
  await dialog.locator('.format-item').filter({ hasText: format }).first().click()
  await expect(dialog.locator('.format-item.active')).toContainText(format)
}

const confirmSettings = async (page: Page) => {
  await page.locator('.settings-dialog .dialog-footer button').filter({ hasText: '确定' }).click()
  await expect(page.locator('.settings-dialog .dialog-content')).toBeHidden()
}

const chooseVisibleSelectOption = async (page: Page, dialog: Locator, index: number, optionText: string) => {
  const select = dialog.locator('.settings-content:visible .el-select').nth(index)
  await select.click()
  await page.locator('.el-select-dropdown:visible .el-select-dropdown__item').filter({ hasText: optionText }).last().click()
  await expect(select).toContainText(optionText)
}

test('seven modules render in browser with visual screenshot artifacts', async ({ page }, testInfo) => {
  for (const viewport of [
    { id: 'desktop', width: 1440, height: 900 },
    { id: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const route of routes) {
      await gotoModule(page, route.id)
      await expect(page.getByText(route.title).first()).toBeVisible()
      await assertVisiblePage(page)
      await capture(page, testInfo, `${viewport.id}-${route.id}`)
    }
  }
})

test('settings dialogs expose only workflow-appropriate formats', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const route of settingsRoutes) {
    await gotoModule(page, route.id)
    const dialog = await openSettings(page, route.open)
    const names = await dialog.locator('.format-name').allInnerTexts()

    if (route.scope === 'video') {
      expect(names).toContain('MP4')
      expect(names).toContain('MKV')
      expect(names).not.toContain('MP3')
      expect(names).not.toContain('WAV')
    } else {
      expect(names).toContain('MP3')
      expect(names).toContain('WAV')
      expect(names).not.toContain('MP4')
      expect(names).not.toContain('MKV')
    }

    await selectFormat(dialog, route.targetFormat)
    await capture(page, testInfo, `settings-${route.id}-${route.targetFormat}`)
    await confirmSettings(page)

    if (route.open === 'format-selector') {
      await expect(page.locator('.format-selector').first()).toContainText(route.targetFormat)
    }
  }
})

test('video compression advanced settings persist after confirm and reopen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await gotoModule(page, 'video-compress')

  let dialog = await openSettings(page, 'row-settings')
  await dialog.locator('.settings-tabs span').filter({ hasText: '详细设置' }).click()
  await chooseVisibleSelectOption(page, dialog, 0, 'H265')
  await chooseVisibleSelectOption(page, dialog, 4, 'AC3')
  await chooseVisibleSelectOption(page, dialog, 5, '单声道')
  await chooseVisibleSelectOption(page, dialog, 6, '44100Hz')
  await capture(page, testInfo, 'video-compress-advanced-before-confirm')
  await confirmSettings(page)

  await page.locator('.file-list .setting-btn, .file-list-wrapper .setting-btn').first().click()
  dialog = page.locator('.settings-dialog .dialog-content')
  await expect(dialog).toBeVisible()
  await dialog.locator('.settings-tabs span').filter({ hasText: '详细设置' }).click()

  await expect(dialog.locator('.settings-content:visible .el-select').nth(0)).toContainText('H265')
  await expect(dialog.locator('.settings-content:visible .el-select').nth(4)).toContainText('AC3')
  await expect(dialog.locator('.settings-content:visible .el-select').nth(5)).toContainText('单声道')
  await expect(dialog.locator('.settings-content:visible .el-select').nth(6)).toContainText('44100Hz')
  await capture(page, testInfo, 'video-compress-advanced-after-reopen')
})
