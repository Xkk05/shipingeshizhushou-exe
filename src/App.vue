<template>
  <div class="app-layout" :class="{ 'is-web': !platformService.isElectron }">
    <!-- Web 端头部：全局唯一，切换页面时不销毁 -->
    <WebHeader v-if="!platformService.isElectron" />

    <div class="app-main">
      <router-view />
    </div>

    <!-- Web 端尾部：全局唯一 -->
    <WebFooter v-if="!platformService.isElectron" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { platformService } from '@/services/platformService'
import WebHeader from '@/components/web/WebHeader.vue'
import WebFooter from '@/components/web/WebFooter.vue'

console.log('--- App Initializing ---')
console.log('Is Electron:', platformService.isElectron)
</script>

<style lang="scss">
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
}

#app {
  width: 100%;
  height: 100%;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;

  &.is-web {
    min-height: 100vh;
    overflow-y: auto;
    
    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      background: #f5f7fa;
      min-height: 600px; // 确保中间区域至少有600px高度
    }
  }

  &:not(.is-web) {
    height: 100vh;
    overflow: hidden;
    background: #f8fafc;
    
    .app-main {
      height: 100%;
      min-height: 0;
    }
  }
}
</style>
