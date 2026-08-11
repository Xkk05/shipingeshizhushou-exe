import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { platformService } from '@/services/platformService';
import { SUPPORTED_LOCALES } from '@/i18n';

const Home = () => import('@/views/Home.vue');
const Workspace = () => import('@/views/Workspace.vue');
const VideoConvert = () => import('@/views/modules/VideoConvert.vue');
const VideoMerge = () => import('@/views/modules/VideoMerge.vue');
const VideoCompress = () => import('@/views/modules/VideoCompress.vue');
const AudioConvert = () => import('@/views/modules/AudioConvert.vue');
const VideoExtractAudio = () => import('@/views/modules/VideoExtractAudio.vue');
const VideoToGif = () => import('@/views/modules/VideoToGif.vue');
const VideoWatermark = () => import('@/views/modules/VideoWatermark.vue');

const webSupportedRoutes = new Set([
  'Home',
  'Workspace',
  'VideoConvert',
  'VideoMerge',
  'VideoCompress',
  'AudioConvert',
  'VideoExtractAudio',
  'VideoToGif',
  'VideoWatermark',
]);

const router = createRouter({
  history: platformService.isElectron ? createWebHashHistory() : createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
    {
      path: '/workspace',
      name: 'Workspace',
      component: Workspace,
      children: [
        { path: 'video-convert', alias: '/video-convert', name: 'VideoConvert', component: VideoConvert, meta: { seoKey: 'video-convert' } },
        { path: 'video-merge', alias: '/video-merge', name: 'VideoMerge', component: VideoMerge, meta: { seoKey: 'video-merge' } },
        { path: 'video-compress', alias: '/video-compress', name: 'VideoCompress', component: VideoCompress, meta: { seoKey: 'video-compress' } },
        { path: 'audio-convert', alias: '/audio-convert', name: 'AudioConvert', component: AudioConvert, meta: { seoKey: 'audio-convert' } },
        { path: 'video-extract-audio', alias: '/video-extract-audio', name: 'VideoExtractAudio', component: VideoExtractAudio, meta: { seoKey: 'video-extract-audio' } },
        { path: 'video-to-gif', alias: '/video-to-gif', name: 'VideoToGif', component: VideoToGif, meta: { seoKey: 'video-to-gif' } },
        { path: 'video-watermark', alias: '/video-watermark', name: 'VideoWatermark', component: VideoWatermark, meta: { seoKey: 'video-watermark' } },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (platformService.isElectron) {
    return true;
  }

  const lang = typeof to.query.lang === 'string' ? to.query.lang : undefined
  if (lang && !SUPPORTED_LOCALES.includes(lang as (typeof SUPPORTED_LOCALES)[number])) {
    const nextQuery = { ...to.query }
    delete nextQuery.lang
    return { path: to.path, query: nextQuery, hash: to.hash, replace: true }
  }

  if (to.name === 'Workspace') {
    return { name: 'VideoConvert', query: to.query };
  }

  if (to.name && !webSupportedRoutes.has(String(to.name))) {
    return { name: 'VideoConvert', query: to.query };
  }

  return true;
});

export default router;
