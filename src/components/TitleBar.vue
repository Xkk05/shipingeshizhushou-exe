<template>
  <div class="title-bar">
    <div class="left">
      <span v-if="isMobile" class="menu-btn" @click="$emit('open-menu')">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </span>
      <span class="home-btn" @click="goHome">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        {{ t('common.home') }}
      </span>
    </div>
    <div class="right">
      <LangSelect />
      <FeedbackButton v-if="!isMobile" />
      <CustomSoftwareButton v-if="!isMobile" />
      <UserLoginButton />
      <div v-if="platformService.isElectron" class="window-controls">
        <span class="control-btn" @click="minimize">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 13H5v-2h14v2z"/></svg>
        </span>
        <span class="control-btn" @click="maximize">
          <svg v-if="!isMaximized" viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M7 7V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-2v2c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h2zm2 0h6c1.1 0 2 .9 2 2v6h2V5H9v2zm6 2H5v10h10V9z"/></svg>
        </span>
        <span class="control-btn close" @click="close">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import UserLoginButton from './UserLoginButton.vue'
import CustomSoftwareButton from './CustomSoftwareButton.vue'
import FeedbackButton from './FeedbackButton.vue'
import LangSelect from './LangSelect.vue'
import { platformService } from '@/services/platformService'

defineEmits(['open-menu'])

const { t } = useI18n()
const router = useRouter()

const isMobile = ref(window.innerWidth < 768)
const isMaximized = ref(false)
const updateView = () => { isMobile.value = window.innerWidth < 768 }

onMounted(async () => {
  window.addEventListener('resize', updateView)
  if (platformService.isElectron) {
    isMaximized.value = await platformService.isWindowMaximized()
    platformService.onWindowMaximizedChange((value) => { isMaximized.value = value })
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', updateView)
  if (platformService.isElectron) platformService.removeWindowMaximizedChangeListeners()
})

const goHome = () => router.push('/')
const minimize = () => platformService.minimizeWindow()
const maximize = () => platformService.maximizeWindow()
const close = () => platformService.closeWindow()
</script>

<style lang="scss" scoped>
.title-bar {
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background: #fff;
  -webkit-app-region: drag;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .left {
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    gap: 8px;

    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      cursor: pointer;
      color: #666;
      border-radius: 4px;
      
      &:hover {
        background: #f5f5f5;
        color: #36d1c4;
      }
    }
    
    .home-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
      cursor: pointer;
      font-size: 13px;
      padding: 4px 8px;
      border-radius: 4px;
      
      &:hover {
        background: #f5f5f5;
        color: #36d1c4;
      }
    }
  }

  .right {
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .window-controls {
    display: flex;
    gap: 8px;

    .control-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: #666;

      &:hover {
        background: #f0f0f0;
      }

      &.close:hover {
        background: #ff5f57;
        color: white;
      }
    }
  }
}
</style>
