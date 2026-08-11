<template>
  <div v-if="platformService.isElectron" class="home-container desktop-home">
    <div class="title-bar">
      <div class="logo">
        <div class="logo-icon">
          <img src="/视频格式转换器.ico" :alt="t('common.appName')" width="24" height="24" />
        </div>
        <span class="logo-text">{{ t('common.appName') }}</span>
        <div class="logo-sub">
          <span class="logo-separator">|</span>
          <span class="logo-product">{{ t('common.brandProduct') }}</span>
          <span class="version-text">v{{ appVersion }}</span>
        </div>
      </div>
      <div class="right-section">
        <LangSelect />
        <FeedbackButton />
        <CustomSoftwareButton />
        <UserLoginButton />
        <div class="window-controls">
          <span class="control-btn" @click="minimize">-</span>
          <span class="control-btn" @click="maximize">+</span>
          <span class="control-btn close" @click="close">x</span>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="main-content">
        <div class="row row-top">
          <div class="card card-pink" @click="goTo('video-convert')">
            <div class="card-info">
              <h3>{{ t('common.videoConvert') }}</h3>
              <p>{{ t('common.videoConvertDesc') }}</p>
            </div>
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="white">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </div>
          </div>

          <div class="card card-blue" @click="goTo('video-merge')">
            <div class="card-info">
              <h3>{{ t('common.videoMerge') }}</h3>
              <p>{{ t('common.videoMergeDesc') }}</p>
            </div>
            <div class="card-icon blue">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          <div class="card card-yellow" @click="goTo('video-compress')">
            <div class="card-info">
              <h3>{{ t('common.videoCompress') }}</h3>
              <p>{{ t('common.videoCompressDesc') }}</p>
            </div>
            <div class="card-icon yellow">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="white">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div class="row row-bottom">
          <div class="card-small" @click="goTo('audio-convert')">
            <div class="icon-box green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div class="text">
              <h4>{{ t('common.audioConvert') }}</h4>
              <p>{{ t('common.audioConvertDesc') }}</p>
            </div>
          </div>

          <div class="card-small" @click="goTo('video-extract-audio')">
            <div class="icon-box cyan">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div class="text">
              <h4>{{ t('common.videoExtractAudio') }}</h4>
              <p>{{ t('common.videoExtractAudioDesc') }}</p>
            </div>
          </div>
        </div>

        <div class="row row-bottom">
          <div class="card-small" @click="goTo('video-to-gif')">
            <div class="icon-box lime">
              <span>GIF</span>
            </div>
            <div class="text">
              <h4>{{ t('common.videoToGif') }}</h4>
              <p>{{ t('common.videoToGifDesc') }}</p>
            </div>
          </div>

          <div class="card-small" @click="goTo('video-watermark')">
            <div class="icon-box teal">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div class="text">
              <h4>{{ t('common.videoWatermark') }}</h4>
              <p>{{ t('common.videoWatermarkDesc') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-content">
        <img src="/icon.ico" :alt="t('common.brandName')" width="20" height="20" />
        <span>{{ t('common.brandProduct') }}</span>
        <span class="version-text">v{{ appVersion }}</span>
      </div>
    </div>
  </div>

  <div v-else class="home-container web-home">
    <section class="web-home-intro">
      <div>
        <span class="intro-kicker">{{ t('common.videoConvert') }}</span>
        <h1>{{ t('common.appName') }}</h1>
        <p>{{ t('common.videoConvertDesc') }}</p>
      </div>
    </section>

    <section class="web-home-grid">
      <article
        v-for="tool in webTools"
        :key="tool.path"
        class="tool-card"
        :class="tool.tone"
        @click="goTo(tool.path)"
      >
        <div class="tool-card-top">
          <span class="tool-icon" :style="{ background: tool.color }">
            <svg v-if="tool.icon === 'convert'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
            </svg>
            <svg v-else-if="tool.icon === 'compress'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 9l-7 7-7-7" />
            </svg>
            <svg v-else-if="tool.icon === 'audio'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <svg v-else-if="tool.icon === 'extract'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <svg v-else-if="tool.icon === 'merge'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M7 7h10v4l4-5-4-5v4H5v6h2V7zm10 10H7v-4l-4 5 4 5v-4h12v-6h-2v4z" />
            </svg>
            <svg v-else-if="tool.icon === 'watermark'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3l7 7-7 11-7-11 7-7zm0 3.2L8.6 9.6h6.8L12 6.2z" />
            </svg>
            <span v-else class="gif-label">GIF</span>
          </span>
          <span class="tool-chip">{{ tool.name }}</span>
        </div>

        <h3>{{ tool.name }}</h3>
        <p>{{ tool.desc }}</p>
        <span class="tool-action">{{ t('common.home') }}</span>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UserLoginButton from '@/components/UserLoginButton.vue'
import FeedbackButton from '@/components/FeedbackButton.vue'
import CustomSoftwareButton from '@/components/CustomSoftwareButton.vue'
import LangSelect from '@/components/LangSelect.vue'
import { platformService } from '@/services/platformService'
import { APP_CONFIG } from '@/config/app.config'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const appVersion = ref(APP_CONFIG.VERSION)

const routeNameMap: Record<string, string> = {
  'video-convert': 'VideoConvert',
  'video-merge': 'VideoMerge',
  'video-compress': 'VideoCompress',
  'audio-convert': 'AudioConvert',
  'video-extract-audio': 'VideoExtractAudio',
  'video-to-gif': 'VideoToGif',
  'video-watermark': 'VideoWatermark',
}

const goTo = async (name: string) => {
  const routeName = routeNameMap[name]
  if (!routeName) {
    console.error('Unknown route target:', name)
    return
  }

  try {
    await router.push(
      platformService.isElectron
        ? { name: routeName }
        : {
            path: `/${name}`,
            query: route.query,
          },
    )
  } catch (error) {
    console.error('Failed to navigate from Home:', name, error)
  }
}

const minimize = () => platformService.minimizeWindow()
const maximize = () => platformService.maximizeWindow()
const close = () => platformService.closeWindow()

const webTools = computed(() => [
  { name: t('common.videoConvert'), desc: t('common.videoConvertDesc'), path: 'video-convert', icon: 'convert', tone: 'tone-rose', color: '#e91e8c' },
  { name: t('common.videoCompress'), desc: t('common.videoCompressDesc'), path: 'video-compress', icon: 'compress', tone: 'tone-amber', color: '#ff9800' },
  { name: t('common.audioConvert'), desc: t('common.audioConvertDesc'), path: 'audio-convert', icon: 'audio', tone: 'tone-violet', color: '#9333ea' },
  { name: t('common.videoExtractAudio'), desc: t('common.videoExtractAudioDesc'), path: 'video-extract-audio', icon: 'extract', tone: 'tone-mint', color: '#14b8a6' },
  { name: t('common.videoToGif'), desc: t('common.videoToGifDesc'), path: 'video-to-gif', icon: 'gif', tone: 'tone-lime', color: '#84cc16' },
  { name: t('common.videoMerge'), desc: t('common.videoMergeDesc'), path: 'video-merge', icon: 'merge', tone: 'tone-sky', color: '#2563eb' },
  { name: t('common.videoWatermark'), desc: t('common.videoWatermarkDesc'), path: 'video-watermark', icon: 'watermark', tone: 'tone-teal', color: '#0f766e' },
])
</script>

<style lang="scss" scoped>
.home-container { width: 100%; flex: 1; min-height: 0; }
.desktop-home { background: #f5f7fa; display: flex; flex-direction: column; height: 100%; min-height: 0; }
.desktop-home .footer { height: 40px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.desktop-home .footer-content { display: flex; align-items: center; gap: 8px; color: #999; font-size: 12px; }
.desktop-home .footer-content .version-text { margin-left: 4px; color: #ccc; }
.desktop-home .title-bar { height: 50px; display: flex; justify-content: space-between; align-items: center; padding: 0 16px; background: #fff; -webkit-app-region: drag; flex-shrink: 0; }
.desktop-home .title-bar .logo { display: flex; align-items: center; gap: 10px; -webkit-app-region: no-drag; }
.desktop-home .title-bar .logo-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.desktop-home .title-bar .logo-text { font-size: 14px; font-weight: 500; color: #333; }
.desktop-home .title-bar .logo-sub { display: flex; align-items: center; gap: 8px; }
.desktop-home .title-bar .logo-separator { color: #e0e0e0; font-size: 14px; }
.desktop-home .title-bar .logo-product, .desktop-home .title-bar .version-text { font-size: 12px; color: #999; }
.desktop-home .title-bar .right-section { display: flex; align-items: center; gap: 12px; -webkit-app-region: no-drag; }
.desktop-home .title-bar .window-controls { display: flex; gap: 8px; }
.desktop-home .title-bar .control-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; color: #666; font-size: 14px; }
.desktop-home .title-bar .control-btn:hover { background: #f0f0f0; }
.desktop-home .title-bar .control-btn.close:hover { background: #ff5f57; color: white; }
.desktop-home .content { flex: 1; display: flex; overflow: hidden; min-height: 0; }
.desktop-home .main-content { flex: 1; padding: 24px 40px; display: flex; flex-direction: column; gap: 16px; overflow: auto; min-height: 0; }
.desktop-home .row { display: flex; gap: 16px; }
.desktop-home .row-top { flex: 2; }
.desktop-home .card, .desktop-home .card-small { transition: all 0.3s; cursor: pointer; }
.desktop-home .card { flex: 1; border-radius: 16px; padding: 24px; position: relative; display: flex; flex-direction: column; justify-content: flex-start; }
.desktop-home .card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.desktop-home .card.card-pink { background: linear-gradient(135deg, #fce4ec, #f8bbd9); }
.desktop-home .card.card-pink .card-icon { background: #e91e8c; }
.desktop-home .card.card-blue { background: linear-gradient(135deg, #e3f2fd, #b3e5fc); }
.desktop-home .card.card-blue .card-icon { background: #2196f3; }
.desktop-home .card.card-yellow { background: linear-gradient(135deg, #fff8e1, #ffe082); }
.desktop-home .card.card-yellow .card-icon { background: #ff9800; }
.desktop-home .card .card-info h3 { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px; }
.desktop-home .card .card-info p { font-size: 13px; color: #666; }
.desktop-home .card .card-icon { position: absolute; right: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.desktop-home .row-bottom { flex: 1; }
.desktop-home .card-small { flex: 1; background: #e8f8f6; border-radius: 14px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
.desktop-home .card-small:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.desktop-home .icon-box { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.desktop-home .icon-box.green { background: #9c27b0; }
.desktop-home .icon-box.cyan, .desktop-home .icon-box.teal { background: #36d1c4; }
.desktop-home .icon-box.lime { background: #8bc34a; }
.desktop-home .icon-box span { font-size: 12px; font-weight: bold; color: white; }
.desktop-home .text h4 { font-size: 15px; font-weight: 500; color: #333; margin-bottom: 6px; }
.desktop-home .text p { font-size: 12px; color: #888; }
.web-home { max-width: 1240px; width: 100%; margin: 0 auto; padding: 20px 24px 56px; box-sizing: border-box; }
.web-home-intro { margin-bottom: 20px; padding: 0 4px; }
.web-home-intro .intro-kicker { display: inline-flex; margin-bottom: 10px; padding: 6px 10px; border-radius: 999px; background: rgba(20,184,166,0.1); color: #0f766e; font-size: 12px; font-weight: 700; }
.web-home-intro h1 { margin: 0 0 10px; color: #0f172a; font-size: clamp(28px, 4vw, 40px); line-height: 1.1; letter-spacing: -0.03em; }
.web-home-intro p { margin: 0; color: #64748b; font-size: 15px; line-height: 1.8; }
.web-home-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.tool-card { padding: 22px; border-radius: 24px; border: 1px solid rgba(148,163,184,0.16); background: #fff; box-shadow: 0 18px 42px rgba(15,23,42,0.06); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 24px 50px rgba(15,23,42,0.1); }
.tool-card.tone-rose { background: linear-gradient(180deg, #fff1f6 0%, #ffffff 100%); }
.tool-card.tone-amber { background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%); }
.tool-card.tone-violet { background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%); }
.tool-card.tone-mint { background: linear-gradient(180deg, #ecfeff 0%, #ffffff 100%); }
.tool-card.tone-lime { background: linear-gradient(180deg, #f7fee7 0%, #ffffff 100%); }
.tool-card.tone-sky { background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); }
.tool-card.tone-teal { background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%); }
.tool-card h3 { margin: 18px 0 10px; color: #0f172a; font-size: 22px; }
.tool-card p { margin: 0; color: #475569; font-size: 15px; line-height: 1.8; min-height: 54px; }
.tool-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tool-icon { width: 56px; height: 56px; border-radius: 16px; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gif-label { font-size: 14px; font-weight: 800; letter-spacing: 0.08em; }
.tool-chip { padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,0.9); color: #334155; font-size: 11px; font-weight: 700; }
.tool-action { display: inline-flex; margin-top: 18px; color: #0f766e; font-size: 13px; font-weight: 700; }
@media (max-width: 980px) { .web-home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px) {
  .web-home { padding: 8px 8px 32px; }
  .web-home-intro { margin-bottom: 14px; padding: 0 4px; }
  .web-home-intro h1 { font-size: 26px; }
  .web-home-intro p { font-size: 14px; }
  .web-home-grid { grid-template-columns: 1fr; gap: 12px; }
  .tool-card { padding: 18px; border-radius: 18px; }
  .tool-card h3 { font-size: 20px; }
  .tool-card p { min-height: auto; font-size: 14px; }
  .tool-icon { width: 50px; height: 50px; border-radius: 14px; }
}
</style>
