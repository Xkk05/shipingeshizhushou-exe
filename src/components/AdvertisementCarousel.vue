<template>
  <div class="ad-carousel" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="advertisements.length > 0" class="carousel-container">
      <img 
        :src="currentAd.adv_url" 
        :alt="currentAd.adv_position"
        class="ad-image"
        @click="handleAdClick"
      />
      
      <!-- 切换按钮 -->
      <div v-if="isHovering && advertisements.length > 1" class="controls">
        <button class="nav-btn prev" @click="prevAd" :title="$t('common.previous')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button class="nav-btn next" @click="nextAd" :title="$t('common.next')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
      
      <div class="carousel-dots">
        <span 
          v-for="(ad, index) in advertisements" 
          :key="index"
          :class="['dot', { active: currentIndex === index }]"
          @click="currentIndex = index"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from 'vue-i18n'
import { platformService } from '@/services/platformService'

const { t } = useI18n()

interface Advertisement {
  soft_number: number
  adv_position: string
  adv_url: string
  target_url: string
  width: number
  height: number
}

const props = defineProps<{
  positions: string[]
}>()

const authStore = useAuthStore()
const advertisements = ref<Advertisement[]>([])
const currentIndex = ref(0)
const loading = ref(false)
const isHovering = ref(false)
let autoPlayTimer: NodeJS.Timeout | null = null

const currentAd = computed(() => advertisements.value[currentIndex.value])

const fetchAdvertisements = async () => {
  loading.value = true
  try {
    const ads: Advertisement[] = []
    
    for (const position of props.positions) {
      try {
        const response = await fetch('https://api-web.kunqiongai.com/soft_desktop/get_adv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'token': authStore.token || ''
          },
          body: new URLSearchParams({
            soft_number: '10005',
            adv_position: position
          }).toString()
        })

        const result = await response.json()
        if (result.code === 1 && result.data && result.data.length > 0) {
          ads.push(...result.data)
        }
      } catch (error) {
        console.error(t('error.getAdvPositionFailed', { position }), error)
      }
    }

    advertisements.value = ads
    startAutoPlay()
  } catch (error) {
    console.error(t('error.getAdvFailed'), error)
  } finally {
    loading.value = false
  }
}

const startAutoPlay = () => {
  if (autoPlayTimer) clearInterval(autoPlayTimer)
  autoPlayTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % advertisements.value.length
  }, 5000)
}

const handleAdClick = () => {
  if (currentAd.value?.target_url) {
    platformService.openExternalUrl(currentAd.value.target_url)
  }
}

const prevAd = () => {
  currentIndex.value = (currentIndex.value - 1 + advertisements.value.length) % advertisements.value.length
}

const nextAd = () => {
  currentIndex.value = (currentIndex.value + 1) % advertisements.value.length
}

onMounted(() => {
  fetchAdvertisements()
})

onUnmounted(() => {
  if (autoPlayTimer) clearInterval(autoPlayTimer)
})
</script>

<style lang="scss" scoped>
.ad-carousel {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .loading {
    color: #999;
    font-size: 12px;
  }

  .carousel-container {
    width: 100%;
    height: 100%;
    position: relative;

    .ad-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.3s;

      &:hover {
        transform: scale(1.05);
      }
    }

    .controls {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
      padding: 0 8px;
      pointer-events: auto;

      .nav-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;

        &:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.1);
        }

        &.prev, &.next {
          padding: 0;
        }
      }
    }

    .carousel-dots {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background: rgba(255, 255, 255, 0.8);
        }

        &.active {
          background: white;
          width: 12px;
          border-radius: 3px;
        }
      }
    }
  }
}
</style>
