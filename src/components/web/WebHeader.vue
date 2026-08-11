<template>
  <header class="header header-home">
    <div class="header-container">
      <div class="header-left">
        <a href="/" class="logo">
          <img src="https://www.kunqiongai.com/logo.png" alt="Kunqiong AI Toolbox" class="logo-img" />
        </a>
      </div>

      <nav class="nav" aria-label="Primary">
        <div class="nav-track">
          <a href="https://www.kunqiongai.com/" class="nav-link active">{{ t('common.home') }}</a>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/ai" class="nav-link">{{ t('web.header.aiTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/office" class="nav-link">{{ t('web.header.officeTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/multimedia" class="nav-link">{{ t('web.header.multimedia') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/development" class="nav-link">{{ t('web.header.devTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/text" class="nav-link">{{ t('web.header.textTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/file" class="nav-link">{{ t('web.header.fileTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/system" class="nav-link">{{ t('web.header.systemTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/category/life" class="nav-link">{{ t('web.header.lifeTools') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/news" class="nav-link">{{ t('web.header.aiNews') }}</a></div>
          <div class="nav-item-wrapper"><a href="https://www.kunqiongai.com/custom" class="nav-link">{{ t('web.header.customSoftware') }}</a></div>
        </div>
      </nav>

      <div class="header-right">
        <form class="search-box" @submit.prevent="submitSearch">
          <button type="submit" class="search-icon-btn" :aria-label="t('common.search')"><span>🔍</span></button>
          <input v-model="searchQuery" type="text" :placeholder="t('common.search')" />
        </form>

        <div class="header-actions">
          <button class="header-search-btn" :aria-label="t('common.search')" @click="toggleMobileSearch">
            <img src="https://www.kunqiongai.com/sousuo.png" alt="search" class="header-search-icon" />
          </button>
          <button class="mobile-menu-btn" :aria-label="t('common.home')">☰</button>
          <UserLoginButton class="header-login-entry" :label="t('common.login')" />
        </div>
      </div>
    </div>

    <form v-if="showMobileSearch" class="mobile-search-bar" @submit.prevent="submitSearch">
      <button type="submit" class="mobile-search-submit" :aria-label="t('common.search')">🔍</button>
      <input ref="mobileSearchInput" v-model="searchQuery" type="text" :placeholder="t('common.search')" />
    </form>
  </header>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UserLoginButton from '@/components/UserLoginButton.vue'
import { platformService } from '@/services/platformService'

const { t } = useI18n()
const searchQuery = ref('')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

const toggleMobileSearch = async () => {
  showMobileSearch.value = !showMobileSearch.value
  if (showMobileSearch.value) {
    await nextTick()
    mobileSearchInput.value?.focus()
  }
}

const submitSearch = () => {
  const keyword = searchQuery.value.trim()
  const url = keyword ? `https://www.kunqiongai.com/?s=${encodeURIComponent(keyword)}` : 'https://www.kunqiongai.com/'
  platformService.openExternalUrl(url)
}
</script>

<style lang="scss" scoped>
.header { position: sticky; top: 0; z-index: 120; background: #fff; border-bottom: 1px solid #edf2f7; }
.header-container { width: 100%; max-width: 1480px; margin: 0 auto; padding: 0 14px; box-sizing: border-box; min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.header-left { flex-shrink: 0; }
.logo { display: inline-flex; align-items: center; text-decoration: none; }
.logo-img { display: block; height: 42px; width: auto; max-width: 220px; object-fit: contain; }
.nav { flex: 1; min-width: 0; margin: 0 6px; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.nav::-webkit-scrollbar { display: none; }
.nav-track { width: max-content; min-width: 100%; display: flex; align-items: center; justify-content: flex-start; gap: 16px; }
.nav-item-wrapper { display: flex; align-items: center; flex-shrink: 0; }
.nav-link { display: inline-flex; align-items: center; flex-shrink: 0; min-height: 38px; text-decoration: none; color: #111827; font-size: 14px; font-weight: 500; white-space: nowrap; transition: color 0.24s ease; }
.nav-link:hover, .nav-link.active { color: #2563eb; }
.header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.search-box { width: 220px; height: 40px; display: flex; align-items: center; border-radius: 999px; background: #f8fafc; border: 1px solid #d9e1ea; padding: 0 14px; box-sizing: border-box; }
.search-box input { flex: 1; border: none; outline: none; background: transparent; color: #334155; font-size: 13px; padding-left: 8px; }
.search-icon-btn { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; padding: 0; color: #64748b; cursor: pointer; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.header-search-btn { width: 40px; height: 40px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; display: none; align-items: center; justify-content: center; cursor: pointer; }
.mobile-menu-btn { display: none; width: 40px; height: 40px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; align-items: center; justify-content: center; cursor: pointer; color: #334155; font-size: 18px; }
.header-search-icon { width: 16px; height: 16px; object-fit: contain; }
.mobile-search-bar { display: none; }
.header-login-entry :deep(.login-btn) { height: 40px; padding: 0 18px; border: none; border-radius: 10px; background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%); color: #fff; font-size: 14px; font-weight: 700; box-shadow: 0 8px 18px rgba(37, 99, 235, 0.25); }
.header-login-entry :deep(.login-btn:hover) { background: linear-gradient(180deg, #4f8df7 0%, #2f6ef0 100%); color: #fff; }
.header-login-entry :deep(.user-info) { height: 40px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; box-sizing: border-box; }
@media (max-width: 1360px) { .search-box { display: none; } .nav { padding-bottom: 6px; scrollbar-width: thin; scrollbar-color: rgba(59, 130, 246, 0.55) rgba(219, 231, 245, 0.75); } .nav::-webkit-scrollbar { display: block; height: 6px; } .nav::-webkit-scrollbar-track { background: rgba(219, 231, 245, 0.75); border-radius: 999px; } .nav::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.55); border-radius: 999px; } }
@media (max-width: 1220px) { .search-box { display: none; } .header-search-btn, .mobile-menu-btn, .header-login-entry { display: inline-flex; } .header { padding: 6px 6px 0; } .header-container { min-height: auto; padding: 12px 14px 8px; width: 100%; display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'brand actions' 'nav nav'; gap: 14px 12px; background: #fff; border: 1px solid #dbe7f5; border-radius: 16px 16px 0 0; box-shadow: 0 10px 26px rgba(59, 130, 246, 0.08); } .header-left { grid-area: brand; } .header-right { grid-area: actions; gap: 10px; justify-self: end; } .logo-img { height: 40px; max-width: 190px; } .nav { grid-area: nav; margin: 0; padding: 2px 2px 8px; border-top: 1px solid rgba(219, 231, 245, 0.9); scrollbar-width: thin; scrollbar-color: rgba(59, 130, 246, 0.55) rgba(219, 231, 245, 0.75); } .nav::-webkit-scrollbar { display: block; height: 6px; } .nav::-webkit-scrollbar-track { background: rgba(219, 231, 245, 0.75); border-radius: 999px; } .nav::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.55); border-radius: 999px; } .nav-track { min-width: max-content; justify-content: flex-start; gap: 18px; } .nav-link { position: relative; min-height: 36px; padding: 10px 0 12px; border-radius: 0; background: transparent !important; font-size: 14px; } .nav-link.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; border-radius: 999px; background: #10b981; } .header-search-btn, .mobile-menu-btn { width: 42px; height: 42px; border-radius: 999px; border: 1px solid #d1d5db; background: #fff; } .header-login-entry :deep(.login-btn) { min-width: 112px; height: 42px; padding: 0 18px; border-radius: 999px; } .header-login-entry :deep(.user-info) { min-width: 112px; height: 42px; justify-content: center; } .header-login-entry :deep(.user-info .nickname) { max-width: 54px; } .mobile-search-bar { margin: 0 6px; padding: 0 12px 10px; display: flex; align-items: center; gap: 10px; background: #fff; border-left: 1px solid #dbe7f5; border-right: 1px solid #dbe7f5; border-bottom: 1px solid #dbe7f5; border-radius: 0 0 16px 16px; } .mobile-search-submit { width: 42px; height: 42px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; cursor: pointer; flex-shrink: 0; } .mobile-search-bar input { flex: 1; height: 42px; border: 1px solid #dbe7f5; border-radius: 999px; background: #fff; outline: none; padding: 0 16px; box-sizing: border-box; font-size: 14px; } }
@media (max-width: 640px) { .header { padding: 4px 4px 0; } .header-container { padding: 10px 12px 6px; gap: 12px 10px; border-radius: 14px 14px 0 0; } .logo-img { height: 36px; max-width: 176px; } .mobile-search-bar { margin: 0 4px; padding: 0 10px 8px; border-radius: 0 0 14px 14px; } }
</style>
