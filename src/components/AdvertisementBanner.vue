<template>
  <div class="ad-banner">
    <img 
      v-if="advertisement"
      :src="advertisement.adv_url" 
      :alt="advertisement.adv_position"
      class="ad-image"
      @click="handleAdClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { platformService } from '@/services/platformService'

interface Advertisement {
  soft_number: number
  adv_position: string
  adv_url: string
  target_url: string
  width: number
  height: number
}

const { t } = useI18n()
const props = defineProps<{
  position: string
}>()

const authStore = useAuthStore()
const advertisement = ref<Advertisement | null>(null)

const fetchAdvertisement = async () => {
  try {
    const response = await fetch('https://api-web.kunqiongai.com/soft_desktop/get_adv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'token': authStore.token || ''
      },
      body: new URLSearchParams({
        soft_number: '10005',
        adv_position: props.position
      }).toString()
    })

    const result = await response.json()
    if (result.code === 1 && result.data && result.data.length > 0) {
      advertisement.value = result.data[0]
    }
  } catch (error) {
    console.error(t('error.getAdvPositionFailed', { position: props.position }) + ':', error)
  }
}

const handleAdClick = () => {
  if (advertisement.value?.target_url) {
    platformService.openExternalUrl(advertisement.value.target_url)
  }
}

onMounted(() => {
  fetchAdvertisement()
})
</script>

<style lang="scss" scoped>
.ad-banner {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

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
}
</style>
