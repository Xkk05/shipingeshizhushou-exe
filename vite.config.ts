import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  
  const plugins: any[] = [vue()];
  
  if (isElectron) {
    plugins.push(
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg']
              }
            }
          }
        },
      ]),
      renderer()
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3005',
          changeOrigin: true,
        },
        '/download': {
          target: 'http://127.0.0.1:3005',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: isElectron ? 'dist' : 'dist-web',
    }
  };
})
