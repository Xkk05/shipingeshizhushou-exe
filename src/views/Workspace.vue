<template>
  <div class="workspace-container" :class="{ 'is-web': !platformService.isElectron }">
    <template v-if="platformService.isElectron">
      <div class="workspace-main">
        <aside class="sidebar" :class="{ 'hide-on-mobile': isMobile }">
          <div class="logo">
            <div class="logo-icon">
              <img src="/app-icon.ico" :alt="t('common.appName')" width="28" height="28" />
            </div>
            <span class="logo-text">{{ t('common.appName') }}</span>
            <div class="logo-sub">
              <span class="logo-separator">|</span>
              <span class="logo-product">{{ t('common.brandProduct') }}</span>
            </div>
          </div>

          <nav class="nav-menu">
            <div
              v-for="item in menuItems"
              :key="item.path"
              :class="['nav-item', { active: currentPath === item.path }]"
              @click="goTo(item.path)"
            >
              <span class="nav-icon" :style="{ background: item.color }">
                <component :is="item.icon" />
              </span>
              <span class="nav-text">{{ item.name }}</span>
            </div>
          </nav>
        </aside>

        <el-drawer
          v-if="isMobile"
          v-model="drawer"
          direction="ltr"
          size="280px"
          :with-header="false"
          class="mobile-drawer"
        >
          <div class="sidebar mobile-sidebar">
            <div class="logo">
              <div class="logo-icon">
                <img src="/app-icon.ico" :alt="t('common.appName')" width="28" height="28" />
              </div>
              <span class="logo-text">{{ t('common.appName') }}</span>
            </div>
            <nav class="nav-menu">
              <div
                v-for="item in menuItems"
                :key="item.path"
                :class="['nav-item', { active: currentPath === item.path }]"
                @click="goTo(item.path); drawer = false"
              >
                <span class="nav-icon" :style="{ background: item.color }">
                  <component :is="item.icon" />
                </span>
                <span class="nav-text">{{ item.name }}</span>
              </div>
            </nav>
          </div>
        </el-drawer>

        <main class="main-content">
          <TitleBar @open-menu="drawer = true" />
          <div class="page-content">
            <router-view />
          </div>
          <div class="footer">
            <div class="footer-content">
              <img src="/icon.ico" :alt="t('common.brandName')" width="20" height="20" />
              <span>{{ t('common.brandProduct') }}</span>
            </div>
          </div>
        </main>
      </div>
    </template>

    <template v-else>
      <section class="web-workspace">
        <div class="web-shell">
          <div class="web-shell-head">
            <div class="hero-copy">
              <span class="hero-kicker">{{ heroCopy.kicker }}</span>
              <h1>{{ heroCopy.title }}</h1>
              <p>{{ heroCopy.subtitle }}</p>
            </div>

            <div class="hero-lang">
              <LangSelect />
            </div>
          </div>

          <div class="web-tool-switcher">
            <button
              v-for="item in menuItems"
              :key="item.path"
              type="button"
              class="switch-chip"
              :class="{ active: currentPath === item.path }"
              @click="goTo(item.path)"
            >
              <span class="switch-chip-icon" :style="{ background: item.color }">
                <component :is="item.icon" />
              </span>
              <span class="switch-chip-copy">
                <strong>{{ item.name }}</strong>
                <small>{{ item.name }}</small>
              </span>
            </button>
          </div>

          <div class="web-shell-body">
            <router-view />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TitleBar from '@/components/TitleBar.vue'
import LangSelect from '@/components/LangSelect.vue'
import { platformService } from '@/services/platformService'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const drawer = ref(false)
const isMobile = ref(window.innerWidth < 768)

const updateView = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => window.addEventListener('resize', updateView))
onUnmounted(() => window.removeEventListener('resize', updateView))

const currentPath = computed(() => route.path.split('/').pop() || '')

const heroCopy = computed(() => ({
  kicker: t('common.videoConvert'),
  title: t('common.appName'),
  subtitle: t('common.videoConvertDesc'),
}))

const menuItems = computed(() => [
  { name: t('common.videoConvert'), path: 'video-convert', color: '#e91e8c', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z' })]) },
  { name: t('common.videoCompress'), path: 'video-compress', color: '#ff9800', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M19 9l-7 7-7-7' })]) },
  { name: t('common.audioConvert'), path: 'audio-convert', color: '#9333ea', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' })]) },
  { name: t('common.videoExtractAudio'), path: 'video-extract-audio', color: '#14b8a6', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' })]) },
  { name: t('common.videoToGif'), path: 'video-to-gif', color: '#84cc16', icon: () => h('span', { style: 'font-size: 10px; font-weight: 800;' }, 'GIF') },
  { name: t('common.videoMerge'), path: 'video-merge', color: '#2563eb', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M7 7h10v4l4-5-4-5v4H5v6h2V7zm10 10H7v-4l-4 5 4 5v-4h12v-6h-2v4z' })]) },
  { name: t('common.videoWatermark'), path: 'video-watermark', color: '#0f766e', icon: () => h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'white' }, [h('path', { d: 'M12 3l7 7-7 11-7-11 7-7zm0 3.2L8.6 9.6h6.8L12 6.2z' })]) },
])

const routeNameMap: Record<string, string> = {
  'video-convert': 'VideoConvert',
  'video-merge': 'VideoMerge',
  'video-compress': 'VideoCompress',
  'audio-convert': 'AudioConvert',
  'video-extract-audio': 'VideoExtractAudio',
  'video-to-gif': 'VideoToGif',
  'video-watermark': 'VideoWatermark',
}

const goTo = async (path: string) => {
  const routeName = routeNameMap[path]
  if (!routeName) {
    console.error('Unknown workspace route target:', path)
    return
  }

  try {
    await router.push(
      platformService.isElectron
        ? { name: routeName }
        : {
            path: `/${path}`,
            query: route.query,
          },
    )
  } catch (error) {
    console.error('Failed to navigate from Workspace:', path, error)
  }
}
</script>

<style lang="scss" scoped>
.workspace-container { width: 100%; height: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.workspace-main { display: flex; flex: 1; width: 100%; height: 100%; min-height: 100%; background: #fff; border-radius: 0; box-shadow: none; overflow: hidden; margin: 0; max-width: none; }
.sidebar { width: 200px; background: #fff; display: flex; flex-direction: column; border-right: 1px solid #f0f0f0; flex-shrink: 0; }
.sidebar.hide-on-mobile { display: none; }
@media (min-width: 768px) { .sidebar.hide-on-mobile { display: flex; } }
.logo { padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
.logo-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.logo-text { font-size: 12px; color: #333; line-height: 1.4; }
.logo-sub { display: flex; align-items: center; gap: 6px; }
.logo-separator { color: #e0e0e0; font-size: 12px; }
.logo-product { font-size: 10px; color: #999; }
.nav-menu { flex: 1; padding: 10px 0; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; }
.nav-item:hover { background: #f8f9fa; }
.nav-item.active { background: #e8f8f6; border-left-color: #36d1c4; }
.nav-item.active .nav-text { color: #36d1c4; font-weight: 500; }
.nav-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-text { font-size: 13px; color: #666; }
.main-content { flex: 1; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative; background: #f8fafc; min-height: 0; }
.page-content { flex: 1; height: 100%; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.footer { height: 40px; background: #fff; border-top: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.footer-content { display: flex; align-items: center; gap: 8px; color: #999; font-size: 12px; }
.mobile-drawer :deep(.el-drawer__body) { padding: 0; background: #fff; }
.mobile-sidebar { width: 100% !important; height: 100% !important; }
.web-workspace { width: min(1160px, calc(100% - 48px)); margin: 54px auto 0; }
.web-shell { background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98)); border: 1px solid #d9e5f2; border-radius: 26px; box-shadow: 0 28px 70px rgba(49, 93, 151, 0.14); overflow: hidden; }
.web-shell-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 34px 32px 28px; background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.14), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #ffffff 100%); border-bottom: 1px solid #dde8f5; }
.hero-copy { max-width: 700px; }
.hero-kicker { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; background: #e7f0ff; color: #2357aa; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; }
.hero-copy h1 { margin: 16px 0 12px; color: #122b4d; font-size: clamp(28px, 4vw, 40px); line-height: 1.12; }
.hero-copy p { margin: 0; color: #5f7594; font-size: 16px; line-height: 1.8; }
.hero-lang { display: flex; align-items: center; padding-top: 10px; flex-shrink: 0; }
.hero-lang :deep(.lang-btn) { min-width: 146px; height: 44px; padding: 0 16px; justify-content: space-between; border: 1px solid #d7e2ef; border-radius: 12px; background: #fff; color: #243b5a; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65); }
.web-shell-body { padding: 24px 24px 28px; background: linear-gradient(180deg, #ffffff 0%, #f9fbfe 100%); }
.web-tool-switcher { display: flex; gap: 12px; padding: 18px 24px 0; overflow-x: auto; background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%); }
.web-tool-switcher::-webkit-scrollbar { height: 6px; }
.switch-chip { min-width: 198px; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid #d8e4f0; border-radius: 18px; background: #fff; cursor: pointer; transition: all 0.22s ease; box-shadow: 0 10px 22px rgba(60, 98, 145, 0.06); }
.switch-chip:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(60, 98, 145, 0.1); }
.switch-chip.active { border-color: #9cc0ed; background: linear-gradient(180deg, #f4f9ff 0%, #ffffff 100%); box-shadow: 0 16px 34px rgba(60, 98, 145, 0.12); }
.switch-chip-icon { width: 40px; height: 40px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.switch-chip-copy { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.switch-chip-copy strong { color: #143355; font-size: 14px; line-height: 1.3; }
.switch-chip-copy small { color: #6f86a3; font-size: 11px; line-height: 1.35; }
@media (max-width: 900px) { .web-workspace { width: min(100%, calc(100% - 20px)); margin: 18px auto 0; } .web-shell { border-radius: 18px; } .web-shell-head { flex-direction: column; padding: 22px 18px 18px; } .web-tool-switcher { padding: 14px 14px 0; gap: 10px; } .switch-chip { min-width: 182px; padding: 12px 14px; border-radius: 16px; } .web-shell-body { padding: 14px; } .hero-lang { padding-top: 0; } }
</style>
