import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElButton,
  ElCheckbox,
  ElColorPicker,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElOption,
  ElProgress,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSlider,
} from 'element-plus'
import { provideGlobalConfig } from 'element-plus/es/components/config-provider/index.mjs'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './styles/index.scss'
import { useAuthStore } from './stores/authStore'
import { setupRouterSeo } from './utils/seo'

const app = createApp(App)
const pinia = createPinia()
const elementComponents = [
  ElButton,
  ElCheckbox,
  ElColorPicker,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElOption,
  ElProgress,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSlider,
]

app.use(pinia)
app.use(router)
app.use(i18n)
elementComponents.forEach((component) => app.use(component))
provideGlobalConfig({ locale: zhCn }, app, true)
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
