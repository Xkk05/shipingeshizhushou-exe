import { watch } from 'vue'
import type { Router } from 'vue-router'
import { SUPPORTED_LOCALES } from '@/i18n'

const DEFAULT_SITE_URL = 'https://media.kunqiongai.com'
const DEFAULT_LOCALE = 'zh-CN'

const routePaths = {
  home: '/',
  'video-convert': '/video-convert',
  'video-compress': '/video-compress',
  'audio-convert': '/audio-convert',
  'video-extract-audio': '/video-extract-audio',
  'video-to-gif': '/video-to-gif',
  'video-merge': '/video-merge',
  'video-watermark': '/video-watermark',
} as const

type SeoKey = keyof typeof routePaths

type I18nLike = {
  global: {
    locale: { value: string } | string
    t: (key: string) => string
  }
}

const ogLocaleMap: Record<string, string> = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  'en-US': 'en_US',
  ja: 'ja_JP',
  ko: 'ko_KR',
  fr: 'fr_FR',
  de: 'de_DE',
  es: 'es_ES',
  it: 'it_IT',
  pt: 'pt_PT',
  'pt-BR': 'pt_BR',
  ru: 'ru_RU',
  ar: 'ar_AR',
  vi: 'vi_VN',
  th: 'th_TH',
  id: 'id_ID',
  pl: 'pl_PL',
  nl: 'nl_NL',
  tr: 'tr_TR',
  uk: 'uk_UA',
  he: 'he_IL',
  fa: 'fa_IR',
  hi: 'hi_IN',
  bn: 'bn_BD',
  ms: 'ms_MY',
  sw: 'sw_KE',
  ta: 'ta_IN',
  tl: 'tl_PH',
  ur: 'ur_PK',
}

const routeMetaBuilders: Record<
  SeoKey,
  (t: (key: string) => string, siteName: string) => { title: string; description: string; keywords: string }
> = {
  home: (t, siteName) => {
    const tools = [
      t('common.videoConvert'),
      t('common.videoCompress'),
      t('common.audioConvert'),
      t('common.videoExtractAudio'),
      t('common.videoMerge'),
      t('common.videoToGif'),
      t('common.videoWatermark'),
    ]
    return {
      title: `${siteName} - ${t('web.home.title')}`,
      description: t('web.home.subtitle'),
      keywords: tools.join(','),
    }
  },
  'video-convert': (t, siteName) => ({
    title: `${t('common.videoConvert')} - ${siteName}`,
    description: t('common.videoConvertDesc'),
    keywords: [t('common.videoConvert'), 'MP4', 'AVI', 'MOV', 'MKV'].join(','),
  }),
  'video-compress': (t, siteName) => ({
    title: `${t('common.videoCompress')} - ${siteName}`,
    description: t('common.videoCompressDesc'),
    keywords: [t('common.videoCompress'), t('common.videoConvert'), 'MP4'].join(','),
  }),
  'audio-convert': (t, siteName) => ({
    title: `${t('common.audioConvert')} - ${siteName}`,
    description: t('common.audioConvertDesc'),
    keywords: [t('common.audioConvert'), 'MP3', 'WAV', 'AAC'].join(','),
  }),
  'video-extract-audio': (t, siteName) => ({
    title: `${t('common.videoExtractAudio')} - ${siteName}`,
    description: t('common.videoExtractAudioDesc'),
    keywords: [t('common.videoExtractAudio'), t('common.audioConvert'), 'MP3', 'WAV'].join(','),
  }),
  'video-to-gif': (t, siteName) => ({
    title: `${t('common.videoToGif')} - ${siteName}`,
    description: t('common.videoToGifDesc'),
    keywords: [t('common.videoToGif'), 'GIF', t('common.videoConvert')].join(','),
  }),
  'video-merge': (t, siteName) => ({
    title: `${t('common.videoMerge')} - ${siteName}`,
    description: t('common.videoMergeDesc'),
    keywords: [t('common.videoMerge'), t('common.videoConvert'), t('common.audioConvert')].join(','),
  }),
  'video-watermark': (t, siteName) => ({
    title: `${t('common.videoWatermark')} - ${siteName}`,
    description: t('common.videoWatermarkDesc'),
    keywords: [t('common.videoWatermark'), t('common.videoConvert'), 'watermark'].join(','),
  }),
}

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attributes).forEach(([key, value]) => el!.setAttribute(key, value))
}

const upsertLink = (selector: string, attributes: Record<string, string>) => {
  let el = document.head.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    document.head.appendChild(el)
  }
  Object.entries(attributes).forEach(([key, value]) => el!.setAttribute(key, value))
}

const removeExtraAlternateLinks = (keep: Set<string>) => {
  document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach((el) => {
    const hreflang = el.getAttribute('hreflang') || ''
    if (!keep.has(hreflang)) el.remove()
  })
}

const upsertJsonLd = (id: string, payload: Record<string, unknown>) => {
  let el = document.head.querySelector<HTMLScriptElement>(`script#${id}`)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(payload)
}

const getLocaleValue = (i18n: I18nLike) =>
  typeof i18n.global.locale === 'string' ? i18n.global.locale : i18n.global.locale.value

const getBaseUrl = () =>
  (window.location.origin && /localhost|127\.0\.0\.1/i.test(window.location.origin) ? DEFAULT_SITE_URL : window.location.origin).replace(/\/$/, '')

const buildLocalizedUrl = (path: string, locale: string) => {
  const url = new URL(`${getBaseUrl()}${path}`)
  if (locale !== DEFAULT_LOCALE) {
    url.searchParams.set('lang', locale)
  }
  return url.toString()
}

const updateSeo = (seoKey: SeoKey, i18n: I18nLike) => {
  const locale = getLocaleValue(i18n)
  const t = i18n.global.t
  const siteName = t('common.appName')
  const seo = routeMetaBuilders[seoKey](t, siteName)
  const canonicalUrl = buildLocalizedUrl(routePaths[seoKey], locale)
  const imageUrl = `${getBaseUrl()}/app-icon.ico`
  const ogLocale = ogLocaleMap[locale] || locale.replace('-', '_')

  document.documentElement.lang = locale || 'zh-CN'
  document.title = seo.title

  upsertMeta('meta[name="description"]', { name: 'description', content: seo.description })
  upsertMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords })
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: ogLocale })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl })
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: siteName })
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description })
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl })
  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl })

  const hreflangSet = new Set<string>()
  SUPPORTED_LOCALES.forEach((supportedLocale) => {
    hreflangSet.add(supportedLocale)
    upsertLink(`link[rel="alternate"][hreflang="${supportedLocale}"]`, {
      rel: 'alternate',
      hreflang: supportedLocale,
      href: buildLocalizedUrl(routePaths[seoKey], supportedLocale),
    })
  })
  hreflangSet.add('x-default')
  upsertLink('link[rel="alternate"][hreflang="x-default"]', {
    rel: 'alternate',
    hreflang: 'x-default',
    href: buildLocalizedUrl(routePaths[seoKey], DEFAULT_LOCALE),
  })
  removeExtraAlternateLinks(hreflangSet)

  upsertJsonLd('app-seo-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    inLanguage: locale,
    name: siteName,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description: seo.description,
    url: canonicalUrl,
    image: imageUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
  })

  upsertJsonLd('breadcrumb-seo-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: siteName,
        item: `${getBaseUrl()}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: seo.title,
        item: canonicalUrl,
      },
    ],
  })
}

export const setupRouterSeo = (router: Router, i18n: I18nLike) => {
  let currentSeoKey: SeoKey = 'home'

  const refreshSeo = () => updateSeo(currentSeoKey, i18n)

  router.afterEach((to) => {
    currentSeoKey = (to.meta?.seoKey as SeoKey | undefined) || (to.name === 'Home' ? 'home' : 'video-convert')
    refreshSeo()
  })

  if (typeof i18n.global.locale !== 'string' && 'value' in i18n.global.locale) {
    watch(() => i18n.global.locale.value, refreshSeo)
  }
}
