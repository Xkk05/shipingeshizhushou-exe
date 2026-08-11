<template>
  <div class="web-footer-stack">
    <section class="language-panel">
      <div class="language-panel-inner">
        <div class="language-title">{{ languageTitle }}</div>
        <div class="language-links">
          <button
            v-for="lang in languages"
            :key="lang.code"
            type="button"
            class="language-link"
            :class="{ active: locale === lang.code }"
            @click="switchLocale(lang.code)"
          >
            {{ lang.name }}
          </button>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section footer-brand-section">
            <a href="https://www.kunqiongai.com/" class="footer-brand-link">
              <img src="https://www.kunqiongai.com/logo2.png" :alt="brandAlt" class="footer-logo" />
            </a>
            <p class="footer-desc">{{ t('common.appName') }}</p>
            <div class="footer-social">
              <a href="https://www.kunqiongai.com/#" class="social-icon" :aria-label="socialText.douyin"><img src="https://www.kunqiongai.com/dy.png" :alt="socialText.douyin" /></a>
              <a href="https://www.kunqiongai.com/#" class="social-icon" :aria-label="socialText.wechat"><img src="https://www.kunqiongai.com/wx.png" :alt="socialText.wechat" /></a>
              <a href="https://www.kunqiongai.com/#" class="social-icon" :aria-label="socialText.videoChannel"><img src="https://www.kunqiongai.com/wb.png" :alt="socialText.videoChannel" /></a>
            </div>
          </div>

          <div class="footer-section">
            <h4>{{ t('common.home') }}</h4>
            <ul>
              <li><a href="/">{{ t('common.home') }}</a></li>
              <li><a href="/video-convert">{{ t('common.videoConvert') }}</a></li>
              <li><a href="/video-compress">{{ t('common.videoCompress') }}</a></li>
              <li><a href="/audio-convert">{{ t('common.audioConvert') }}</a></li>
              <li><a href="https://www.kunqiongai.com/feedback">{{ t('common.feedback') }}</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h4>{{ t('common.videoConvert') }}</h4>
            <ul>
              <li><a href="/video-extract-audio">{{ t('common.videoExtractAudio') }}</a></li>
              <li><a href="/video-to-gif">{{ t('common.videoToGif') }}</a></li>
              <li><a href="/video-merge">{{ t('common.videoMerge') }}</a></li>
              <li><a href="/video-watermark">{{ t('common.videoWatermark') }}</a></li>
              <li><a href="/audio-convert">{{ t('common.audioConvert') }}</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h4>{{ t('common.feedback') }}</h4>
            <ul class="contact-list">
              <li><img src="https://www.kunqiongai.com/gonsi.png" alt="" class="contact-icon-img" /><span>{{ companyText }}</span></li>
              <li><img src="https://www.kunqiongai.com/dianhua.png" alt="" class="contact-icon-img" /><span>17770307066</span></li>
              <li><img src="https://www.kunqiongai.com/weizhi.png" alt="" class="contact-icon-img" /><span>{{ addressText }}</span></li>
              <li><img src="https://www.kunqiongai.com/youxiang.png" alt="" class="contact-icon-img" /><span>11247931@qq.com</span></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="copyright-links">
            <span>{{ copyrightText }}</span>
            <span class="separator">|</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">赣ICP备2022004738号-6</a>
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { platformService } from '@/services/platformService'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const languages = [
  { code: 'zh-CN', name: '简体中文' }, { code: 'zh-TW', name: '繁體中文' }, { code: 'en-US', name: 'English' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' }, { code: 'es', name: 'Español' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' }, { code: 'pt-BR', name: 'Português (Brasil)' }, { code: 'ru', name: 'Русский' }, { code: 'ar', name: 'العربية' }, { code: 'vi', name: 'Tiếng Việt' }, { code: 'th', name: 'ไทย' }, { code: 'id', name: 'Bahasa Indonesia' }, { code: 'pl', name: 'Polski' }, { code: 'nl', name: 'Nederlands' }, { code: 'tr', name: 'Türkçe' }, { code: 'uk', name: 'Українська' }, { code: 'he', name: 'עברית' }, { code: 'fa', name: 'فارسی' }, { code: 'hi', name: 'हिन्दी' }, { code: 'bn', name: 'বাংলা' }, { code: 'ms', name: 'Bahasa Melayu' }, { code: 'sw', name: 'Kiswahili' }, { code: 'ta', name: 'தமிழ்' }, { code: 'tl', name: 'Tagalog' }, { code: 'ur', name: 'اردو' },
]

const switchLocale = async (code: string) => {
  locale.value = code
  localStorage.setItem('app_locale', code)

  if (!platformService.isElectron) {
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        lang: code,
      },
      hash: route.hash,
    })
  }
}

const languageTitleMap: Record<string, string> = {
  'en-US': 'LANGUAGE',
  'zh-CN': '语言',
  'zh-TW': '語言',
  ja: '言語',
  ko: '언어',
  fr: 'LANGUE',
  de: 'SPRACHE',
  es: 'IDIOMA',
  it: 'LINGUA',
  pt: 'IDIOMA',
  'pt-BR': 'IDIOMA',
  ru: 'ЯЗЫК',
  ar: 'اللغة',
  vi: 'NGÔN NGỮ',
  th: 'ภาษา',
  id: 'BAHASA',
  pl: 'JĘZYK',
  nl: 'TAAL',
  tr: 'DİL',
  uk: 'МОВА',
  he: 'שפה',
  fa: 'زبان',
  hi: 'भाषा',
  bn: 'ভাষা',
  ms: 'BAHASA',
  sw: 'LUGHA',
  ta: 'மொழி',
  tl: 'WIKA',
  ur: 'زبان',
}

const companyMap: Record<string, string> = {
  'en-US': 'Jiangxi Liujiaoxing Technology Co., Ltd.',
  'zh-CN': '江西六角星科技有限公司',
  'zh-TW': '江西六角星科技有限公司',
  ja: '江西六角星科技有限公司',
  ko: '장시 류자오싱 테크놀로지 유한회사',
  th: 'Jiangxi Liujiaoxing Technology Co., Ltd.',
}

const addressMap: Record<string, string> = {
  'en-US': '19F, Building 2, No. 9 Tianyou Avenue, Shangrao High-speed Rail Pilot Zone, Jiangxi',
  'zh-CN': '江西省上饶高铁试验区天佑大道9号2栋19F',
  'zh-TW': '江西省上饒高鐵試驗區天佑大道9號2棟19F',
  ja: '江西省上饶高速鉄道試験区天佑大道9号2棟19F',
  ko: '장시성 상라오 고속철도 시험구 톈유대로 9호 2동 19층',
  th: '19F อาคาร 2 เลขที่ 9 ถนน Tianyou เขตทดลองรถไฟความเร็วสูง Shangrao มณฑลเจียงซี',
}

const copyrightMap: Record<string, string> = {
  'en-US': '© 2026 Kunqiong AI Toolbox. All rights reserved.',
  'zh-CN': '© 2026 鲲穹AI工具箱 保留所有权利。',
  'zh-TW': '© 2026 鯤穹AI工具箱 保留所有權利。',
  fr: '© 2026 Kunqiong AI Toolbox. Tous droits réservés.',
  de: '© 2026 Kunqiong AI Toolbox. Alle Rechte vorbehalten.',
  es: '© 2026 Kunqiong AI Toolbox. Todos los derechos reservados.',
  it: '© 2026 Kunqiong AI Toolbox. Tutti i diritti riservati.',
  pt: '© 2026 Kunqiong AI Toolbox. Todos os direitos reservados.',
  'pt-BR': '© 2026 Kunqiong AI Toolbox. Todos os direitos reservados.',
  ru: '© 2026 Kunqiong AI Toolbox. Все права защищены.',
  ar: '© 2026 Kunqiong AI Toolbox. جميع الحقوق محفوظة.',
  vi: '© 2026 Kunqiong AI Toolbox. Bảo lưu mọi quyền.',
  th: '© 2026 Kunqiong AI Toolbox. สงวนลิขสิทธิ์ทั้งหมด',
  id: '© 2026 Kunqiong AI Toolbox. Hak cipta dilindungi.',
  pl: '© 2026 Kunqiong AI Toolbox. Wszelkie prawa zastrzeżone.',
  nl: '© 2026 Kunqiong AI Toolbox. Alle rechten voorbehouden.',
  tr: '© 2026 Kunqiong AI Toolbox. Tüm hakları saklıdır.',
  uk: '© 2026 Kunqiong AI Toolbox. Усі права захищено.',
  he: '© 2026 Kunqiong AI Toolbox. כל הזכויות שמורות.',
  fa: '© 2026 Kunqiong AI Toolbox. تمامی حقوق محفوظ است.',
  hi: '© 2026 Kunqiong AI Toolbox. सर्वाधिकार सुरक्षित।',
  bn: '© 2026 Kunqiong AI Toolbox. সর্বস্বত্ব সংরক্ষিত।',
  ms: '© 2026 Kunqiong AI Toolbox. Hak cipta terpelihara.',
  sw: '© 2026 Kunqiong AI Toolbox. Haki zote zimehifadhiwa.',
  ta: '© 2026 Kunqiong AI Toolbox. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
  tl: '© 2026 Kunqiong AI Toolbox. Nakalaan ang lahat ng karapatan.',
  ur: '© 2026 Kunqiong AI Toolbox. جملہ حقوق محفوظ ہیں۔',
}

const languageTitle = computed(() => languageTitleMap[locale.value] || languageTitleMap['en-US'])
const companyText = computed(() => companyMap[locale.value] || companyMap['en-US'])
const addressText = computed(() => addressMap[locale.value] || addressMap['en-US'])
const copyrightText = computed(() => copyrightMap[locale.value] || copyrightMap['en-US'])
const brandAlt = computed(() => companyText.value)
const socialText = computed(() => ({
  douyin: locale.value.startsWith('zh') ? '抖音' : 'Douyin',
  wechat: locale.value.startsWith('zh') ? '微信' : 'WeChat',
  videoChannel: locale.value === 'zh-TW' ? '影片號' : locale.value === 'zh-CN' ? '视频号' : 'Video Channel',
}))
</script>

<style lang="scss" scoped>
.web-footer-stack { width: 100%; margin-top: auto; }
.language-panel { width: min(1160px, calc(100% - 48px)); margin: -24px auto 30px; position: relative; z-index: 2; }
.language-panel-inner { background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98)); border: 1px solid #d9e5f2; border-top: none; border-radius: 0 0 24px 24px; box-shadow: 0 28px 55px rgba(49, 93, 151, 0.1); padding: 26px 32px 28px; }
.language-title { margin-bottom: 18px; color: #44648e; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; }
.language-links { display: flex; flex-wrap: wrap; gap: 10px 0; }
.language-link { border: none; background: transparent; padding: 0; color: #567193; font-size: 14px; line-height: 1.8; cursor: pointer; }
.language-link::after { content: '|'; margin: 0 8px; color: #a7b8cd; }
.language-link:last-child::after { display: none; }
.language-link.active { color: #1f5fb8; font-weight: 700; }
.footer { width: 100%; background: #1e293b; color: #fff; padding: 56px 0 28px; }
.container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 28px; box-sizing: border-box; }
.footer-content { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(160px, 0.8fr) minmax(160px, 0.8fr) minmax(0, 1.1fr); gap: 36px; align-items: start; margin-bottom: 42px; }
.footer-section { min-width: 0; }
.footer-section h4 { margin: 0 0 22px; color: #f8fafc; font-size: 16px; font-weight: 700; position: relative; }
.footer-section h4::after { content: ''; position: absolute; left: 0; bottom: -8px; width: 30px; height: 2px; background: #36d1c4; }
.footer-section ul { margin: 0; padding: 0; list-style: none; }
.footer-section li { margin-bottom: 12px; color: #94a3b8; font-size: 14px; line-height: 1.65; }
.footer-section a { color: #94a3b8; text-decoration: none; transition: color 0.24s ease; }
.footer-section a:hover { color: #36d1c4; }
.footer-brand-link { display: inline-flex; max-width: 320px; margin-bottom: 18px; }
.footer-logo { width: 100%; max-width: 320px; height: auto; display: block; object-fit: contain; }
.footer-desc { max-width: 360px; margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.8; }
.footer-social { display: flex; gap: 14px; }
.social-icon { width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.08); transition: background 0.24s ease; }
.social-icon:hover { background: rgba(54,209,196,0.16); }
.social-icon img { width: 22px; height: 22px; object-fit: contain; }
.contact-list li { display: flex; align-items: flex-start; gap: 10px; }
.contact-icon-img { width: 16px; height: 16px; margin-top: 4px; flex-shrink: 0; object-fit: contain; }
.footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
.copyright-links { margin: 0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.8; }
.copyright-links a { color: #94a3b8; text-decoration: none; }
.copyright-links a:hover { color: #36d1c4; }
.separator { margin: 0 12px; color: rgba(255,255,255,0.26); }
@media (max-width: 1024px) { .language-panel { width: min(100%, calc(100% - 20px)); margin: -16px auto 18px; } .language-panel-inner { padding: 20px 18px 22px; border-radius: 0 0 18px 18px; } .container { padding: 0 20px; } .footer-content { grid-template-columns: 1fr 1fr; gap: 28px; } }
@media (max-width: 640px) { .footer { padding: 42px 0 24px; } .container { padding: 0 16px; } .footer-content { grid-template-columns: 1fr; gap: 26px; } .footer-brand-link, .footer-desc { max-width: 100%; } .footer-brand-link { max-width: 240px; margin-bottom: 12px; } .footer-logo { max-width: 240px; } .footer-desc { margin-bottom: 18px; font-size: 13px; line-height: 1.7; } .footer-social { gap: 10px; } .social-icon { width: 36px; height: 36px; } .copyright-links { text-align: left; } .separator { margin: 0 8px; } }
</style>
