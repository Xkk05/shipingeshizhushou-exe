<template>
  <div class="lang-select">
    <el-dropdown trigger="click" @command="handleCommand">
      <div class="lang-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
        <span class="lang-text">{{ currentLangName }}</span>
      </div>
      <template #dropdown>
        <el-dropdown-menu class="lang-dropdown-menu">
          <el-dropdown-item v-for="lang in languages" :key="lang.code" :command="lang.code" :disabled="locale === lang.code">
            {{ lang.name }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { platformService } from '@/services/platformService'

const { locale } = useI18n()
const route = useRoute()
const router = useRouter()

const languages = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en-US', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'pl', name: 'Polski' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська' },
  { code: 'he', name: 'עברית' },
  { code: 'fa', name: 'فارسی' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ur', name: 'اردو' },
]

const currentLangName = computed(() => {
  const lang = languages.find((l) => l.code === locale.value)
  return lang ? lang.name : 'Language'
})

const handleCommand = async (command: string) => {
  locale.value = command
  localStorage.setItem('app_locale', command)

  if (!platformService.isElectron) {
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        lang: command,
      },
      hash: route.hash,
    })
  }
}
</script>

<style lang="scss" scoped>
.lang-select {
  .lang-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.3s;
    font-size: 13px;

    &:hover {
      background: #f5f5f5;
      color: #36d1c4;
    }
  }

  .lang-text {
    font-weight: 500;
  }
}
</style>

<style lang="scss">
.lang-dropdown-menu {
  max-height: 400px;
  overflow-y: auto;
}
</style>
