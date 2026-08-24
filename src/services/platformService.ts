import axios from 'axios';
import { resolveElectronConversionChannel } from '@/services/conversionRouting';
import { toIpcPayload } from '@/utils/ipcPayload';
import { extensionFromFileName } from '@/utils/mediaFormats';
import { clampProgress } from '@/utils/progress';

export interface PlatformService {
  isElectron: boolean;
  getMachineCode(): Promise<string>;
  selectFiles(filters?: any[]): Promise<any[]>;
  selectFolder(extensions: string[]): Promise<any[]>;
  selectOutputDir(): Promise<string>;
  getVideoInfo(filePath: string): Promise<any>;
  getVideoThumbnail(filePath: string): Promise<string>;
  playVideo(filePath: string): Promise<void>;
  convertVideo(options: any): Promise<any>;
  cancelConvert(id: string): Promise<boolean>;
  removeWatermark(options: any): Promise<void>;
  addWatermark(options: any): Promise<void>;
  onConvertProgress(callback: (data: { id: string; percent: number }) => void, channel?: string): void;
  removeConvertProgressListeners(channel?: string): void;
  getDefaultOutputDir(): Promise<string>;
  minimizeWindow(): void;
  maximizeWindow(): void;
  isWindowMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): void;
  removeWindowMaximizedChangeListeners(): void;
  closeWindow(): void;
  basename(p: string): string;
  extname(p: string): string;
  join(...args: string[]): string;
  dirname(p: string): string;
  openFolder(path: string): Promise<void>;
  startUploadServer(): Promise<any>;
  generateQRCode(url: string): Promise<string>;
  onFilesUploaded(callback: (filePaths: string[]) => void): void;
  removeFilesUploadedListeners(): void;
  downloadVideoUrl(options: any): Promise<any>;
  onUrlDownloadProgress(callback: (data: any) => void, channel?: string): void;
  removeUrlDownloadProgressListeners(channel?: string): void;
  openExternalUrl(url: string): Promise<void>;
}

const detectElectron = () => {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean((window as any).require?.('electron')?.ipcRenderer || (window as any).electron?.ipcRenderer);
  } catch {
    return Boolean((window as any).electron?.ipcRenderer);
  }
};

const isElectron = detectElectron();
const rawApiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '';
const API_BASE = rawApiBase.replace(/\/+$/, '');

const buildApiUrl = (pathname: string) => `${API_BASE}${pathname}`;

const normalizeDownloadUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
};

class ElectronPlatformService implements PlatformService {
  isElectron = true;
  private ipcRenderer: any;

  constructor() {
    if (isElectron) {
      try {
        if ((window as any).require) {
          this.ipcRenderer = (window as any).require('electron').ipcRenderer;
        } else if ((window as any).electron) {
          this.ipcRenderer = (window as any).electron.ipcRenderer;
        }
      } catch (error) {
        console.error('Failed to load electron ipcRenderer:', error);
      }
    }
  }

  async getMachineCode(): Promise<string> { return await this.ipcRenderer.invoke('get-machine-code'); }
  async selectFiles(filters?: any[]): Promise<any[]> {
    const paths = await this.ipcRenderer.invoke('select-files', filters);
    if (!paths) return [];
    return paths.map((p: string) => ({ id: Math.random().toString(36).substring(2), path: p, name: p.split(/[\\/]/).pop() }));
  }
  async selectFolder(extensions: string[]): Promise<any[]> {
    const paths = await this.ipcRenderer.invoke('select-folder', extensions);
    if (!paths) return [];
    return paths.map((p: string) => ({ id: Math.random().toString(36).substring(2), path: p, name: p.split(/[\\/]/).pop() }));
  }
  async selectOutputDir(): Promise<string> { return await this.ipcRenderer.invoke('select-output-dir'); }
  async getVideoInfo(filePath: string): Promise<any> { return await this.ipcRenderer.invoke('get-video-info', filePath); }
  async getVideoThumbnail(filePath: string): Promise<string> { return await this.ipcRenderer.invoke('get-video-thumbnail', filePath); }
  async playVideo(filePath: string): Promise<void> { return await this.ipcRenderer.invoke('play-video', filePath); }
  async convertVideo(options: any): Promise<any> {
    const channel = resolveElectronConversionChannel(options);
    return await this.ipcRenderer.invoke(channel, toIpcPayload(options));
  }
  async cancelConvert(id: string): Promise<boolean> { return await this.ipcRenderer.invoke('cancel-convert', id); }
  async removeWatermark(options: any): Promise<void> { return await this.ipcRenderer.invoke('remove-watermark', toIpcPayload(options)); }
  async addWatermark(options: any): Promise<void> { return await this.ipcRenderer.invoke('add-watermark', toIpcPayload(options)); }
  onConvertProgress(callback: (data: { id: string; percent: number }) => void, channel = 'convert-progress'): void { this.ipcRenderer.on(channel, (_: any, data: any) => callback({ ...data, percent: clampProgress(data?.percent) })); }
  removeConvertProgressListeners(channel = 'convert-progress'): void { this.ipcRenderer.removeAllListeners(channel); }
  async getDefaultOutputDir(): Promise<string> { return await this.ipcRenderer.invoke('get-default-output-dir'); }
  minimizeWindow(): void { this.ipcRenderer.send('window-minimize'); }
  maximizeWindow(): void { this.ipcRenderer.send('window-maximize'); }
  async isWindowMaximized(): Promise<boolean> { return await this.ipcRenderer.invoke('window-is-maximized'); }
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): void {
    this.ipcRenderer.on('window-maximized-change', (_: any, isMaximized: boolean) => callback(isMaximized));
  }
  removeWindowMaximizedChangeListeners(): void { this.ipcRenderer.removeAllListeners('window-maximized-change'); }
  closeWindow(): void { this.ipcRenderer.send('window-close'); }
  basename(p: string): string { return p.split(/[\\/]/).pop() || ''; }
  extname(p: string): string { const base = this.basename(p); const lastDot = base.lastIndexOf('.'); return lastDot === -1 ? '' : base.slice(lastDot); }
  join(...args: string[]): string { return args.join('/').replace(/\/+/g, '/'); }
  dirname(p: string): string { const parts = p.split(/[\\/]/); parts.pop(); return parts.join('/') || '.'; }
  async openFolder(path: string): Promise<void> { return await this.ipcRenderer.invoke('open-folder', path); }
  async startUploadServer(): Promise<any> { return await this.ipcRenderer.invoke('start-upload-server'); }
  async generateQRCode(url: string): Promise<string> { return await this.ipcRenderer.invoke('generate-qrcode', url); }
  onFilesUploaded(callback: (filePaths: string[]) => void): void { this.ipcRenderer.on('files-uploaded', (_: any, filePaths: string[]) => callback(filePaths)); }
  removeFilesUploadedListeners(): void { this.ipcRenderer.removeAllListeners('files-uploaded'); }
  async downloadVideoUrl(options: any): Promise<any> { return await this.ipcRenderer.invoke('download-video-url', options); }
  onUrlDownloadProgress(callback: (data: any) => void, channel = 'url-download-progress'): void { this.ipcRenderer.on(channel, (_: any, data: any) => callback({ ...data, percent: clampProgress(data?.percent) })); }
  removeUrlDownloadProgressListeners(channel = 'url-download-progress'): void { this.ipcRenderer.removeAllListeners(channel); }
  async openExternalUrl(url: string): Promise<void> { await this.ipcRenderer.invoke('open-external-url', url); }
}

class WebPlatformService implements PlatformService {
  isElectron = false;
  private progressInterval: number | null = null;

  private async waitForTask(id: string): Promise<any> {
    while (true) {
      const response = await axios.get(buildApiUrl(`/api/progress/${id}`));
      const task = response.data;
      if (task.status === 'completed') return task;
      if (task.status === 'failed') throw new Error(task.error || 'Conversion failed');
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
  }

  private triggerBrowserDownload(url: string, fileName?: string) {
    const link = document.createElement('a');
    link.href = normalizeDownloadUrl(url);
    if (fileName) link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async getMachineCode(): Promise<string> {
    let machineId = localStorage.getItem('web_machine_id');
    if (!machineId) {
      machineId = `web_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('web_machine_id', machineId);
    }
    return machineId;
  }

  async selectFiles(filters?: any[]): Promise<any[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      const extensions = filters?.flatMap((filter: any) => filter.extensions || []) || [];
      if (extensions.length > 0) input.accept = extensions.map((ext: string) => `.${ext}`).join(',');
      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        const results: any[] = [];
        for (const file of files) {
          const ext = extensionFromFileName(file.name);
          if (extensions.length > 0 && !extensions.includes(ext)) continue;
          const formData = new FormData();
          formData.append('video', file);
          try {
            const response = await axios.post(buildApiUrl('/api/upload'), formData);
            results.push({ id: response.data.id, name: file.name, path: response.data.path, file, status: 'pending' });
          } catch (error) {
            console.error('Upload failed:', error);
          }
        }
        resolve(results);
      };
      input.click();
    });
  }

  async selectFolder(): Promise<any[]> { alert('Web version does not support selecting an entire folder yet.'); return []; }
  async selectOutputDir(): Promise<string> { return 'browser_download'; }
  async getVideoInfo(): Promise<any> { return { duration: 0 }; }
  async getVideoThumbnail(): Promise<string> { return ''; }
  async playVideo(): Promise<void> { alert('Web version does not support playing local temporary files directly.'); }

  async convertVideo(options: any): Promise<any> {
    const response = await axios.post(buildApiUrl('/api/convert'), options);
    const task = await this.waitForTask(response.data.id || options.id);
    if (task.downloadUrl) this.triggerBrowserDownload(task.downloadUrl, task.outputFile);
    return task;
  }

  async cancelConvert(): Promise<boolean> { return false; }

  async removeWatermark(options: any): Promise<void> {
    const response = await axios.post(buildApiUrl('/api/remove-watermark'), options);
    const task = await this.waitForTask(response.data.id || options.id);
    if (task.downloadUrl) this.triggerBrowserDownload(task.downloadUrl, task.outputFile);
  }

  async addWatermark(options: any): Promise<void> {
    const response = await axios.post(buildApiUrl('/api/add-watermark'), options);
    const task = await this.waitForTask(response.data.id || options.id);
    if (task.downloadUrl) this.triggerBrowserDownload(task.downloadUrl, task.outputFile);
  }

  onConvertProgress(callback: (data: { id: string; percent: number }) => void): void {
    if (this.progressInterval) window.clearInterval(this.progressInterval);
    this.progressInterval = window.setInterval(async () => {
      try {
        const response = await axios.get(buildApiUrl('/api/progress'));
        const progresses = response.data;
        for (const id in progresses) callback({ id, percent: clampProgress(progresses[id]) });
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    }, 1000);
  }

  removeConvertProgressListeners(): void { if (this.progressInterval) { window.clearInterval(this.progressInterval); this.progressInterval = null; } }
  async getDefaultOutputDir(): Promise<string> { return 'Downloads'; }
  minimizeWindow(): void {}
  maximizeWindow(): void {}
  async isWindowMaximized(): Promise<boolean> { return false; }
  onWindowMaximizedChange(): void {}
  removeWindowMaximizedChangeListeners(): void {}
  closeWindow(): void {}
  basename(p: string): string { return p.split(/[\\/]/).pop() || ''; }
  extname(p: string): string { const base = this.basename(p); const lastDot = base.lastIndexOf('.'); return lastDot === -1 ? '' : base.slice(lastDot); }
  join(...args: string[]): string { return args.join('/').replace(/\/+/g, '/'); }
  dirname(p: string): string { const parts = p.split(/[\\/]/); if (parts.length > 1) parts.pop(); return parts.join('/') || '.'; }
  async openFolder(path: string): Promise<void> { if (path && /^(https?:\/\/|\/download\/)/i.test(path)) { this.triggerBrowserDownload(path); return; } alert('File download has started. Please check your browser downloads list.'); }
  async startUploadServer(): Promise<any> { return { success: false, error: 'Web version does not support local server' }; }
  async generateQRCode(): Promise<string> { return ''; }
  onFilesUploaded(): void {}
  removeFilesUploadedListeners(): void {}
  async downloadVideoUrl(): Promise<any> { return { success: false, error: 'Web version does not support direct URL download' }; }
  onUrlDownloadProgress(): void {}
  removeUrlDownloadProgressListeners(): void {}
  async openExternalUrl(url: string): Promise<void> { window.open(url, '_blank', 'noopener'); }
}

export const platformService: PlatformService = isElectron ? new ElectronPlatformService() : new WebPlatformService();
