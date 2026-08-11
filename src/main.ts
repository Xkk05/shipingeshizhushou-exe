import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './styles/index.scss'
import { useAuthStore } from './stores/authStore'
import { useAuthCodeStore } from './stores/authCodeStore'
import { platformService } from './services/platformService'
import { setupRouterSeo } from './utils/seo'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ElementPlus, { locale: zhCn })
setupRouterSeo(router, i18n)
app.mount('#app')

const { t } = i18n.global as any

const authStore = useAuthStore()
authStore.initToken()
if (authStore.token) {
  authStore.verifyLogin().catch((error) => {
    console.error(`${t('error.verifyLoginFailed')}:`, error)
    authStore.clearLogin()
  })
}

if (platformService.isElectron) {
  const authCodeStore = useAuthCodeStore()
  authCodeStore.initAuthStatus().catch((error) => {
    console.error(`${t('error.initAuthStatusFailed')}:`, error)
  })
}
