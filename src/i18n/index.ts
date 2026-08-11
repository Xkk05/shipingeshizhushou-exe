import { createI18n } from 'vue-i18n'

import ar from '../locales/ar.json'
import bn from '../locales/bn.json'
import de from '../locales/de.json'
import enUS from '../locales/en-US.json'
import es from '../locales/es.json'
import fa from '../locales/fa.json'
import fr from '../locales/fr.json'
import he from '../locales/he.json'
import hi from '../locales/hi.json'
import id from '../locales/id.json'
import it from '../locales/it.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'
import ms from '../locales/ms.json'
import nl from '../locales/nl.json'
import pl from '../locales/pl.json'
import pt from '../locales/pt.json'
import ptBR from '../locales/pt_BR.json'
import ru from '../locales/ru.json'
import sw from '../locales/sw.json'
import ta from '../locales/ta.json'
import th from '../locales/th.json'
import tl from '../locales/tl.json'
import tr from '../locales/tr.json'
import uk from '../locales/uk.json'
import ur from '../locales/ur.json'
import vi from '../locales/vi.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh_TW.json'

type WebSection = {
  header: Record<string, string>
  footer: Record<string, string>
  home: {
    kicker: string
    title: string
    subtitle: string
    openTool: string
    cards: Record<string, string>
    badges: Record<string, string>
  }
  workspace: {
    short: Record<string, string>
    tip: Record<string, string>
  }
}

export const SUPPORTED_LOCALES = [
  'ar', 'bn', 'de', 'en-US', 'es', 'fa', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'nl', 'pl', 'pt', 'pt-BR', 'ru', 'sw', 'ta', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'zh-CN', 'zh-TW',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const resolveInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'zh-CN'

  const queryLocale = new URLSearchParams(window.location.search).get('lang')
  if (queryLocale && SUPPORTED_LOCALES.includes(queryLocale as SupportedLocale)) {
    localStorage.setItem('app_locale', queryLocale)
    return queryLocale as SupportedLocale
  }

  const savedLocale = localStorage.getItem('app_locale') || 'zh-CN'
  return SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale) ? (savedLocale as SupportedLocale) : 'zh-CN'
}

const savedLocale = resolveInitialLocale()

const baseWeb: WebSection = {
  header: {
    home: 'Home',
    aiTools: 'AI Tools',
    officeTools: 'Office',
    multimedia: 'Multimedia',
    devTools: 'Development',
    textTools: 'Text',
    fileTools: 'Files',
    systemTools: 'System',
    lifeTools: 'Lifestyle',
    aiNews: 'AI News',
    customSoftware: 'Custom Software',
    searchPlaceholder: 'Search tools and apps',
  },
  footer: {
    description: 'High-quality AI tools and services to help you work faster every day.',
    quickLinks: 'Quick Links',
    home: 'Home',
    aiTools: 'AI Tools',
    consulting: 'Consulting',
    news: 'News',
    feedback: 'Feedback',
    categories: 'Categories',
    textTools: 'Text Tools',
    imageTools: 'Image Tools',
    officeTools: 'Office Tools',
    fileTools: 'File Tools',
    devTools: 'Development',
    contactUs: 'Contact Us',
    copyright: '© 2026 Kunqiong AI Toolbox. All rights reserved.',
    userAgreement: 'User Agreement',
    privacyPolicy: 'Privacy Policy',
  },
  home: {
    kicker: 'Video Tool Categories',
    title: 'Video Format Conversion',
    subtitle: 'Upload a video, choose the output format, and download the result.',
    openTool: 'Open tool',
    cards: {
      videoConvert: 'Convert between common video formats for editing, publishing, and playback.',
      videoCompress: 'Reduce file size while balancing output quality and speed.',
      audioConvert: 'Convert audio files to common formats such as MP3, WAV, and AAC.',
      videoExtractAudio: 'Extract audio tracks from video files for reuse and editing.',
      videoToGif: 'Turn short video clips into GIF animations for sharing.',
    },
    badges: {
      common: 'Popular',
      frequent: 'Efficient',
      audio: 'Audio',
      extract: 'Extract',
      creative: 'Creative',
    },
  },
  workspace: {
    short: {
      videoConvert: 'Format convert',
      videoCompress: 'Compress size',
      audioConvert: 'Audio convert',
      videoExtractAudio: 'Extract audio',
      videoToGif: 'Create GIF',
    },
    tip: {
      videoConvert: 'Upload a video, choose the output format, and download the result.',
      videoCompress: 'Reduce file size with adjustable compression settings.',
      audioConvert: 'Export MP3, WAV, AAC, and other common audio formats.',
      videoExtractAudio: 'Generate a clean audio file from the uploaded video.',
      videoToGif: 'Trim a short clip and export it as a GIF.',
    },
  },
}

const mergeWeb = (value: Partial<WebSection>): WebSection => ({
  ...baseWeb,
  ...value,
  header: { ...baseWeb.header, ...(value.header || {}) },
  footer: { ...baseWeb.footer, ...(value.footer || {}) },
  home: { ...baseWeb.home, ...(value.home || {}) },
  workspace: {
    ...baseWeb.workspace,
    ...(value.workspace || {}),
    short: { ...baseWeb.workspace.short, ...(value.workspace?.short || {}) },
    tip: { ...baseWeb.workspace.tip, ...(value.workspace?.tip || {}) },
  },
})

const webByLocale: Record<string, WebSection> = {
  'en-US': baseWeb,
  'zh-CN': mergeWeb({
    header: { home: '首页', aiTools: 'AI工具', officeTools: '办公工具', multimedia: '多媒体', devTools: '开发工具', textTools: '文本处理', fileTools: '文件处理', systemTools: '系统工具', lifeTools: '生活工具', aiNews: 'AI资讯', customSoftware: '定制软件', searchPlaceholder: '搜索工具、应用等' },
    footer: { description: '高质量 AI 工具与服务，帮助你更高效地完成每天的工作。', quickLinks: '快速链接', home: '首页', aiTools: 'AI工具', consulting: '咨询服务', news: '资讯', feedback: '反馈', categories: '工具分类', textTools: '文本工具', imageTools: '图像工具', officeTools: '办公工具', fileTools: '文件工具', devTools: '开发工具', contactUs: '联系我们', copyright: '© 2026 鲲穹AI工具箱. 保留所有权利.', userAgreement: '用户协议', privacyPolicy: '隐私政策' },
    home: {
      kicker: '视频工具分类',
      title: '视频格式转换',
      subtitle: '上传视频，选择输出格式，然后下载结果。',
      openTool: '打开工具',
      cards: {
        videoConvert: '支持常见视频格式互转，适合编辑、发布和播放场景。',
        videoCompress: '压缩视频体积，同时兼顾清晰度与处理效率。',
        audioConvert: '将音频文件转换为 MP3、WAV、AAC 等常见格式。',
        videoExtractAudio: '从视频中快速提取音频轨道，方便复用和剪辑。',
        videoToGif: '把短视频片段转换成适合传播的 GIF 动图。',
      },
      badges: {
        common: '常用',
        frequent: '高频',
        audio: '音频',
        extract: '提取',
        creative: '创意',
      },
    },
    workspace: { short: { videoConvert: '格式转换', videoCompress: '压缩体积', audioConvert: '音频转换', videoExtractAudio: '提取音频', videoToGif: '生成 GIF' } },
  }),
  'zh-TW': mergeWeb({
    header: { home: '首頁', aiTools: 'AI工具', officeTools: '辦公工具', multimedia: '多媒體', devTools: '開發工具', textTools: '文字處理', fileTools: '檔案處理', systemTools: '系統工具', lifeTools: '生活工具', aiNews: 'AI資訊', customSoftware: '客製軟體', searchPlaceholder: '搜尋工具、應用等' },
    footer: { description: '高品質 AI 工具與服務，幫助你更有效率地完成每天的工作。', quickLinks: '快速連結', home: '首頁', aiTools: 'AI工具', consulting: '諮詢服務', news: '資訊', feedback: '回饋', categories: '工具分類', textTools: '文字工具', imageTools: '圖像工具', officeTools: '辦公工具', fileTools: '檔案工具', devTools: '開發工具', contactUs: '聯絡我們', copyright: '© 2026 鯤穹AI工具箱. 保留所有權利.', userAgreement: '使用者協議', privacyPolicy: '隱私政策' },
    home: { kicker: '影片工具分類', title: '影片格式轉換', subtitle: '上傳影片、選擇輸出格式，然後下載結果。' },
  }),
  ja: mergeWeb({
    header: { home: 'ホーム', aiTools: 'AIツール', officeTools: 'オフィス', multimedia: 'マルチメディア', devTools: '開発', textTools: 'テキスト', fileTools: 'ファイル', systemTools: 'システム', lifeTools: 'ライフスタイル', aiNews: 'AIニュース', customSoftware: '受託開発', searchPlaceholder: 'ツールやアプリを検索' },
    footer: { quickLinks: 'クイックリンク', home: 'ホーム', aiTools: 'AIツール', consulting: 'コンサルティング', news: 'ニュース', feedback: 'フィードバック', categories: 'カテゴリー', textTools: 'テキストツール', imageTools: '画像ツール', officeTools: 'オフィスツール', fileTools: 'ファイルツール', devTools: '開発', contactUs: 'お問い合わせ', userAgreement: '利用規約', privacyPolicy: 'プライバシーポリシー' },
  }),
  ko: mergeWeb({
    header: { home: '홈', aiTools: 'AI 도구', officeTools: '오피스', multimedia: '멀티미디어', devTools: '개발', textTools: '텍스트', fileTools: '파일', systemTools: '시스템', lifeTools: '라이프스타일', aiNews: 'AI 뉴스', customSoftware: '맞춤 소프트웨어', searchPlaceholder: '도구와 앱 검색' },
    footer: { quickLinks: '빠른 링크', home: '홈', aiTools: 'AI 도구', consulting: '컨설팅', news: '뉴스', feedback: '피드백', categories: '카테고리', textTools: '텍스트 도구', imageTools: '이미지 도구', officeTools: '오피스 도구', fileTools: '파일 도구', devTools: '개발', contactUs: '문의하기', userAgreement: '이용약관', privacyPolicy: '개인정보 처리방침' },
    home: { kicker: '비디오 도구 카테고리', title: '동영상 포맷 변환', subtitle: '비디오를 업로드하고 출력 형식을 선택한 다음 결과를 다운로드하세요.' },
  }),
  fr: mergeWeb({
    header: { home: 'Accueil', aiTools: 'Outils IA', officeTools: 'Bureautique', multimedia: 'Multimédia', devTools: 'Développement', textTools: 'Texte', fileTools: 'Fichiers', systemTools: 'Système', lifeTools: 'Style de vie', aiNews: 'Actus IA', customSoftware: 'Logiciel sur mesure', searchPlaceholder: 'Rechercher des outils et applications' },
  }),
  de: mergeWeb({
    header: { home: 'Startseite', aiTools: 'AI-Tools', officeTools: 'Büro', multimedia: 'Multimedia', devTools: 'Entwicklung', textTools: 'Text', fileTools: 'Dateien', systemTools: 'System', lifeTools: 'Lebensstil', aiNews: 'AI-News', customSoftware: 'Individuelle Software', searchPlaceholder: 'Tools und Apps suchen' },
  }),
  es: mergeWeb({
    header: { home: 'Inicio', aiTools: 'Herramientas de IA', officeTools: 'Oficina', multimedia: 'Multimedia', devTools: 'Desarrollo', textTools: 'Texto', fileTools: 'Archivos', systemTools: 'Sistema', lifeTools: 'Estilo de vida', aiNews: 'Noticias IA', customSoftware: 'Software a medida', searchPlaceholder: 'Buscar herramientas y apps' },
  }),
  it: mergeWeb({
    header: { home: 'Home', aiTools: 'Strumenti AI', officeTools: 'Ufficio', multimedia: 'Multimedia', devTools: 'Sviluppo', textTools: 'Testo', fileTools: 'File', systemTools: 'Sistema', lifeTools: 'Stile di vita', aiNews: 'Notizie IA', customSoftware: 'Software su misura', searchPlaceholder: 'Cerca strumenti e app' },
  }),
  pt: mergeWeb({
    header: { home: 'Início', aiTools: 'Ferramentas de IA', officeTools: 'Escritório', multimedia: 'Multimédia', devTools: 'Desenvolvimento', textTools: 'Texto', fileTools: 'Ficheiros', systemTools: 'Sistema', lifeTools: 'Estilo de vida', aiNews: 'Notícias IA', customSoftware: 'Software personalizado', searchPlaceholder: 'Pesquisar ferramentas e apps' },
  }),
  'pt-BR': mergeWeb({
    header: { home: 'Início', aiTools: 'Ferramentas de IA', officeTools: 'Escritório', multimedia: 'Multimídia', devTools: 'Desenvolvimento', textTools: 'Texto', fileTools: 'Arquivos', systemTools: 'Sistema', lifeTools: 'Estilo de vida', aiNews: 'Notícias de IA', customSoftware: 'Software sob medida', searchPlaceholder: 'Buscar ferramentas e apps' },
  }),
  ru: mergeWeb({
    header: { home: 'Главная', aiTools: 'Инструменты ИИ', officeTools: 'Офис', multimedia: 'Мультимедиа', devTools: 'Разработка', textTools: 'Текст', fileTools: 'Файлы', systemTools: 'Система', lifeTools: 'Стиль жизни', aiNews: 'Новости ИИ', customSoftware: 'ПО на заказ', searchPlaceholder: 'Поиск инструментов и приложений' },
  }),
  ar: mergeWeb({
    header: { home: 'الرئيسية', aiTools: 'أدوات الذكاء الاصطناعي', officeTools: 'أدوات المكتب', multimedia: 'الوسائط المتعددة', devTools: 'أدوات التطوير', textTools: 'أدوات النص', fileTools: 'أدوات الملفات', systemTools: 'أدوات النظام', lifeTools: 'أدوات الحياة', aiNews: 'أخبار AI', customSoftware: 'برمجيات مخصصة', searchPlaceholder: 'ابحث عن الأدوات والتطبيقات' },
  }),
  vi: mergeWeb({
    header: { home: 'Trang chủ', aiTools: 'Công cụ AI', officeTools: 'Công cụ văn phòng', multimedia: 'Đa phương tiện', devTools: 'Công cụ phát triển', textTools: 'Công cụ văn bản', fileTools: 'Công cụ tệp', systemTools: 'Công cụ hệ thống', lifeTools: 'Công cụ đời sống', aiNews: 'Tin AI', customSoftware: 'Phần mềm tùy chỉnh', searchPlaceholder: 'Tìm công cụ và ứng dụng' },
  }),
  th: mergeWeb({
    header: { home: 'หน้าแรก', aiTools: 'เครื่องมือ AI', officeTools: 'เครื่องมือสำนักงาน', multimedia: 'มัลติมีเดีย', devTools: 'เครื่องมือพัฒนา', textTools: 'เครื่องมือข้อความ', fileTools: 'เครื่องมือไฟล์', systemTools: 'เครื่องมือระบบ', lifeTools: 'เครื่องมือไลฟ์สไตล์', aiNews: 'ข่าว AI', customSoftware: 'ซอฟต์แวร์สั่งทำ', searchPlaceholder: 'ค้นหาเครื่องมือและแอป' },
    footer: { quickLinks: 'ลิงก์ด่วน', home: 'หน้าแรก', aiTools: 'เครื่องมือ AI', consulting: 'ที่ปรึกษา', news: 'ข่าวสาร', feedback: 'ข้อเสนอแนะ', categories: 'หมวดหมู่', textTools: 'เครื่องมือข้อความ', imageTools: 'เครื่องมือภาพ', officeTools: 'เครื่องมือสำนักงาน', fileTools: 'เครื่องมือไฟล์', devTools: 'การพัฒนา', contactUs: 'ติดต่อเรา', userAgreement: 'ข้อตกลงผู้ใช้', privacyPolicy: 'นโยบายความเป็นส่วนตัว' },
    home: { kicker: 'หมวดหมู่เครื่องมือวิดีโอ', title: 'แปลงรูปแบบวิดีโอ', subtitle: 'อัปโหลดวิดีโอ เลือกรูปแบบผลลัพธ์ แล้วดาวน์โหลดไฟล์' },
  }),
  id: mergeWeb({
    header: { home: 'Beranda', aiTools: 'Alat AI', officeTools: 'Perkantoran', multimedia: 'Multimedia', devTools: 'Pengembangan', textTools: 'Teks', fileTools: 'Berkas', systemTools: 'Sistem', lifeTools: 'Gaya Hidup', aiNews: 'Berita AI', customSoftware: 'Perangkat Lunak Kustom', searchPlaceholder: 'Cari alat dan aplikasi' },
    footer: { quickLinks: 'Tautan Cepat', home: 'Beranda', aiTools: 'Alat AI', consulting: 'Konsultasi', news: 'Berita', feedback: 'Masukan', categories: 'Kategori', textTools: 'Alat Teks', imageTools: 'Alat Gambar', officeTools: 'Alat Kantor', fileTools: 'Alat Berkas', devTools: 'Pengembangan', contactUs: 'Hubungi Kami', userAgreement: 'Perjanjian Pengguna', privacyPolicy: 'Kebijakan Privasi' },
  }),
  pl: mergeWeb({
    header: { home: 'Strona główna', aiTools: 'Narzędzia AI', officeTools: 'Biuro', multimedia: 'Multimedia', devTools: 'Programowanie', textTools: 'Tekst', fileTools: 'Pliki', systemTools: 'System', lifeTools: 'Styl życia', aiNews: 'Wiadomości AI', customSoftware: 'Oprogramowanie na zamówienie', searchPlaceholder: 'Szukaj narzędzi i aplikacji' },
  }),
  nl: mergeWeb({
    header: { home: 'Start', aiTools: 'AI-tools', officeTools: 'Kantoor', multimedia: 'Multimedia', devTools: 'Ontwikkeling', textTools: 'Tekst', fileTools: 'Bestanden', systemTools: 'Systeem', lifeTools: 'Levensstijl', aiNews: 'AI-nieuws', customSoftware: 'Maatwerksoftware', searchPlaceholder: 'Zoek tools en apps' },
    footer: { quickLinks: 'Snelle links', home: 'Start', aiTools: 'AI-tools' },
  }),
  tr: mergeWeb({
    header: { home: 'Ana sayfa', aiTools: 'AI araçları', officeTools: 'Ofis', multimedia: 'Multimedya', devTools: 'Geliştirme', textTools: 'Metin', fileTools: 'Dosyalar', systemTools: 'Sistem', lifeTools: 'Yaşam', aiNews: 'Yapay zeka haberleri', customSoftware: 'Özel yazılım', searchPlaceholder: 'Araç ve uygulama ara' },
  }),
  uk: mergeWeb({
    header: { home: 'Головна', aiTools: 'Інструменти AI', officeTools: 'Офіс', multimedia: 'Мультимедіа', devTools: 'Розробка', textTools: 'Текст', fileTools: 'Файли', systemTools: 'Система', lifeTools: 'Стиль життя', aiNews: 'AI новини', customSoftware: 'Індивідуальне ПЗ', searchPlaceholder: 'Пошук інструментів і застосунків' },
  }),
  he: mergeWeb({
    header: { home: 'בית', aiTools: 'כלי AI', officeTools: 'כלי משרד', multimedia: 'מולטימדיה', devTools: 'כלי פיתוח', textTools: 'כלי טקסט', fileTools: 'כלי קבצים', systemTools: 'כלי מערכת', lifeTools: 'כלי לייף סטייל', aiNews: 'חדשות AI', customSoftware: 'תוכנה מותאמת', searchPlaceholder: 'חפש כלים ואפליקציות' },
  }),
  fa: mergeWeb({
    header: { home: 'خانه', aiTools: 'ابزارهای هوش مصنوعی', officeTools: 'ابزارهای اداری', multimedia: 'چندرسانه‌ای', devTools: 'ابزارهای توسعه', textTools: 'ابزارهای متن', fileTools: 'ابزارهای فایل', systemTools: 'ابزارهای سیستم', lifeTools: 'ابزارهای سبک زندگی', aiNews: 'اخبار AI', customSoftware: 'نرم‌افزار سفارشی', searchPlaceholder: 'جست‌وجوی ابزارها و برنامه‌ها' },
  }),
  hi: mergeWeb({
    header: { home: 'होम', aiTools: 'AI टूल्स', officeTools: 'ऑफिस टूल्स', multimedia: 'मल्टीमीडिया', devTools: 'डेवलपमेंट टूल्स', textTools: 'टेक्स्ट टूल्स', fileTools: 'फाइल टूल्स', systemTools: 'सिस्टम टूल्स', lifeTools: 'लाइफस्टाइल टूल्स', aiNews: 'AI समाचार', customSoftware: 'कस्टम सॉफ्टवेयर', searchPlaceholder: 'टूल और ऐप खोजें' },
    footer: { quickLinks: 'त्वरित लिंक', home: 'होम', aiTools: 'AI टूल्स', consulting: 'परामर्श', news: 'समाचार', feedback: 'प्रतिक्रिया', categories: 'श्रेणियाँ', textTools: 'टेक्स्ट टूल्स', imageTools: 'इमेज टूल्स', officeTools: 'ऑफिस टूल्स', fileTools: 'फाइल टूल्स', devTools: 'डेवलपमेंट', contactUs: 'हमसे संपर्क करें', userAgreement: 'उपयोगकर्ता समझौता', privacyPolicy: 'गोपनीयता नीति' },
  }),
  bn: mergeWeb({
    header: { home: 'হোম', aiTools: 'AI টুলস', officeTools: 'অফিস টুলস', multimedia: 'মাল্টিমিডিয়া', devTools: 'ডেভেলপমেন্ট টুলস', textTools: 'টেক্সট টুলস', fileTools: 'ফাইল টুলস', systemTools: 'সিস্টেম টুলস', lifeTools: 'লাইফস্টাইল টুলস', aiNews: 'AI সংবাদ', customSoftware: 'কাস্টম সফটওয়্যার', searchPlaceholder: 'টুল ও অ্যাপ খুঁজুন' },
    footer: { quickLinks: 'দ্রুত লিঙ্ক', home: 'হোম', aiTools: 'AI টুলস', consulting: 'পরামর্শ', news: 'সংবাদ', feedback: 'মতামত', categories: 'বিভাগসমূহ', textTools: 'টেক্সট টুলস', imageTools: 'ইমেজ টুলস', officeTools: 'অফিস টুলস', fileTools: 'ফাইল টুলস', devTools: 'ডেভেলপমেন্ট', contactUs: 'যোগাযোগ করুন', userAgreement: 'ব্যবহারকারী চুক্তি', privacyPolicy: 'গোপনীয়তা নীতি' },
  }),
  ms: mergeWeb({
    header: { home: 'Laman Utama', aiTools: 'Alat AI', officeTools: 'Pejabat', multimedia: 'Multimedia', devTools: 'Pembangunan', textTools: 'Teks', fileTools: 'Fail', systemTools: 'Sistem', lifeTools: 'Gaya Hidup', aiNews: 'Berita AI', customSoftware: 'Perisian Tersuai', searchPlaceholder: 'Cari alat dan aplikasi' },
    footer: { quickLinks: 'Pautan Pantas', home: 'Laman Utama', aiTools: 'Alat AI', consulting: 'Perundingan', news: 'Berita', feedback: 'Maklum Balas', categories: 'Kategori', textTools: 'Alat Teks', imageTools: 'Alat Imej', officeTools: 'Alat Pejabat', fileTools: 'Alat Fail', devTools: 'Pembangunan', contactUs: 'Hubungi Kami', userAgreement: 'Perjanjian Pengguna', privacyPolicy: 'Dasar Privasi' },
  }),
  sw: mergeWeb({
    header: { home: 'Nyumbani', aiTools: 'Zana za AI', officeTools: 'Ofisi', multimedia: 'Midia nyingi', devTools: 'Maendeleo', textTools: 'Maandishi', fileTools: 'Faili', systemTools: 'Mfumo', lifeTools: 'Mtindo wa maisha', aiNews: 'Habari za AI', customSoftware: 'Programu maalum', searchPlaceholder: 'Tafuta zana na programu' },
  }),
  ta: mergeWeb({
    header: { home: 'முகப்பு', aiTools: 'AI கருவிகள்', officeTools: 'அலுவலக கருவிகள்', multimedia: 'பல்மாதிரி', devTools: 'மேம்பாட்டு கருவிகள்', textTools: 'உரை கருவிகள்', fileTools: 'கோப்பு கருவிகள்', systemTools: 'அமைப்பு கருவிகள்', lifeTools: 'வாழ்க்கை முறை கருவிகள்', aiNews: 'AI செய்திகள்', customSoftware: 'தனிப்பயன் மென்பொருள்', searchPlaceholder: 'கருவிகள் மற்றும் பயன்பாடுகளைத் தேடவும்' },
  }),
  tl: mergeWeb({
    header: { home: 'Tahanan', aiTools: 'Mga AI Tool', officeTools: 'Opisina', multimedia: 'Midyang Maramihan', devTools: 'Pagpapaunlad', textTools: 'Teksto', fileTools: 'Mga File', systemTools: 'Sistema', lifeTools: 'Pamumuhay', aiNews: 'Balitang AI', customSoftware: 'Pasadyang Software', searchPlaceholder: 'Maghanap ng mga tool at app' },
    footer: { quickLinks: 'Mabilis na mga Link', home: 'Tahanan', aiTools: 'Mga AI Tool', consulting: 'Konsultasyon', news: 'Balita', feedback: 'Puna', categories: 'Mga Kategorya', textTools: 'Mga Tool sa Teksto', imageTools: 'Mga Tool sa Larawan', officeTools: 'Mga Tool sa Opisina', fileTools: 'Mga Tool sa File', devTools: 'Pagpapaunlad', contactUs: 'Makipag-ugnayan', userAgreement: 'Kasunduan ng Gumagamit', privacyPolicy: 'Patakaran sa Privacy' },
  }),
  ur: mergeWeb({
    header: { home: 'ہوم', aiTools: 'AI ٹولز', officeTools: 'آفس ٹولز', multimedia: 'ملٹی میڈیا', devTools: 'ڈیولپمنٹ ٹولز', textTools: 'متن کے ٹولز', fileTools: 'فائل ٹولز', systemTools: 'سسٹم ٹولز', lifeTools: 'لائف اسٹائل ٹولز', aiNews: 'AI خبریں', customSoftware: 'کسٹم سافٹ ویئر', searchPlaceholder: 'ٹولز اور ایپس تلاش کریں' },
    footer: { quickLinks: 'فوری روابط', home: 'ہوم', aiTools: 'AI ٹولز', consulting: 'مشاورت', news: 'خبریں', feedback: 'فیڈبیک', categories: 'اقسام', textTools: 'متن کے ٹولز', imageTools: 'تصویری ٹولز', officeTools: 'آفس ٹولز', fileTools: 'فائل ٹولز', devTools: 'ڈیولپمنٹ', contactUs: 'ہم سے رابطہ کریں', userAgreement: 'صارف معاہدہ', privacyPolicy: 'رازداری کی پالیسی' },
  }),
}

const withWebMessages = <T extends Record<string, any>>(base: T, locale: string) => ({
  ...base,
  web: webByLocale[locale] || baseWeb,
})

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    ar: withWebMessages(ar, 'ar'),
    bn: withWebMessages(bn, 'bn'),
    de: withWebMessages(de, 'de'),
    'en-US': withWebMessages(enUS, 'en-US'),
    es: withWebMessages(es, 'es'),
    fa: withWebMessages(fa, 'fa'),
    fr: withWebMessages(fr, 'fr'),
    he: withWebMessages(he, 'he'),
    hi: withWebMessages(hi, 'hi'),
    id: withWebMessages(id, 'id'),
    it: withWebMessages(it, 'it'),
    ja: withWebMessages(ja, 'ja'),
    ko: withWebMessages(ko, 'ko'),
    ms: withWebMessages(ms, 'ms'),
    nl: withWebMessages(nl, 'nl'),
    pl: withWebMessages(pl, 'pl'),
    pt: withWebMessages(pt, 'pt'),
    'pt-BR': withWebMessages(ptBR, 'pt-BR'),
    ru: withWebMessages(ru, 'ru'),
    sw: withWebMessages(sw, 'sw'),
    ta: withWebMessages(ta, 'ta'),
    th: withWebMessages(th, 'th'),
    tl: withWebMessages(tl, 'tl'),
    tr: withWebMessages(tr, 'tr'),
    uk: withWebMessages(uk, 'uk'),
    ur: withWebMessages(ur, 'ur'),
    vi: withWebMessages(vi, 'vi'),
    'zh-CN': withWebMessages(zhCN, 'zh-CN'),
    'zh-TW': withWebMessages(zhTW, 'zh-TW'),
  },
})

export default i18n
