import { app, BrowserWindow, ipcMain, dialog, session } from 'electron'
import path from 'path'
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg'
import * as crypto from 'crypto'
import { execSync, spawn } from 'child_process'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import {
  createVideoConversionPlan,
  outputExtensionFromPath,
  outputFormatFromPath,
  outputSizeFromSettings,
  type VideoConversionSettings,
} from './videoConversionProfiles'

// ==================== 机器码生成功能 ====================

/**
 * 获取CPU序列号（Windows系统）
 */
function getCpuInfo(): string | null {
  try {
    if (process.platform === 'win32') {
      const result = execSync('wmic cpu get ProcessorId', { encoding: 'utf8', windowsHide: true })
      const lines = result.trim().split('\n')
      if (lines.length >= 2) {
        return lines[1].trim()
      }
    }
  } catch (error) {
    console.error('获取CPU信息失败:', error)
  }
  return null
}

/**
 * 获取MAC地址
 */
function getMacAddress(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name]
    if (netInterface) {
      for (const info of netInterface) {
        // 跳过内部接口和没有MAC地址的接口
        if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
          return info.mac.toUpperCase().replace(/:/g, '-')
        }
      }
    }
  }
  // 如果没有找到有效的MAC地址，返回一个基于UUID的值
  const macNum = BigInt('0x' + crypto.randomUUID().replace(/-/g, '').substring(0, 12))
  const macHex = macNum.toString(16).toUpperCase().padStart(12, '0')
  return macHex.match(/.{2}/g)?.join('-') || ''
}

/**
 * 获取主板序列号（Windows系统）
 */
function getBoardSerial(): string | null {
  try {
    if (process.platform === 'win32') {
      const result = execSync('wmic baseboard get SerialNumber', { encoding: 'utf8', windowsHide: true })
      const lines = result.trim().split('\n')
      if (lines.length >= 2) {
        const serial = lines[1].trim()
        if (serial && serial !== 'To Be Filled By O.E.M.') {
          return serial
        }
      }
    }
  } catch (error) {
    console.error('获取主板序列号失败:', error)
  }
  return null
}

/**
 * 生成唯一机器码（与 demo.py 算法一致）
 * 组合 CPU序列号 + MAC地址 + 主板序列号，然后 SHA256 哈希
 */
function generateMachineCode(): string {
  const hardwareInfos: string[] = []
  
  // 1. CPU序列号
  const cpuInfo = getCpuInfo()
  if (cpuInfo) {
    hardwareInfos.push(cpuInfo)
  }
  
  // 2. MAC地址
  const macInfo = getMacAddress()
  hardwareInfos.push(macInfo)
  
  // 3. 主板序列号（Windows）
  const boardSerial = getBoardSerial()
  if (boardSerial) {
    hardwareInfos.push(boardSerial)
  }
  
  // 组合所有信息并哈希
  const combined = hardwareInfos.join('|')
  const machineCode = crypto.createHash('sha256').update(combined, 'utf8').digest('hex')
  
  console.log('Hardware infos:', hardwareInfos)
  console.log('Generated machine code:', machineCode)
  
  return machineCode
}

// ==================== FFmpeg 配置 ====================

// 获取ffmpeg路径 - 处理打包后的路径
function getFFmpegPath(): string {
  try {
    const fs = require('fs')

    // Linux/WSL 环境优先使用系统安装的 ffmpeg，避免打包时混入 Windows 版本依赖
    if (process.platform === 'linux' && fs.existsSync('/usr/bin/ffmpeg')) {
      console.log('Using system FFmpeg path:', '/usr/bin/ffmpeg')
      return '/usr/bin/ffmpeg'
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    let ffmpegPath = ffmpegInstaller.path
    
    console.log('Original FFmpeg path:', ffmpegPath)
    console.log('app.isPackaged:', app.isPackaged)
    
    // 打包后需要替换 app.asar 为 app.asar.unpacked
    if (app.isPackaged) {
      // 使用正则替换所有 app.asar（不带 .unpacked 的）
      ffmpegPath = ffmpegPath.replace(/app\.asar(?!\.unpacked)/g, 'app.asar.unpacked')
    }
    
    console.log('Final FFmpeg path:', ffmpegPath)
    
    // 检查文件是否存在
      if (!fs.existsSync(ffmpegPath)) {
        console.error('FFmpeg not found at:', ffmpegPath)
      }
    
    return ffmpegPath
  } catch (e) {
    console.error('Failed to get ffmpeg path:', e)
    return ''
  }
}

function getFFprobePath(): string {
  try {
    const fs = require('fs')

    // Linux/WSL 环境优先使用系统安装的 ffprobe，避免打包时混入 Windows 版本依赖
    if (process.platform === 'linux' && fs.existsSync('/usr/bin/ffprobe')) {
      console.log('Using system FFprobe path:', '/usr/bin/ffprobe')
      return '/usr/bin/ffprobe'
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe')
    let ffprobePath = ffprobeInstaller.path
    
    console.log('Original FFprobe path:', ffprobePath)
    
    if (app.isPackaged) {
      ffprobePath = ffprobePath.replace(/app\.asar(?!\.unpacked)/g, 'app.asar.unpacked')
    }
    
    console.log('Final FFprobe path:', ffprobePath)
    
      if (!fs.existsSync(ffprobePath)) {
        console.error('FFprobe not found at:', ffprobePath)
      }
    
    return ffprobePath
  } catch (e) {
    console.error('Failed to get ffprobe path:', e)
    return ''
  }
}

// 延迟设置ffmpeg路径
let ffmpegConfigured = false
function configureFFmpeg() {
  if (ffmpegConfigured) return
  
  const ffmpegPath = getFFmpegPath()
  const ffprobePath = getFFprobePath()
  
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
  if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath)
  
  ffmpegConfigured = true
}

const applyCompressionCodecs = (command: ffmpeg.FfmpegCommand, ext: string) => {
  if (ext === 'webm') return command.videoCodec('libvpx-vp9').audioCodec('libopus')
  if (ext === 'avi') return command.videoCodec('mpeg4').audioCodec('libmp3lame')
  if (ext === 'wmv') return command.videoCodec('wmv2').audioCodec('wmav2')
  if (ext === 'swf') return command.videoCodec('libx264').audioCodec('aac')
  if (ext === 'mpg' || ext === 'mpeg' || ext === 'vob') return command.videoCodec('mpeg2video').audioCodec('mp2')
  if (ext === 'ogv') return command.videoCodec('libvpx').audioCodec('libvorbis')
  return command.videoCodec('libx264').audioCodec('aac')
}

let mainWindow: BrowserWindow | null = null

// 存储转换任务
const convertTasks = new Map<string, ffmpeg.FfmpegCommand>()

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
}

// 设置 AppUserModelId，确保任务栏图标正确显示
const APP_ID = 'com.kunqiu.video-converter'
app.setAppUserModelId(APP_ID)
const REMOTE_API_BASE = 'https://api-web.kunqiongai.com'
const LOGIN_SECRET_KEY = process.env.LOGIN_SECRET_KEY || '7530bfb1ad6c41627b0f0620078fa5ed'

function encodeSignedNonce(payload: { nonce: string; timestamp: number; signature: string }) {
  return Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function generateSignedNonce() {
  const nonce = uuidv4().replace(/-/g, '')
  const timestamp = Math.floor(Date.now() / 1000)
  const message = `${nonce}|${timestamp}`
  const signature = crypto.createHmac('sha256', LOGIN_SECRET_KEY).update(message, 'utf8').digest('base64')

  return {
    nonce,
    timestamp,
    signature,
  }
}

async function proxyLoginApi(pathname: string, options: { method?: 'GET' | 'POST'; token?: string; body?: URLSearchParams } = {}) {
  const response = await fetch(`${REMOTE_API_BASE}${pathname}`, {
    method: options.method || 'POST',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.token ? { token: options.token } : {}),
    },
    body: options.body?.toString(),
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Remote API request failed: ${response.status} ${text}`.trim())
  }

  if (!text.trim()) {
    throw new Error(`Remote API returned empty response for ${pathname}`)
  }

  return JSON.parse(text)
}

function isWSL() {
  if (process.platform !== 'linux') {
    return false
  }

  if ('WSL_DISTRO_NAME' in process.env || 'WSL_INTEROP' in process.env) {
    return true
  }

  try {
    const fs = require('fs')
    const procVersion = fs.existsSync('/proc/version') ? fs.readFileSync('/proc/version', 'utf8').toLowerCase() : ''
    const osRelease = os.release().toLowerCase()
    return procVersion.includes('microsoft') || osRelease.includes('microsoft')
  } catch {
    return false
  }
}

async function openExternalUrlWithFallback(url: string) {
  const { shell } = require('electron')

  if (isWSL()) {
    try {
      const escapedUrl = url.replace(/'/g, "''")
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Start-Process',
        `'${escapedUrl}'`
      ], {
        detached: true,
        stdio: 'ignore',
      })
      child.once('error', (err) => {
        throw err
      })
      child.unref()
      return { success: true, method: 'powershell-start-process' }
    } catch (err) {
      console.error('powershell.exe Start-Process failed:', err)
    }
  }

  try {
    await shell.openExternal(url)
    return { success: true, method: 'shell.openExternal' }
  } catch (err) {
    console.error('shell.openExternal failed:', err)
  }

  if (process.platform === 'linux') {
    try {
      const child = spawn('xdg-open', [url], {
        detached: true,
        stdio: 'ignore',
      })
      child.once('error', (err) => {
        throw err
      })
      child.unref()
      return { success: true, method: 'xdg-open' }
    } catch (err) {
      console.error('xdg-open failed:', err)
    }
  }

  throw new Error(`Failed to open external URL: ${url}`)
}

async function openPathWithFallback(targetPath: string) {
  const { shell } = require('electron')
  const fs = require('fs')

  if (!targetPath) {
    throw new Error('Path is empty')
  }

  const normalizedPath = path.normalize(targetPath)
  const existingPath = fs.existsSync(normalizedPath)
    ? normalizedPath
    : fs.existsSync(path.dirname(normalizedPath))
      ? path.dirname(normalizedPath)
      : normalizedPath

  console.log('[openPathWithFallback] targetPath =', targetPath)
  console.log('[openPathWithFallback] normalizedPath =', normalizedPath)
  console.log('[openPathWithFallback] existingPath =', existingPath)
  console.log('[openPathWithFallback] process.platform =', process.platform)
  console.log('[openPathWithFallback] isWSL =', isWSL())

  if (isWSL()) {
    try {
      const wslpath = spawn('wslpath', ['-w', existingPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      const windowsPath = await new Promise<string>((resolve, reject) => {
        let stdout = ''
        let stderr = ''

        wslpath.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString()
        })

        wslpath.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString()
        })

        wslpath.once('error', reject)
        wslpath.once('close', (code: number | null) => {
          if (code === 0) {
            resolve(stdout.trim())
            return
          }
          reject(new Error(stderr.trim() || `wslpath exited with code ${code ?? 'unknown'}`))
        })
      })

      if (windowsPath) {
        const normalizedWindowsPath = windowsPath.replace(/\//g, '\\')
        const windowsExplorerPath = '/mnt/c/Windows/explorer.exe'
        console.log('[openPathWithFallback] windowsPath =', windowsPath)
        console.log('[openPathWithFallback] normalizedWindowsPath =', normalizedWindowsPath)
        console.log('[openPathWithFallback] windowsExplorerPath exists =', fs.existsSync(windowsExplorerPath))

        if (fs.existsSync(windowsExplorerPath)) {
          const child = spawn(windowsExplorerPath, [normalizedWindowsPath], {
            detached: true,
            stdio: 'ignore',
          })
          console.log('[openPathWithFallback] launched via windows-explorer.exe')
          child.unref()
          return { success: true, method: 'windows-explorer.exe' }
        }

        const child = spawn('cmd.exe', [
          '/c',
          'start',
          '',
          normalizedWindowsPath
        ], {
          detached: true,
          stdio: 'ignore',
        })
        console.log('[openPathWithFallback] launched via cmd start')
        child.unref()
        return { success: true, method: 'cmd-start' }
      }
    } catch (err) {
      console.error('WSL explorer.exe open failed:', err)
    }
  }

  try {
    const result = await shell.openPath(existingPath)
    if (!result) {
      console.log('[openPathWithFallback] opened via shell.openPath')
      return { success: true, method: 'shell.openPath' }
    }
    console.error('shell.openPath failed:', result)
  } catch (err) {
    console.error('shell.openPath threw error:', err)
  }

  if (process.platform === 'linux') {
    try {
      const child = spawn('xdg-open', [existingPath], {
        detached: true,
        stdio: 'ignore',
      })
      console.log('[openPathWithFallback] launched via xdg-open')
      child.once('error', (err) => {
        throw err
      })
      child.unref()
      return { success: true, method: 'xdg-open' }
    } catch (err) {
      console.error('xdg-open path open failed:', err)
    }
  }

  throw new Error(`Failed to open path: ${existingPath}`)
}

function resolvePlatformIconPath(): string {
  const fs = require('fs')
  const candidateNames =
    process.platform === 'linux'
      ? ['app-icon.png', 'icon.png']
      : process.platform === 'darwin'
        ? ['app-icon.png', 'icon.png', 'app-icon.icns']
        : ['app-icon.ico', '视频格式转换器.ico', 'app.ico', 'icon.ico']

  const baseDirs = app.isPackaged
    ? [process.resourcesPath]
    : [path.join(__dirname, '../build'), path.join(process.cwd(), 'build'), path.join(__dirname, '../public'), path.join(process.cwd(), 'public')]

  for (const baseDir of baseDirs) {
    for (const name of candidateNames) {
      const candidate = path.join(baseDir, name)
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }

  return path.join(process.cwd(), 'public/app-icon.ico')
}

function createWindow() {
  const iconPath = resolvePlatformIconPath()
  console.log('Icon path:', iconPath)

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 1000,
    minHeight: 800,
    frame: false,
    icon: iconPath,
    show: false, // 先不显示窗口
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  })

  // 设置应用程序图标（用于任务栏）
  if (mainWindow) {
    mainWindow.setIcon(iconPath)
  }

  const notifyWindowMaximizedChange = () => {
    mainWindow?.webContents.send('window-maximized-change', mainWindow.isMaximized())
  }
  mainWindow.on('maximize', notifyWindowMaximizedChange)
  mainWindow.on('unmaximize', notifyWindowMaximizedChange)

  // 禁用CSP以允许外部API调用
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
      }
    })
  })

  // 当页面准备好显示时才显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // 强制刷新渲染
    if (mainWindow?.webContents) {
      mainWindow.webContents.executeJavaScript(`
        // 强制重新计算布局
        document.body.style.display = 'none';
        document.body.offsetHeight; // 触发重排
        document.body.style.display = '';
        
        // 触发窗口resize事件以确保组件正确渲染
        window.dispatchEvent(new Event('resize'));
        
        // 延迟再次触发resize确保所有组件都正确渲染
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      `).catch(console.error)
    }
  })

  // 页面加载完成后的额外处理
  mainWindow.webContents.once('did-finish-load', () => {
    // 延迟显示以确保所有内容都已渲染
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show()
      }
      // 再次触发resize事件
      mainWindow?.webContents.executeJavaScript(`
        window.dispatchEvent(new Event('resize'));
      `).catch(console.error)
    }, 200)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  
  // 设置应用程序图标
  if (process.platform === 'win32') {
    const iconPath = resolvePlatformIconPath()
    
    // 设置应用程序图标
    if (mainWindow) {
      mainWindow.setIcon(iconPath)
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 窗口控制
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window-is-maximized', async () => mainWindow?.isMaximized() || false)
ipcMain.on('window-close', () => mainWindow?.close())

// 获取机器码（用于授权验证）
ipcMain.handle('get-machine-code', async () => {
  return generateMachineCode()
})

ipcMain.handle('login:get-signed-nonce', async () => {
  const signedNonce = generateSignedNonce()
  return {
    code: 1,
    msg: 'success',
    data: {
      signedNonce,
      encodedNonce: encodeSignedNonce(signedNonce),
    },
  }
})

ipcMain.handle('login:get-web-url', async () => {
  return proxyLoginApi('/soft_desktop/get_web_login_url')
})

ipcMain.handle('login:poll-token', async (_, clientNonce: string) => {
  return proxyLoginApi('/user/desktop_get_token', {
    body: new URLSearchParams({
      client_type: 'desktop',
      client_nonce: clientNonce,
    }),
  })
})

ipcMain.handle('login:check', async (_, token: string) => {
  return proxyLoginApi('/user/check_login', {
    body: new URLSearchParams({ token }),
  })
})

ipcMain.handle('login:user-info', async (_, token: string) => {
  return proxyLoginApi('/soft_desktop/get_user_info', { token })
})

ipcMain.handle('login:logout', async (_, token: string) => {
  return proxyLoginApi('/logout', { token })
})

ipcMain.handle('login:custom-url', async () => {
  return proxyLoginApi('/soft_desktop/get_custom_url')
})

ipcMain.handle('login:feedback-url', async () => {
  return proxyLoginApi('/soft_desktop/get_feedback_url')
})

// 选择文件
ipcMain.handle('select-files', async (_, filters) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  return result.filePaths
})

// 选择文件夹（添加文件夹中的所有视频文件）
ipcMain.handle('select-folder', async (_, extensions: string[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.filePaths.length === 0) return []
  
  const fs = require('fs')
  const folderPath = result.filePaths[0]
  const files: string[] = []
  
  // 读取文件夹中的所有文件
  const items = fs.readdirSync(folderPath)
  for (const item of items) {
    const filePath = path.join(folderPath, item)
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase().slice(1)
      if (extensions.includes(ext)) {
        files.push(filePath)
      }
    }
  }
  return files
})

// 扫描拖拽的文件夹路径（支持递归扫描）
ipcMain.handle('scan-dropped-paths', async (_, paths: string[], extensions: string[]) => {
  const fs = require('fs')
  const allFiles: string[] = []
  
  // 递归扫描文件夹的函数
  const scanDirectory = (dirPath: string, maxDepth: number = 3, currentDepth: number = 0): string[] => {
    const files: string[] = []
    
    if (currentDepth >= maxDepth) return files
    
    try {
      const items = fs.readdirSync(dirPath)
      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        try {
          const stat = fs.statSync(itemPath)
          if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase().slice(1)
            if (extensions.includes(ext)) {
              files.push(itemPath)
            }
          } else if (stat.isDirectory()) {
            // 递归扫描子文件夹
            files.push(...scanDirectory(itemPath, maxDepth, currentDepth + 1))
          }
        } catch (error) {
          // 忽略无法访问的文件/文件夹
          console.warn('无法访问:', itemPath, error)
        }
      }
    } catch (error) {
      console.warn('无法读取目录:', dirPath, error)
    }
    
    return files
  }
  
  for (const itemPath of paths) {
    try {
      const stat = fs.statSync(itemPath)
      if (stat.isFile()) {
        // 如果是文件，直接检查扩展名
        const ext = path.extname(itemPath).toLowerCase().slice(1)
        if (extensions.includes(ext)) {
          allFiles.push(itemPath)
        }
      } else if (stat.isDirectory()) {
        // 如果是文件夹，递归扫描
        allFiles.push(...scanDirectory(itemPath))
      }
    } catch (error) {
      console.warn('无法访问路径:', itemPath, error)
    }
  }
  
  return allFiles
})

// 选择输出目录
ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

// 获取视频信息
ipcMain.handle('get-video-info', async (_, filePath: string) => {
  configureFFmpeg()
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error | null, metadata: FfprobeData) => {
      if (err) {
        reject(err)
        return
      }
      const videoStream = metadata.streams.find((s: { codec_type?: string }) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s: { codec_type?: string }) => s.codec_type === 'audio')
      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        width: videoStream?.width,
        height: videoStream?.height,
        fps: videoStream?.r_frame_rate,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
      })
    })
  })
})

// 视频转换
ipcMain.handle('convert-video', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  format: string
  settings?: VideoConversionSettings
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, format, settings } = options
  const fs = require('fs')
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)

    const conversionPlan = createVideoConversionPlan(format, settings)
    command = command.videoCodec(conversionPlan.videoCodec).audioCodec(conversionPlan.audioCodec)

    if (conversionPlan.outputSize) command = command.size(conversionPlan.outputSize)
    if (conversionPlan.frameRate) command = command.fps(conversionPlan.frameRate)
    if (conversionPlan.videoBitrate) command = command.videoBitrate(`${conversionPlan.videoBitrate}k`)
    if (conversionPlan.audioBitrate) command = command.audioBitrate(`${conversionPlan.audioBitrate}k`)
    if (conversionPlan.sampleRate) command = command.audioFrequency(conversionPlan.sampleRate)
    if (conversionPlan.audioChannels) command = command.audioChannels(conversionPlan.audioChannels)
    if (conversionPlan.outputOptions.length > 0) command = command.outputOptions(conversionPlan.outputOptions)
    
    // 存储任务以便取消
    convertTasks.set(id, command)
    
    command
      .toFormat(conversionPlan.muxer)
      .on('start', (cmd: string) => {
        console.log('FFmpeg command:', cmd)
      })
      .on('progress', (progress: { percent?: number; timemark?: string }) => {
        mainWindow?.webContents.send('convert-progress', {
          id,
          percent: progress.percent || 0,
          timemark: progress.timemark
        })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        console.error('FFmpeg error:', err.message)
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

// 取消转换
ipcMain.handle('cancel-convert', async (_, id: string) => {
  const command = convertTasks.get(id)
  if (command) {
    command.kill('SIGKILL')
    convertTasks.delete(id)
    return true
  }
  return false
})

// 获取默认输出目录
ipcMain.handle('get-default-output-dir', async () => {
  return path.join(app.getPath('videos'), '视频格式助手')
})

// 获取视频缩略图
ipcMain.handle('get-video-thumbnail', async (_, filePath: string) => {
  configureFFmpeg()
  const fs = require('fs')
  const os = require('os')
  const tempDir = path.join(os.tmpdir(), 'kunqiu-thumbnails')
  
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const thumbnailName = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
  const thumbnailPath = path.join(tempDir, thumbnailName)
  
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        timestamps: ['10%'],
        filename: thumbnailName,
        folder: tempDir,
        size: '280x180'
      })
      .on('end', () => {
        // 读取图片并转为base64
        try {
          const imageBuffer = fs.readFileSync(thumbnailPath)
          const base64 = imageBuffer.toString('base64')
          // 删除临时文件
          fs.unlinkSync(thumbnailPath)
          resolve(`data:image/jpeg;base64,${base64}`)
        } catch (err) {
          reject(err)
        }
      })
      .on('error', (err: Error) => {
        reject(err)
      })
  })
})

// 使用系统默认播放器播放视频
ipcMain.handle('play-video', async (_, filePath: string) => {
  const { shell } = require('electron')
  return shell.openPath(filePath)
})

// 视频合并
ipcMain.handle('merge-videos', async (_, options: {
  id: string
  inputPaths: string[]
  outputPath: string
  format: string
}) => {
  configureFFmpeg()
  const { id, inputPaths, outputPath, format } = options
  const fs = require('fs')
  const os = require('os')
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 创建临时目录
  const tempDir = path.join(os.tmpdir(), 'kunqiu-merge')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  try {
    // 第一阶段：将所有视频转换为统一的中间格式（TS格式，音视频参数一致）
    const tempFiles: string[] = []
    const totalVideos = inputPaths.length
    
    for (let i = 0; i < inputPaths.length; i++) {
      const inputPath = inputPaths[i]
      const tempFile = path.join(tempDir, `temp_${Date.now()}_${i}.ts`)
      tempFiles.push(tempFile)
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset', 'ultrafast',  // 使用快速预设
            '-crf', '23',
            '-ar', '44100',          // 统一音频采样率
            '-ac', '2',              // 统一为立体声
            '-f', 'mpegts'           // 使用 MPEG-TS 格式（更适合合并）
          ])
          .on('start', (cmd: string) => {
            console.log(`Converting video ${i + 1}/${totalVideos}:`, cmd)
          })
          .on('progress', (progress: { percent?: number }) => {
            // 发送转换进度（每个视频占总进度的一部分）
            const overallPercent = ((i + (progress.percent || 0) / 100) / totalVideos) * 50
            mainWindow?.webContents.send('merge-progress', {
              id,
              percent: overallPercent,
              timemark: `转换第 ${i + 1}/${totalVideos} 个视频`
            })
          })
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .save(tempFile)
      })
    }
    
    // 第二阶段：使用 concat protocol 合并所有 TS 文件
    const concatList = tempFiles.map(f => f.replace(/\\/g, '/')).join('|')
    
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .input(`concat:${concatList}`)
        .inputOptions(['-f', 'mpegts'])
        .videoCodec('copy')  // 直接复制，不重新编码
        .audioCodec('copy')
      
      convertTasks.set(id, command)
      
      // 格式映射
      const formatMap: Record<string, string> = {
        'wmv': 'asf',
        'm4v': 'mp4',
        'mkv': 'matroska'
      }
      const outputFormat = formatMap[format.toLowerCase()] || format.toLowerCase()
      
      command
        .toFormat(outputFormat)
        .on('start', (cmd: string) => {
          console.log('FFmpeg merge command:', cmd)
        })
        .on('progress', (progress: { percent?: number; timemark?: string }) => {
          // 合并阶段占总进度的后50%
          const overallPercent = 50 + (progress.percent || 0) / 2
          mainWindow?.webContents.send('merge-progress', {
            id,
            percent: overallPercent,
            timemark: progress.timemark
          })
        })
        .on('end', () => {
          convertTasks.delete(id)
          resolve()
        })
        .on('error', (err: Error) => {
          convertTasks.delete(id)
          reject(err)
        })
        .save(outputPath)
    })
    
    // 清理临时文件
    tempFiles.forEach(file => {
      try { fs.unlinkSync(file) } catch (e) { /* ignore */ }
    })
    
    return { success: true, outputPath }
    
  } catch (error) {
    // 清理临时文件
    const tempFiles = fs.readdirSync(tempDir).filter((f: string) => f.startsWith('temp_'))
    tempFiles.forEach((file: string) => {
      try { fs.unlinkSync(path.join(tempDir, file)) } catch (e) { /* ignore */ }
    })
    throw error
  }
})

// 视频压缩
ipcMain.handle('compress-video', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  format?: string
  quality?: string // low, medium, high
  mode?: string
  resolution?: string
  width?: number
  height?: number
  videoBitrate?: string
  frameRate?: string
  audioBitrate?: string
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, format, quality, mode, resolution, width, height, videoBitrate, frameRate, audioBitrate } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const sourceInfo: any = await new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (_err: Error | null, metadata: FfprobeData) => {
      const videoStream = metadata?.streams?.find((s: { codec_type?: string }) => s.codec_type === 'video')
      resolve({
        size: metadata?.format?.size ? Number(metadata.format.size) : 0,
        bitrateKbps: Number(videoStream?.bit_rate || metadata?.format?.bit_rate || 0) / 1000,
      })
    })
  })
  const modeKey = mode || quality || 'quality'
  const crfMap: Record<string, number> = { speed: 30, quality: 28, clarity: 24, low: 30, medium: 28, high: 24 }
  const presetMap: Record<string, string> = { speed: 'veryfast', quality: 'medium', clarity: 'slow', low: 'veryfast', medium: 'medium', high: 'slow' }
  const bitrateRatioMap: Record<string, number> = { speed: 0.45, quality: 0.6, clarity: 0.75, low: 0.45, medium: 0.6, high: 0.75 }
  const explicitVideoBitrate = videoBitrate && videoBitrate !== 'auto' ? Number(videoBitrate) : 0
  const targetVideoBitrate = explicitVideoBitrate || (sourceInfo.bitrateKbps > 0 ? Math.max(350, Math.floor(sourceInfo.bitrateKbps * (bitrateRatioMap[modeKey] || 0.6))) : 0)
  const outputExt = outputExtensionFromPath(outputPath, format || 'mp4')
  const outputFormat = outputFormatFromPath(outputPath, format || 'mp4')
  const outputSize = outputSizeFromSettings({ resolution, width, height })

  const runCompression = (aggressive = false) => new Promise<{ outputSize: number }>((resolve, reject) => {
    let command = applyCompressionCodecs(ffmpeg(inputPath), outputExt)

    const crf = aggressive ? Math.max((crfMap[modeKey] || 28) + 6, 34) : (crfMap[modeKey] || 28)
    const preset = aggressive ? 'veryfast' : (presetMap[modeKey] || 'medium')
    const bitrateBase = targetVideoBitrate || (sourceInfo.bitrateKbps > 0 ? Math.floor(sourceInfo.bitrateKbps * 0.45) : 0)
    const attemptVideoBitrate = aggressive && bitrateBase > 0 ? Math.max(180, Math.floor(bitrateBase * 0.55)) : targetVideoBitrate
    const attemptAudioBitrate = aggressive ? '64k' : (audioBitrate && audioBitrate !== 'auto' ? `${audioBitrate}k` : '128k')
    const h264LikeFormats = new Set(['mp4', 'm4v', 'mkv', 'mov', 'flv', 'f4v', 'swf', '3gp', 'ts', 'm2ts', 'mts', 'm2t'])
    const outputOptions = ['-pix_fmt', 'yuv420p']
    if (h264LikeFormats.has(outputExt)) {
      outputOptions.push('-preset', preset, '-crf', String(crf))
    } else if (outputExt === 'webm') {
      outputOptions.push('-crf', String(crf))
    }
    if (['mp4', 'm4v', 'mov', 'f4v', '3gp'].includes(outputExt)) {
      outputOptions.push('-movflags', '+faststart')
    }
    if (outputExt === 'flv' || outputExt === 'swf') {
      outputOptions.push('-flvflags', 'add_keyframe_index')
    }
    if (outputExt === 'ogv') {
      outputOptions.push('-max_muxing_queue_size', '4096')
    }

    if (attemptVideoBitrate > 0) {
      command = command.videoBitrate(`${attemptVideoBitrate}k`)
      outputOptions.push('-maxrate', `${attemptVideoBitrate}k`, '-bufsize', `${attemptVideoBitrate * 2}k`)
    }

    command = command.outputOptions(outputOptions)
    if (outputSize) command = command.size(outputSize)
    if (frameRate && frameRate !== 'auto') command = command.fps(Number(frameRate))
    command = command.audioBitrate(attemptAudioBitrate)

    convertTasks.set(id, command)

    command
      .toFormat(outputFormat)
      .on('start', (cmd: string) => console.log(aggressive ? 'Compress retry command:' : 'Compress command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        const percent = aggressive ? 50 + ((progress.percent || 0) / 2) : Math.min(progress.percent || 0, 50)
        mainWindow?.webContents.send('compress-progress', { id, percent })
      })
      .on('end', () => {
        convertTasks.delete(id)
        try {
          resolve({ outputSize: fs.statSync(outputPath).size })
        } catch (error) {
          reject(error)
        }
      })
      .on('error', (err: Error) => {
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })

  const primaryResult = await runCompression(false)
  if (!sourceInfo.size || primaryResult.outputSize < sourceInfo.size) {
    return { success: true, outputPath, outputSize: primaryResult.outputSize, originalSize: sourceInfo.size }
  }

  console.warn(`Compressed file is not smaller, retrying aggressively: ${primaryResult.outputSize} >= ${sourceInfo.size}`)
  try { fs.unlinkSync(outputPath) } catch (e) { /* ignore retry cleanup */ }

  const retryResult = await runCompression(true)
  if (retryResult.outputSize < sourceInfo.size) {
    return { success: true, outputPath, outputSize: retryResult.outputSize, originalSize: sourceInfo.size, retried: true }
  }

  try { fs.unlinkSync(outputPath) } catch (e) { /* ignore failed compression cleanup */ }
  throw new Error(`压缩后文件仍未小于源文件（源文件 ${sourceInfo.size} 字节，输出 ${retryResult.outputSize} 字节）。源文件可能已经高度压缩，请选择更低分辨率或更低码率。`)
})

// 音频转换
ipcMain.handle('convert-audio', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  format: string
  bitrate?: string
  sampleRate?: string
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, format, bitrate, sampleRate } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo()
    
    // 根据格式设置音频编码器
    const fmt = format.toLowerCase()
    
    if (fmt === 'm4a' || fmt === 'm4r') {
      // M4A 和 M4R 使用 AAC 编码器和 MP4 容器
      command = command.audioCodec('aac')
      command = command.toFormat('ipod') // 使用 ipod 格式（MP4 容器）
    } else if (fmt === 'mp3') {
      command = command.audioCodec('libmp3lame')
      command = command.toFormat('mp3')
    } else if (fmt === 'wav') {
      command = command.audioCodec('pcm_s16le')
      command = command.toFormat('wav')
    } else if (fmt === 'flac') {
      command = command.audioCodec('flac')
      command = command.toFormat('flac')
    } else if (fmt === 'ogg') {
      command = command.audioCodec('libvorbis')
      command = command.toFormat('ogg')
    } else if (fmt === 'aac') {
      command = command.audioCodec('aac')
      command = command.toFormat('adts')
    } else if (fmt === 'wma') {
      command = command.audioCodec('wmav2')
      command = command.toFormat('asf')
    } else {
      command = command.toFormat(fmt)
    }
    
    if (bitrate && fmt !== 'flac' && fmt !== 'wav') command = command.audioBitrate(bitrate)
    if (sampleRate) command = command.audioFrequency(parseInt(sampleRate))
    
    convertTasks.set(id, command)
    
    command
      .on('start', (cmd: string) => console.log('Audio convert command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        mainWindow?.webContents.send('audio-progress', { id, percent: progress.percent || 0 })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        console.error('Audio convert error:', err.message)
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

// 视频提取音频
ipcMain.handle('extract-audio', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  format: string
  bitrate?: string
  sampleRate?: string
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, format, bitrate, sampleRate } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath).noVideo()
    const fmt = format.toLowerCase()

    if (fmt === 'm4a' || fmt === 'm4r') {
      command = command.audioCodec('aac').toFormat('ipod')
    } else if (fmt === 'mp3') {
      command = command.audioCodec('libmp3lame').toFormat('mp3')
    } else if (fmt === 'wav') {
      command = command.audioCodec('pcm_s16le').toFormat('wav')
    } else if (fmt === 'flac') {
      command = command.audioCodec('flac').toFormat('flac')
    } else if (fmt === 'ogg') {
      command = command.audioCodec('libvorbis').toFormat('ogg')
    } else if (fmt === 'aac') {
      command = command.audioCodec('aac').toFormat('adts')
    } else if (fmt === 'wma') {
      command = command.audioCodec('wmav2').toFormat('asf')
    } else {
      command = command.toFormat(fmt)
    }

    if (bitrate && fmt !== 'flac' && fmt !== 'wav') command = command.audioBitrate(bitrate)
    if (sampleRate) command = command.audioFrequency(parseInt(sampleRate))
    
    convertTasks.set(id, command)
    
    command
      .on('start', (cmd: string) => console.log('Extract audio command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        mainWindow?.webContents.send('extract-progress', { id, percent: progress.percent || 0 })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

// 视频转GIF
ipcMain.handle('video-to-gif', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  fps?: number
  width?: number
  startTime?: number
  duration?: number
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, fps = 10, width = 480, startTime, duration } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
    
    if (startTime !== undefined) command = command.setStartTime(startTime)
    if (duration !== undefined) command = command.setDuration(duration)
    
    command = command.outputOptions([
      `-vf scale=${width}:-1:flags=lanczos,fps=${fps}`,
    ])
    
    convertTasks.set(id, command)
    
    command
      .toFormat('gif')
      .on('start', (cmd: string) => console.log('GIF command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        mainWindow?.webContents.send('gif-progress', { id, percent: progress.percent || 0 })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

const applyWatermarkOutputSettings = (command: ffmpeg.FfmpegCommand, settings?: { resolution?: string; width?: number; height?: number }) => {
  const outputSize = outputSizeFromSettings(settings)
  return outputSize ? command.size(outputSize) : command
}

const watermarkEnableExpr = (wm: { startTime?: number; endTime?: number }) => {
  const start = Number(wm.startTime || 0)
  const end = Number(wm.endTime || 0)
  return end > start ? `:enable='between(t,${start},${end})'` : ''
}

// 视频添加水印
ipcMain.handle('add-watermark', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  watermarks: Array<{
    type: string
    path?: string
    text?: string
    x: number
    y: number
    rotation?: number
    opacity?: number
    scale?: number
    position?: string
    fontFamily?: string
    fontSize?: number
    bold?: boolean
    italic?: boolean
    underline?: boolean
    actualX?: number
    actualY?: number
    actualFontSize?: number
    startTime?: number
    endTime?: number
  }>
  settings?: {
    resolution?: string
    width?: number
    height?: number
  }
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, watermarks, settings } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 获取系统字体路径（支持中文）
  const getSystemFontPath = (fontFamily?: string): string => {
    // Windows 字体映射表 - 使用完整路径
    const windowsFontMap: Record<string, string[]> = {
      'Microsoft YaHei': ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\msyhbd.ttc'],
      '微软雅黑': ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\msyhbd.ttc'],
      'SimSun': ['C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
      '宋体': ['C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
      'SimHei': ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF'],
      '黑体': ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF'],
      'Arial': ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\msyh.ttc'], // Arial 也使用中文字体
    }
    
    // 检查字体文件是否存在
    const checkFontExists = (paths: string[]): string | null => {
      for (const p of paths) {
        if (fs.existsSync(p)) {
          console.log('Found font:', p)
          return p
        }
      }
      return null
    }
    
    // 优先使用用户选择的字体
    if (fontFamily && windowsFontMap[fontFamily]) {
      const fontPath = checkFontExists(windowsFontMap[fontFamily])
      if (fontPath) return fontPath
    }
    
    // 默认字体优先级：黑体 > 微软雅黑 > 宋体（黑体是 .ttf 格式，兼容性更好）
    const defaultFontPaths = [
      'C:\\Windows\\Fonts\\simhei.ttf',
      'C:\\Windows\\Fonts\\SIMHEI.TTF',
      'C:\\Windows\\Fonts\\msyh.ttc',
      'C:\\Windows\\Fonts\\msyhbd.ttc',
      'C:\\Windows\\Fonts\\simsun.ttc',
      'C:\\Windows\\Fonts\\SIMSUN.TTC',
    ]
    
    for (const fontPath of defaultFontPaths) {
      if (fs.existsSync(fontPath)) {
        console.log('Using default font:', fontPath)
        return fontPath
      }
    }
    
    // 最后回退到 Arial
    console.log('Fallback to Arial')
    return 'C:\\Windows\\Fonts\\arial.ttf'
  }
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
    
    if (watermarks && watermarks.length > 0) {
      const filters: string[] = []
      let lastOutput = '0:v'
      let inputCount = 0
      
      watermarks.forEach((wm, idx) => {
        const opacity = (wm.opacity || 100) / 100
        const outputLabel = idx === watermarks.length - 1 ? 'out' : `v${idx}`
        const enableExpr = watermarkEnableExpr(wm)
        
        if (wm.type === 'image' && wm.path) {
          // 图片水印
          command = command.input(wm.path)
          inputCount++
          const inputIdx = inputCount
          const scale = wm.scale ? wm.scale / 100 : 0.5
          
          if (wm.position === 'tile') {
            // 平铺模式 - 使用 split 滤镜复制水印流，然后多次叠加
            const tileCount = 16 // 4x4 平铺
            // 先缩放水印，然后 split 成多份
            filters.push(`[${inputIdx}:v]scale=iw*${scale}:ih*${scale},format=rgba,colorchannelmixer=aa=${opacity},split=${tileCount}${Array.from({length: tileCount}, (_, i) => `[wm${idx}_${i}]`).join('')}`)
            
            // 4x4 平铺位置
            const tilePositions = [
              [0.0, 0.0], [0.25, 0.0], [0.5, 0.0], [0.75, 0.0],
              [0.0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25],
              [0.0, 0.5], [0.25, 0.5], [0.5, 0.5], [0.75, 0.5],
              [0.0, 0.75], [0.25, 0.75], [0.5, 0.75], [0.75, 0.75]
            ]
            
            tilePositions.forEach(([px, py], i) => {
              const currentOutput = i === tilePositions.length - 1 ? outputLabel : `t${idx}_${i}`
              filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=W*${px}:H*${py}${enableExpr}[${currentOutput}]`)
              lastOutput = currentOutput
            })
          } else if (wm.position === 'grid') {
            // 九宫格模式 - 使用 split 滤镜复制水印流
            const gridCount = 9
            filters.push(`[${inputIdx}:v]scale=iw*${scale}:ih*${scale},format=rgba,colorchannelmixer=aa=${opacity},split=${gridCount}${Array.from({length: gridCount}, (_, i) => `[wm${idx}_${i}]`).join('')}`)
            
            // 九宫格位置
            const gridPositions = [
              [0.1, 0.1], [0.4, 0.1], [0.7, 0.1],
              [0.1, 0.4], [0.4, 0.4], [0.7, 0.4],
              [0.1, 0.7], [0.4, 0.7], [0.7, 0.7]
            ]
            
            gridPositions.forEach(([px, py], i) => {
              const currentOutput = i === gridPositions.length - 1 ? outputLabel : `g${idx}_${i}`
              filters.push(`[${lastOutput}][wm${idx}_${i}]overlay=W*${px}:H*${py}${enableExpr}[${currentOutput}]`)
              lastOutput = currentOutput
            })
          } else {
            // 自定义位置
            const overlayX = wm.actualX !== undefined ? wm.actualX : (wm.x || 10)
            const overlayY = wm.actualY !== undefined ? wm.actualY : (wm.y || 10)
            filters.push(`[${inputIdx}:v]scale=iw*${scale}:ih*${scale},format=rgba,colorchannelmixer=aa=${opacity}[wm${idx}]`)
            filters.push(`[${lastOutput}][wm${idx}]overlay=${overlayX}:${overlayY}${enableExpr}[${outputLabel}]`)
            lastOutput = outputLabel
          }
        } else if (wm.type === 'text' && wm.text) {
          // 文字水印 - 使用系统字体支持中文
          // 使用实际字体大小（如果有），否则使用原始大小
          const fontSize = wm.actualFontSize || wm.fontSize || 24
          const fontPath = getSystemFontPath(wm.fontFamily)
          console.log('Using font path:', fontPath)
          console.log('Text content:', wm.text)
          console.log('Font size:', fontSize)
          
          // 使用实际坐标（如果有），否则使用原始坐标
          const actualX = wm.actualX !== undefined ? wm.actualX : (wm.x || 10)
          const actualY = wm.actualY !== undefined ? wm.actualY : (wm.y || 10)
          
          // FFmpeg drawtext 滤镜路径格式：使用正斜杠，冒号前加单个反斜杠
          const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:')
          
          // 对文本进行转义：冒号、反斜杠、单引号需要转义
          // FFmpeg drawtext 的 text 参数需要特殊转义
          const escapedText = wm.text
            .replace(/\\/g, '\\\\')  // 反斜杠
            .replace(/:/g, '\\:')     // 冒号
            .replace(/'/g, "'\\''")   // 单引号
          
          console.log('Escaped font path:', escapedFontPath)
          console.log('Escaped text:', escapedText)
          console.log('Actual position:', actualX, actualY)
          
          // 构建字体样式
          let fontStyle = ''
          if (wm.bold) fontStyle += ':force_style=Bold'
          
          if (wm.position === 'tile') {
            // 文字平铺 - 多次绘制
            let tileFilter = `[${lastOutput}]`
            const positions = [
              [0.0, 0.0], [0.25, 0.0], [0.5, 0.0], [0.75, 0.0],
              [0.0, 0.2], [0.25, 0.2], [0.5, 0.2], [0.75, 0.2],
              [0.0, 0.4], [0.25, 0.4], [0.5, 0.4], [0.75, 0.4],
              [0.0, 0.6], [0.25, 0.6], [0.5, 0.6], [0.75, 0.6],
              [0.0, 0.8], [0.25, 0.8], [0.5, 0.8], [0.75, 0.8]
            ]
            positions.forEach(([px, py], i) => {
              tileFilter += `drawtext=text='${escapedText}':fontfile='${escapedFontPath}':fontsize=${fontSize}:fontcolor=white@${opacity}:x=w*${px}+10:y=h*${py}+10${fontStyle}${enableExpr}`
              if (i < positions.length - 1) tileFilter += ','
            })
            tileFilter += `[${outputLabel}]`
            filters.push(tileFilter)
            lastOutput = outputLabel
          } else {
            filters.push(`[${lastOutput}]drawtext=text='${escapedText}':fontfile='${escapedFontPath}':fontsize=${fontSize}:fontcolor=white@${opacity}:x=${actualX}:y=${actualY}${fontStyle}${enableExpr}[${outputLabel}]`)
            lastOutput = outputLabel
          }
        }
      })
      
      if (filters.length > 0) {
        command = command.complexFilter(filters)
        command = command.outputOptions(['-map [out]', '-map 0:a?'])
      }
    }
    
    convertTasks.set(id, command)
    
    command = applyWatermarkOutputSettings(command, settings)

    command
      .videoCodec('libx264')
      .audioCodec('copy')
      .toFormat(outputFormatFromPath(outputPath))
      .on('start', (cmd: string) => console.log('Watermark command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        mainWindow?.webContents.send('watermark-progress', { id, percent: progress.percent || 0 })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        console.error('Watermark error:', err.message)
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

// 视频去水印
ipcMain.handle('remove-watermark', async (_, options: {
  id: string
  inputPath: string
  outputPath: string
  areas: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
  mode: string // 'blur' | 'color'
  fillColor?: string
  settings?: {
    resolution?: string
    width?: number
    height?: number
  }
}) => {
  configureFFmpeg()
  const { id, inputPath, outputPath, areas, mode, fillColor, settings } = options
  const fs = require('fs')
  
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 先获取视频信息以确保坐标在有效范围内
  const videoInfo: any = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: FfprobeData) => {
      if (err) {
        reject(err)
        return
      }
      const videoStream = metadata.streams.find((s: { codec_type?: string }) => s.codec_type === 'video')
      resolve({
        width: videoStream?.width || 1920,
        height: videoStream?.height || 1080
      })
    })
  })
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
    
    if (areas && areas.length > 0) {
      // 构建滤镜字符串
      let filterStr = ''
      
      if (mode === 'blur') {
        // 使用 boxblur + overlay 方式实现区域模糊
        // 这种方式兼容性更好
        areas.forEach((area, idx) => {
          const x = Math.max(0, Math.min(Math.round(area.x), videoInfo.width - 10))
          const y = Math.max(0, Math.min(Math.round(area.y), videoInfo.height - 10))
          const w = Math.max(10, Math.min(Math.round(area.width), videoInfo.width - x))
          const h = Math.max(10, Math.min(Math.round(area.height), videoInfo.height - y))
          
          if (idx === 0) {
            // 第一个区域：从原视频裁剪区域，模糊后叠加回去
            filterStr = `[0:v]crop=${w}:${h}:${x}:${y},boxblur=10:10[blur0];[0:v][blur0]overlay=${x}:${y}[v0]`
          } else {
            // 后续区域：从上一个输出继续处理
            filterStr += `;[v${idx-1}]crop=${w}:${h}:${x}:${y},boxblur=10:10[blur${idx}];[v${idx-1}][blur${idx}]overlay=${x}:${y}[v${idx}]`
          }
        })
        
        // 最后一个输出重命名为 out
        const lastIdx = areas.length - 1
        filterStr = filterStr.replace(`[v${lastIdx}]`, '[out]')
        
        command = command.complexFilter(filterStr)
        command = command.outputOptions(['-map [out]', '-map 0:a?'])
      } else {
        // 使用 drawbox 滤镜（纯色填充）
        const color = fillColor?.replace('#', '') || '000000'
        const filters: string[] = []
        
        areas.forEach((area) => {
          const x = Math.max(0, Math.round(area.x))
          const y = Math.max(0, Math.round(area.y))
          const w = Math.max(10, Math.round(area.width))
          const h = Math.max(10, Math.round(area.height))
          
          filters.push(`drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=0x${color}:t=fill`)
        })
        
        command = command.videoFilters(filters)
      }
    }
    
    convertTasks.set(id, command)
    
    command = applyWatermarkOutputSettings(command, settings)

    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .toFormat(outputFormatFromPath(outputPath))
      .on('start', (cmd: string) => console.log('Remove watermark command:', cmd))
      .on('progress', (progress: { percent?: number }) => {
        mainWindow?.webContents.send('watermark-progress', { id, percent: progress.percent || 0 })
      })
      .on('end', () => {
        convertTasks.delete(id)
        resolve({ success: true, outputPath })
      })
      .on('error', (err: Error) => {
        console.error('Remove watermark error:', err.message)
        convertTasks.delete(id)
        reject(err)
      })
      .save(outputPath)
  })
})

// 选择图片文件
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp'] }]
  })
  return result.filePaths[0]
})

// 打开文件夹
ipcMain.handle('open-folder', async (_, folderPath: string) => {
  return openPathWithFallback(folderPath)
})

// ============ 扫码上传功能 ============
import express from 'express'
import multer from 'multer'
import QRCode from 'qrcode'
import http from 'http'

let uploadServer: http.Server | null = null
let uploadServerPort = 3456

// 获取本机局域网IP
function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

// 启动上传服务器
ipcMain.handle('start-upload-server', async () => {
  if (uploadServer) {
    return { success: true, port: uploadServerPort, ip: getLocalIP() }
  }
  
  const fs = require('fs')
  const uploadDir = path.join(os.tmpdir(), 'kunqiu-uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
  
  const app = express()
  
  // 配置文件上传
  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const uniqueName = `${Date.now()}_${file.originalname}`
      cb(null, uniqueName)
    }
  })
  const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 * 1024 } }) // 5GB限制
  
  // 上传页面HTML
  const uploadPageHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频格式助手 - 文件上传</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 20px; padding: 40px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #36d1c4; font-size: 24px; margin-bottom: 8px; }
    .logo p { color: #666; font-size: 14px; }
    .upload-area { border: 2px dashed #36d1c4; border-radius: 12px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.3s; margin-bottom: 20px; }
    .upload-area:hover, .upload-area.dragover { background: #e8f8f6; border-color: #2bb5a9; }
    .upload-area svg { width: 60px; height: 60px; fill: #36d1c4; margin-bottom: 15px; }
    .upload-area p { color: #666; font-size: 14px; }
    .upload-area input { display: none; }
    .file-list { max-height: 200px; overflow-y: auto; margin-bottom: 20px; }
    .file-item { display: flex; align-items: center; padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 8px; }
    .file-item .name { flex: 1; font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-item .size { font-size: 12px; color: #999; margin-left: 10px; }
    .file-item .remove { color: #f56c6c; cursor: pointer; margin-left: 10px; font-size: 18px; }
    .upload-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #36d1c4, #5de0d4); border: none; border-radius: 25px; color: white; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s; }
    .upload-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(54,209,196,0.4); }
    .upload-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
    .progress { display: none; margin-top: 20px; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #36d1c4, #5de0d4); width: 0%; transition: width 0.3s; }
    .progress-text { text-align: center; margin-top: 10px; font-size: 13px; color: #666; }
    .success { display: none; text-align: center; padding: 30px; }
    .success svg { width: 60px; height: 60px; fill: #36d1c4; margin-bottom: 15px; }
    .success p { color: #333; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>视频格式助手</h1>
      <p>选择视频文件上传到电脑</p>
    </div>
    <div id="uploadForm">
      <div class="upload-area" id="dropArea">
        <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
        <p>点击或拖拽文件到此处</p>
        <input type="file" id="fileInput" multiple accept="video/*,audio/*">
      </div>
      <div class="file-list" id="fileList"></div>
      <button class="upload-btn" id="uploadBtn" disabled>上传文件</button>
    </div>
    <div class="progress" id="progress">
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <p class="progress-text" id="progressText">上传中... 0%</p>
    </div>
    <div class="success" id="success">
      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      <p>上传成功！文件已添加到转换列表</p>
    </div>
  </div>
  <script>
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const uploadBtn = document.getElementById('uploadBtn');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadForm = document.getElementById('uploadForm');
    const success = document.getElementById('success');
    let files = [];
    
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
    dropArea.addEventListener('drop', (e) => { e.preventDefault(); dropArea.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', () => addFiles(fileInput.files));
    
    function addFiles(newFiles) {
      for (let f of newFiles) files.push(f);
      renderFileList();
    }
    
    function removeFile(idx) {
      files.splice(idx, 1);
      renderFileList();
    }
    
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + 'B';
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + 'KB';
      if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + 'MB';
      return (bytes/1024/1024/1024).toFixed(2) + 'GB';
    }
    
    function renderFileList() {
      fileList.innerHTML = files.map((f, i) => 
        '<div class="file-item"><span class="name">' + f.name + '</span><span class="size">' + formatSize(f.size) + '</span><span class="remove" onclick="removeFile(' + i + ')">×</span></div>'
      ).join('');
      uploadBtn.disabled = files.length === 0;
    }
    
    uploadBtn.addEventListener('click', async () => {
      if (files.length === 0) return;
      uploadForm.style.display = 'none';
      progress.style.display = 'block';
      
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = percent + '%';
          progressText.textContent = '上传中... ' + percent + '%';
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          progress.style.display = 'none';
          success.style.display = 'block';
        } else {
          alert('上传失败，请重试');
          progress.style.display = 'none';
          uploadForm.style.display = 'block';
        }
      };
      xhr.onerror = () => {
        alert('上传失败，请检查网络连接');
        progress.style.display = 'none';
        uploadForm.style.display = 'block';
      };
      xhr.open('POST', '/upload');
      xhr.send(formData);
    });
  </script>
</body>
</html>
  `
  
  app.get('/', (_req: express.Request, res: express.Response) => {
    res.send(uploadPageHTML)
  })
  
  app.post('/upload', upload.array('files'), (req: express.Request, res: express.Response) => {
    const uploadedFiles = (req.files as Express.Multer.File[]) || []
    const filePaths = uploadedFiles.map(f => f.path)
    
    // 通知渲染进程有新文件上传
    if (mainWindow && filePaths.length > 0) {
      mainWindow.webContents.send('files-uploaded', filePaths)
    }
    
    res.json({ success: true, files: filePaths })
  })
  
  return new Promise((resolve, reject) => {
    uploadServer = app.listen(uploadServerPort, '0.0.0.0', () => {
      console.log(`Upload server started on port ${uploadServerPort}`)
      resolve({ success: true, port: uploadServerPort, ip: getLocalIP() })
    })
    uploadServer!.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        uploadServerPort++
        uploadServer = app.listen(uploadServerPort, '0.0.0.0', () => {
          resolve({ success: true, port: uploadServerPort, ip: getLocalIP() })
        })
      } else {
        reject(err)
      }
    })
  })
})

// 停止上传服务器
ipcMain.handle('stop-upload-server', async () => {
  if (uploadServer) {
    uploadServer.close()
    uploadServer = null
  }
  return { success: true }
})

// 生成二维码
ipcMain.handle('generate-qrcode', async (_, url: string) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 })
    return qrDataUrl
  } catch (err) {
    console.error('Generate QRCode error:', err)
    return null
  }
})

// 获取本机IP
ipcMain.handle('get-local-ip', async () => {
  return getLocalIP()
})

// ============ URL视频下载功能 ============

// 下载URL视频（支持mp4、m3u8等格式）
ipcMain.handle('download-video-url', async (_, options: { url: string; name?: string }) => {
  configureFFmpeg()
  const { url, name } = options
  const fs = require('fs')
  const https = require('https')
  const http = require('http')
  const { URL } = require('url')
  
  console.log('=== URL Download Start ===')
  console.log('URL:', url)
  console.log('Name:', name)
  
  // 生成输出文件名
  const timestamp = Date.now()
  const fileName = name ? `${name}.mp4` : `video_${timestamp}.mp4`
  const outputDir = path.join(os.tmpdir(), 'kunqiu-downloads')
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const outputPath = path.join(outputDir, fileName)
  const tempPath = path.join(outputDir, `temp_${timestamp}.mp4`)
  
  console.log('Output path:', outputPath)
  console.log('Temp path:', tempPath)
  
  // 判断是否是 m3u8 链接
  const isM3U8 = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8')
  
  // 如果是 M3U8，使用 FFmpeg 直接处理
  if (isM3U8) {
    console.log('Detected M3U8 format, using FFmpeg directly')
    return new Promise((resolve, reject) => {
      const command = ffmpeg(url)
        .inputOptions([
          '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
          '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset', 'fast', '-movflags', '+faststart'])
        .toFormat('mp4')
        .on('start', (cmd: string) => console.log('M3U8 download command:', cmd))
        .on('progress', (progress: { percent?: number; timemark?: string }) => {
          mainWindow?.webContents.send('url-download-progress', {
            percent: progress.percent || 0,
            timemark: progress.timemark || ''
          })
        })
        .on('end', () => {
          console.log('M3U8 download completed:', outputPath)
          resolve({ success: true, filePath: outputPath })
        })
        .on('error', (err: Error) => {
          console.error('M3U8 download error:', err.message)
          reject(new Error(err.message || 'M3U8下载失败'))
        })
        .save(outputPath)
    })
  }
  
  // 对于普通视频链接，使用 Node.js 下载
  const downloadWithNodeJS = (downloadUrl: string, destPath: string, maxRedirects = 5): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        reject(new Error('重定向次数过多'))
        return
      }
      
      console.log('Downloading with Node.js:', downloadUrl)
      
      let parsedUrl: URL
      try {
        parsedUrl = new URL(downloadUrl)
      } catch (e) {
        reject(new Error('无效的URL格式'))
        return
      }
      
      const protocol = parsedUrl.protocol === 'https:' ? https : http
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      }
      
      console.log('Request options:', JSON.stringify(requestOptions, null, 2))
      
      const request = protocol.request(requestOptions, (response: any) => {
        console.log('Response status:', response.statusCode)
        console.log('Response headers:', JSON.stringify(response.headers, null, 2))
        
        // 处理重定向
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location
          if (!redirectUrl) {
            reject(new Error('重定向URL为空'))
            return
          }
          
          // 处理相对URL
          let fullRedirectUrl = redirectUrl
          if (redirectUrl.startsWith('/')) {
            fullRedirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`
          } else if (!redirectUrl.startsWith('http')) {
            fullRedirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}/${redirectUrl}`
          }
          
          console.log('Redirecting to:', fullRedirectUrl)
          downloadWithNodeJS(fullRedirectUrl, destPath, maxRedirects - 1)
            .then(resolve)
            .catch(reject)
          return
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`服务器返回错误: HTTP ${response.statusCode}`))
          return
        }
        
        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloadedSize = 0
        
        console.log('Total size:', totalSize)
        
        const file = fs.createWriteStream(destPath)
        
        response.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length
          if (totalSize > 0) {
            const percent = Math.round((downloadedSize / totalSize) * 100)
            mainWindow?.webContents.send('url-download-progress', { percent, timemark: '' })
          }
        })
        
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          console.log('Download finished, size:', downloadedSize)
          if (downloadedSize === 0) {
            reject(new Error('下载的文件为空'))
            return
          }
          resolve()
        })
        
        file.on('error', (err: Error) => {
          console.error('File write error:', err)
          try { fs.unlinkSync(destPath) } catch (e) { /* ignore */ }
          reject(new Error('文件写入失败: ' + err.message))
        })
        
        response.on('error', (err: Error) => {
          console.error('Response error:', err)
          file.close()
          try { fs.unlinkSync(destPath) } catch (e) { /* ignore */ }
          reject(new Error('下载响应错误: ' + err.message))
        })
      })
      
      request.on('error', (err: Error) => {
        console.error('Request error:', err)
        reject(new Error('网络请求失败: ' + err.message))
      })
      
      request.on('timeout', () => {
        console.error('Request timeout')
        request.destroy()
        reject(new Error('请求超时'))
      })
      
      request.end()
    })
  }
  
  try {
    // 下载文件
    await downloadWithNodeJS(url, tempPath)
    console.log('File downloaded successfully')
    
    // 检查文件是否存在且有内容
    const stats = fs.statSync(tempPath)
    console.log('Downloaded file size:', stats.size)
    
    if (stats.size === 0) {
      throw new Error('下载的文件为空')
    }
    
    // 用 FFmpeg 转换（确保格式正确）
    console.log('Converting with FFmpeg...')
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempPath)
        .videoCodec('copy')
        .audioCodec('copy')
        .toFormat('mp4')
        .outputOptions(['-movflags', '+faststart'])
        .on('start', (cmd: string) => console.log('Convert command:', cmd))
        .on('end', () => {
          console.log('Conversion completed')
          // 删除临时文件
          try { fs.unlinkSync(tempPath) } catch (e) { /* ignore */ }
          resolve()
        })
        .on('error', (err: Error) => {
          console.error('FFmpeg convert error:', err)
          try { fs.unlinkSync(tempPath) } catch (e) { /* ignore */ }
          reject(new Error('视频转换失败: ' + err.message))
        })
        .save(outputPath)
    })
    
    console.log('=== URL Download Complete ===')
    console.log('Output file:', outputPath)
    return { success: true, filePath: outputPath }
  } catch (err: any) {
    console.error('=== URL Download Error ===')
    console.error('Error:', err)
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    // 清理临时文件
    try { fs.unlinkSync(tempPath) } catch (e) { /* ignore */ }
    try { fs.unlinkSync(outputPath) } catch (e) { /* ignore */ }
    throw new Error(err.message || '下载失败，请检查URL是否有效')
  }
})

// 打开外部URL（用于登录）
ipcMain.handle('open-external-url', async (_, url: string) => {
  return openExternalUrlWithFallback(url)
})

// 启动更新程序
ipcMain.on('start-updater', (event, { url, hash, version }) => {
  const appDir = path.dirname(app.getPath('exe'))
  const exeName = path.basename(app.getPath('exe'))
  const updaterPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'updater.exe')
    : path.join(app.getAppPath(), 'public', 'updater.exe')

  const args = [
    '--url', url,
    '--hash', hash,
    '--dir', appDir,
    '--exe', exeName,
    '--pid', process.pid.toString()
  ]

  console.log('Starting updater:', updaterPath, args)

  const subprocess = spawn(updaterPath, args, {
    detached: true,
    stdio: 'ignore'
  })

  subprocess.unref()
  app.quit()
})
