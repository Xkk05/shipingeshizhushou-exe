<template>
  <el-dialog 
    v-model="visible" 
    :show-close="false"
    width="720px"
    :close-on-click-modal="false"
    class="settings-dialog"
  >
    <template #header>
      <span></span>
    </template>
    <div class="dialog-content">
      <!-- 左侧格式列表 -->
      <div class="format-panel">
        <div class="format-tabs">
          <span :class="{ active: formatTab === 'recent' }" @click="formatTab = 'recent'">{{ t('common.recent') }}</span>
          <span :class="{ active: formatTab === 'video' }" @click="formatTab = 'video'">{{ t('common.video') }}</span>
          <span :class="{ active: formatTab === 'audio' }" @click="formatTab = 'audio'">{{ t('common.audio') }}</span>
        </div>
        <div class="format-list">
          <div 
            v-for="fmt in displayFormats" 
            :key="fmt"
            :class="['format-item', { active: selectedFormat === fmt }]"
            @click="selectedFormat = fmt"
          >
            <div :class="['format-icon', getFormatColorClass(fmt)]">
              <span>{{ fmt }}</span>
            </div>
            <span class="format-name">{{ fmt }}</span>
          </div>
        </div>
        <div class="format-search">
          <el-input v-model="searchQuery" :placeholder="t('common.search')" size="small" clearable>
            <template #prefix>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#999">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 右侧设置面板 -->
      <div class="settings-panel">
        <div class="panel-header">
          <!-- 视频设置标签 -->
          <div v-if="formatTab !== 'audio'" class="settings-tabs">
            <span :class="{ active: settingsTab === 'simple' }" @click="settingsTab = 'simple'">{{ t('common.simpleSettings') }}</span>
            <span :class="{ active: settingsTab === 'advanced' }" @click="settingsTab = 'advanced'">{{ t('common.advancedSettings') }}</span>
          </div>
          <!-- 音频设置标题 -->
          <div v-else class="settings-title">{{ t('common.audio') }}</div>
          <span class="close-btn" @click="handleClose">×</span>
        </div>

        <!-- 视频简易设置 -->
        <div v-if="formatTab !== 'audio' && settingsTab === 'simple'" class="settings-content">
          <div class="section">
            <h4>{{ t('common.video') }}</h4>
            <div class="form-row">
              <label>{{ t('common.quality') }}</label>
              <el-select v-model="settings.clarity" size="small" style="width: 140px">
                <el-option :label="t('common.byQuality')" value="quality" />
                <el-option :label="t('common.byBitrate')" value="bitrate" />
              </el-select>
              <label>{{ t('common.videoQuality') }}</label>
              <el-select v-model="settings.quality" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option :label="t('common.hd')" value="hd" />
                <el-option :label="t('common.sd')" value="sd" />
                <el-option :label="t('common.smooth')" value="smooth" />
              </el-select>
            </div>
            <div class="form-row">
              <label>{{ t('common.resolution') }}</label>
              <el-select v-model="settings.resolution" size="small" style="width: 160px" @change="handleResolutionChange">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option :label="t('common.custom')" value="custom" />
                <el-option :label="t('common.custom') + '（16:9）'" value="custom_16_9" />
                <el-option :label="t('common.custom') + '（4:3）'" value="custom_4_3" />
                <el-option label="3840x2160" value="3840x2160" />
                <el-option label="2560x1440" value="2560x1440" />
                <el-option label="1920x1080" value="1920x1080" />
                <el-option label="1280x720" value="1280x720" />
                <el-option label="640x480" value="640x480" />
                <el-option label="320x240" value="320x240" />
              </el-select>
              <el-button v-if="showResolutionPresets" size="small" class="preset-btn" @click="showDeviceDialog = true">{{ t('common.selectDevice') }}</el-button>
              <el-button v-if="showResolutionPresets" size="small" class="preset-btn" @click="showPlatformDialog = true">{{ t('common.selectPlatform') }}</el-button>
            </div>
            <div class="form-row">
              <label>{{ t('common.width') }}</label>
              <el-input-number v-model="settings.width" size="small" :min="0" :controls="true" style="width: 100px" />
              <span class="separator">:</span>
              <el-input-number v-model="settings.height" size="small" :min="0" :controls="true" style="width: 100px" />
              <label>{{ t('common.height') }}</label>
            </div>
          </div>
        </div>

        <!-- 视频详细设置 -->
        <div v-else-if="formatTab !== 'audio' && settingsTab === 'advanced'" class="settings-content">
          <div class="section">
            <h4>{{ t('common.video') }}</h4>
            <div class="form-row">
              <label>{{ t('common.videoCodec') }}</label>
              <el-select v-model="settings.videoCodec" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="H264" value="h264" />
                <el-option label="H265" value="h265" />
                <el-option label="MPEG4" value="mpeg4" />
              </el-select>
              <label>{{ t('common.frameRate') }}</label>
              <el-select v-model="settings.frameRate" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="120fps" value="120" />
                <el-option label="60fps" value="60" />
                <el-option label="59.94fps" value="59.94" />
                <el-option label="30fps" value="30" />
                <el-option label="29.97fps" value="29.97" />
                <el-option label="25fps" value="25" />
                <el-option label="24fps" value="24" />
                <el-option label="23.976fps" value="23.976" />
              </el-select>
            </div>
            <div class="form-row">
              <label>{{ t('common.bitrate') }}</label>
              <el-select v-model="settings.videoBitrate" size="small" style="width: 140px">
                <el-option label="30000kbps" value="30000" />
                <el-option label="20000kbps" value="20000" />
                <el-option label="16000kbps" value="16000" />
                <el-option label="10000kbps" value="10000" />
                <el-option label="5000kbps" value="5000" />
                <el-option label="2400kbps" value="2400" />
                <el-option label="1600kbps" value="1600" />
                <el-option label="1200kbps" value="1200" />
                <el-option label="1024kbps" value="1024" />
                <el-option label="768kbps" value="768" />
                <el-option label="512kbps" value="512" />
                <el-option label="384kbps" value="384" />
                <el-option label="256kbps" value="256" />
              </el-select>
            </div>
            <div class="form-row">
              <label>{{ t('common.resolution') }}</label>
              <el-select v-model="settings.resolution" size="small" style="width: 160px" @change="handleResolutionChange">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option :label="t('common.custom')" value="custom" />
                <el-option :label="t('common.custom') + '（16:9）'" value="custom_16_9" />
                <el-option :label="t('common.custom') + '（4:3）'" value="custom_4_3" />
                <el-option label="3840x2160" value="3840x2160" />
                <el-option label="2560x1440" value="2560x1440" />
                <el-option label="1920x1080" value="1920x1080" />
                <el-option label="1280x720" value="1280x720" />
                <el-option label="640x480" value="640x480" />
                <el-option label="320x240" value="320x240" />
              </el-select>
              <el-button v-if="showResolutionPresets" size="small" class="preset-btn" @click="showDeviceDialog = true">{{ t('common.selectDevice') }}</el-button>
              <el-button v-if="showResolutionPresets" size="small" class="preset-btn" @click="showPlatformDialog = true">{{ t('common.selectPlatform') }}</el-button>
            </div>
            <div class="form-row">
              <label>{{ t('common.width') }}</label>
              <el-input-number v-model="settings.width" size="small" :min="0" style="width: 100px" />
              <span class="separator">:</span>
              <el-input-number v-model="settings.height" size="small" :min="0" style="width: 100px" />
              <label>{{ t('common.height') }}</label>
            </div>
          </div>

          <div class="section">
            <h4>{{ t('common.audio') }}</h4>
            <div class="form-row">
              <label>{{ t('common.audioCodec') }}</label>
              <el-select v-model="settings.audioCodec" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="AAC" value="aac" />
                <el-option label="AC3" value="ac3" />
              </el-select>
              <label>{{ t('common.audioChannels') }}</label>
              <el-select v-model="settings.channels" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option :label="t('common.mono')" value="mono" />
                <el-option :label="t('common.stereo')" value="stereo" />
              </el-select>
            </div>
            <div class="form-row">
              <label>{{ t('common.sampleRate') }}</label>
              <el-select v-model="settings.sampleRate" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="48000Hz" value="48000" />
                <el-option label="44100Hz" value="44100" />
                <el-option label="24000Hz" value="24000" />
                <el-option label="22050Hz" value="22050" />
              </el-select>
              <label>{{ t('common.bitrate') }}</label>
              <el-select v-model="settings.audioBitrate" size="small" style="width: 140px">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="320kbps" value="320" />
                <el-option label="256kbps" value="256" />
                <el-option label="192kbps" value="192" />
                <el-option label="160kbps" value="160" />
                <el-option label="128kbps" value="128" />
                <el-option label="96kbps" value="96" />
                <el-option label="80kbps" value="80" />
                <el-option label="64kbps" value="64" />
                <el-option label="48kbps" value="48" />
                <el-option label="40kbps" value="40" />
                <el-option label="32kbps" value="32" />
                <el-option label="24kbps" value="24" />
              </el-select>
            </div>
          </div>
        </div>

        <!-- 音频设置面板 -->
        <div v-else class="settings-content audio-settings">
          <div class="section">
            <div class="audio-form-row">
              <label>{{ t('common.audioCodec') }}</label>
              <el-select v-model="settings.audioCodec" size="small" class="audio-select" disabled>
                <el-option :label="t('common.auto')" value="auto" />
              </el-select>
              <label>{{ t('common.audioChannels') }}</label>
              <el-select v-model="settings.channels" size="small" class="audio-select">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option :label="t('common.mono')" value="mono" />
                <el-option :label="t('common.stereo')" value="stereo" />
              </el-select>
            </div>
            <div class="audio-form-row">
              <label>{{ t('common.sampleRate') }}</label>
              <el-select v-model="settings.sampleRate" size="small" class="audio-select">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="48000Hz" value="48000" />
                <el-option label="44100Hz" value="44100" />
                <el-option label="24000Hz" value="24000" />
                <el-option label="22050Hz" value="22050" />
              </el-select>
              <label>{{ t('common.bitrate') }}</label>
              <el-select v-model="settings.audioBitrate" size="small" class="audio-select">
                <el-option :label="t('common.auto')" value="auto" />
                <el-option label="320kbps" value="320" />
                <el-option label="256kbps" value="256" />
                <el-option label="192kbps" value="192" />
                <el-option label="160kbps" value="160" />
                <el-option label="128kbps" value="128" />
                <el-option label="96kbps" value="96" />
                <el-option label="80kbps" value="80" />
                <el-option label="64kbps" value="64" />
                <el-option label="48kbps" value="48" />
                <el-option label="40kbps" value="40" />
                <el-option label="32kbps" value="32" />
                <el-option label="24kbps" value="24" />
              </el-select>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="confirm">{{ t('common.confirm') }}</el-button>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- 设备选择弹窗 -->
  <el-dialog 
    v-model="showDeviceDialog" 
    :title="t('common.selectDevice')"
    width="600px"
    :close-on-click-modal="false"
    class="device-dialog"
    append-to-body
  >
    <div class="selector-content">
      <div class="brand-list">
        <div 
          v-for="brand in deviceBrands" 
          :key="brand.id"
          :class="['brand-item', { active: selectedBrand === brand.id }]"
          @click="selectedBrand = brand.id"
        >
          <span class="brand-icon">{{ brand.icon }}</span>
          <span class="brand-name">{{ brand.name }}</span>
        </div>
      </div>
      <div class="model-grid">
        <div 
          v-for="model in currentDeviceModels" 
          :key="model.name"
          :class="['model-item', { active: selectedDevice === model.name }]"
          @click="selectDeviceModel(model)"
        >
          <div class="device-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="#666">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
          </div>
          <div class="model-name">{{ model.name }}</div>
          <div class="model-resolution">{{ model.width }}x{{ model.height }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="showDeviceDialog = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmDevice">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <!-- 自媒体平台选择弹窗 -->
  <el-dialog 
    v-model="showPlatformDialog" 
    :title="t('common.selectPlatform')"
    width="600px"
    :close-on-click-modal="false"
    class="platform-dialog"
    append-to-body
  >
    <div class="selector-content">
      <div class="brand-list">
        <div 
          v-for="platform in platforms" 
          :key="platform.id"
          :class="['brand-item', { active: selectedPlatformId === platform.id }]"
          @click="selectedPlatformId = platform.id"
        >
          <span class="brand-icon">{{ platform.icon }}</span>
          <span class="brand-name">{{ platform.name }}</span>
        </div>
      </div>
      <div class="orientation-panel">
        <div class="orientation-title">{{ t('common.selectOrientation') }}</div>
        <div class="orientation-options">
          <div 
            :class="['orientation-item', { active: selectedOrientation === 'horizontal' }]"
            @click="selectOrientation('horizontal')"
          >
            <div class="orientation-icon horizontal">
              <svg viewBox="0 0 24 24" width="48" height="32" fill="#666">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="#666" stroke-width="1.5" fill="none"/>
                <polygon points="10,8 10,16 16,12" fill="#666"/>
              </svg>
            </div>
            <div class="orientation-label">{{ t('common.horizontal') }}</div>
            <div class="orientation-resolution">{{ currentPlatformResolution.horizontal }}</div>
          </div>
          <div 
            :class="['orientation-item', { active: selectedOrientation === 'vertical' }]"
            @click="selectOrientation('vertical')"
          >
            <div class="orientation-icon vertical">
              <svg viewBox="0 0 24 24" width="32" height="48" fill="#666">
                <rect x="4" y="2" width="16" height="20" rx="2" stroke="#666" stroke-width="1.5" fill="none"/>
                <polygon points="8,10 8,18 14,14" fill="#666"/>
              </svg>
            </div>
            <div class="orientation-label">{{ t('common.vertical') }}</div>
            <div class="orientation-resolution">{{ currentPlatformResolution.vertical }}</div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="showPlatformDialog = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmPlatform">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface DeviceModel {
  name: string
  width: number
  height: number
}

const props = defineProps<{
  modelValue: boolean
  type?: 'video' | 'audio'
  initialSettings?: any
  initialFormat?: string
}>()

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formatTab = ref('video')
const settingsTab = ref('simple')
const searchQuery = ref('')
const selectedFormat = ref('MP4')

// 默认设置
const defaultSettings = {
  clarity: 'quality',
  quality: 'auto',
  resolution: 'auto',
  width: 0,
  height: 0,
  videoCodec: 'auto',
  frameRate: 'auto',
  videoBitrate: '2400',
  audioCodec: 'auto',
  channels: 'auto',
  sampleRate: 'auto',
  audioBitrate: 'auto'
}

const settings = ref({ ...defaultSettings })
const showResolutionPresets = computed(() => String(settings.value.resolution || '').startsWith('custom'))

// 监听弹窗显示，初始化数据
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.type) {
      formatTab.value = props.type
    }
    
    // 如果有传入初始格式，则使用
    if (props.initialFormat) {
      selectedFormat.value = props.initialFormat.toUpperCase()
      // 根据格式判断所在的 tab
      if (audioFormats.includes(selectedFormat.value)) {
        formatTab.value = 'audio'
      } else {
        formatTab.value = 'video'
      }
    } else {
      selectedFormat.value = props.type === 'audio' ? 'MP3' : 'MP4'
    }

    // 如果有传入初始设置，则深度拷贝使用，否则使用默认设置
    if (props.initialSettings) {
      settings.value = JSON.parse(JSON.stringify(props.initialSettings))
    } else {
      settings.value = { ...defaultSettings }
    }
    if (audioFormats.includes(selectedFormat.value)) {
      settings.value.audioCodec = 'auto'
    }
  }
})

const videoFormats = ['MP4', 'AVI', 'WMV', 'FLV', 'MKV', 'MOV', 'WEBM', '3GP', 'F4V', 'SWF', 'OGV', 'ASF', 'VOB', 'MPG', 'MPEG', 'WTV', 'TS', 'M2TS', 'MTS', 'M2T', 'M4V']
const audioFormats = ['MP3', 'WAV', 'OGG', 'FLAC', 'M4A', 'M4R', 'MP2', 'AAC', 'WMA', 'AIFF']

const displayFormats = computed(() => {
  // 根据formatTab决定显示哪种格式
  const formats = formatTab.value === 'audio' ? audioFormats : videoFormats
  if (searchQuery.value) {
    return formats.filter(f => f.toLowerCase().includes(searchQuery.value.toLowerCase()))
  }
  return formats
})

watch(formatTab, (nextTab) => {
  if (nextTab === 'audio' && !audioFormats.includes(selectedFormat.value)) {
    selectedFormat.value = 'MP3'
  } else if (nextTab === 'video' && !videoFormats.includes(selectedFormat.value)) {
    selectedFormat.value = 'MP4'
  }
})

watch(selectedFormat, (format) => {
  if (audioFormats.includes(format)) {
    settings.value.audioCodec = 'auto'
  }
})

// 获取格式图标颜色类
const getFormatColorClass = (fmt: string) => {
  const audioFmts = ['MP3', 'WAV', 'OGG', 'FLAC', 'M4A', 'M4R', 'MP2', 'AAC', 'WMA', 'AIFF']
  if (audioFmts.includes(fmt)) {
    // 音频格式使用不同颜色
    const colorMap: Record<string, string> = {
      'MP3': 'format-purple',
      'WAV': 'format-blue',
      'OGG': 'format-orange',
      'FLAC': 'format-green',
      'M4A': 'format-teal',
      'M4R': 'format-pink',
      'MP2': 'format-red',
      'AAC': 'format-yellow',
      'WMA': 'format-indigo',
      'AIFF': 'format-cyan'
    }
    return colorMap[fmt] || ''
  }
  return ''
}

// 设备选择弹窗
const showDeviceDialog = ref(false)
const selectedBrand = ref('iphone')
const selectedDevice = ref('')

const deviceBrands = [
  { id: 'iphone', name: 'iPhone', icon: '📱' },
  { id: 'huawei', name: '华为', icon: '📱' },
  { id: 'xiaomi', name: '小米', icon: '📱' },
  { id: 'samsung', name: '三星', icon: '📱' },
  { id: 'oppo', name: 'OPPO', icon: '📱' },
  { id: 'vivo', name: 'VIVO', icon: '📱' },
]

const deviceModels: Record<string, Array<{ name: string; width: number; height: number }>> = {
  iphone: [
    { name: 'iPhone 15 Pro Max', width: 1290, height: 2796 },
    { name: 'iPhone 15 Pro', width: 1179, height: 2556 },
    { name: 'iPhone 15', width: 1179, height: 2556 },
    { name: 'iPhone 14 Pro Max', width: 1290, height: 2796 },
    { name: 'iPhone 14 Pro', width: 1179, height: 2556 },
    { name: 'iPhone 14', width: 1170, height: 2532 },
    { name: 'iPhone 13', width: 1170, height: 2532 },
    { name: 'iPhone SE', width: 750, height: 1334 },
  ],
  huawei: [
    { name: 'Mate 60 Pro', width: 1260, height: 2720 },
    { name: 'Mate 60', width: 1216, height: 2688 },
    { name: 'P60 Pro', width: 1260, height: 2720 },
    { name: 'P60', width: 1220, height: 2700 },
    { name: 'Mate 50 Pro', width: 1212, height: 2616 },
    { name: 'Nova 11', width: 1080, height: 2400 },
  ],
  xiaomi: [
    { name: '小米14 Ultra', width: 1440, height: 3200 },
    { name: '小米14 Pro', width: 1440, height: 3200 },
    { name: '小米14', width: 1200, height: 2670 },
    { name: '小米13', width: 1080, height: 2400 },
    { name: 'Redmi K70', width: 1440, height: 3200 },
    { name: 'Redmi Note 13', width: 1080, height: 2400 },
  ],
  samsung: [
    { name: 'Galaxy S24 Ultra', width: 1440, height: 3120 },
    { name: 'Galaxy S24+', width: 1440, height: 3120 },
    { name: 'Galaxy S24', width: 1080, height: 2340 },
    { name: 'Galaxy Z Fold5', width: 1812, height: 2176 },
    { name: 'Galaxy Z Flip5', width: 1080, height: 2640 },
    { name: 'Galaxy A54', width: 1080, height: 2340 },
  ],
  oppo: [
    { name: 'Find X7 Ultra', width: 1440, height: 3168 },
    { name: 'Find X7', width: 1264, height: 2780 },
    { name: 'Reno 11 Pro', width: 1240, height: 2772 },
    { name: 'Reno 11', width: 1080, height: 2412 },
    { name: 'A2 Pro', width: 1080, height: 2412 },
  ],
  vivo: [
    { name: 'X100 Pro', width: 1440, height: 3200 },
    { name: 'X100', width: 1260, height: 2800 },
    { name: 'X Fold3', width: 2160, height: 2520 },
    { name: 'S18 Pro', width: 1260, height: 2800 },
    { name: 'S18', width: 1080, height: 2400 },
  ],
}

const currentDeviceModels = computed(() => {
  return deviceModels[selectedBrand.value] || []
})

const selectDeviceModel = (model: { name: string; width: number; height: number }) => {
  selectedDevice.value = model.name
}

const confirmDevice = () => {
  const models = deviceModels[selectedBrand.value]
  const model = models?.find(m => m.name === selectedDevice.value)
  if (model) {
    settings.value.width = model.width
    settings.value.height = model.height
  }
  showDeviceDialog.value = false
}

// 自媒体平台选择弹窗
const showPlatformDialog = ref(false)
const selectedPlatformId = ref('douyin')
const selectedOrientation = ref<'horizontal' | 'vertical'>('vertical')

const platforms = [
  { id: 'douyin', name: '抖音', icon: '🎵' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕' },
  { id: 'wechat', name: '微信视频号', icon: '💬' },
  { id: 'kuaishou', name: '快手', icon: '⚡' },
  { id: 'bilibili', name: 'B站', icon: '📺' },
  { id: 'ecommerce', name: '电商视频', icon: '🛒' },
]

const platformResolutions: Record<string, { horizontal: string; vertical: string; hWidth: number; hHeight: number; vWidth: number; vHeight: number }> = {
  douyin: { horizontal: '1920x1080', vertical: '1080x1920', hWidth: 1920, hHeight: 1080, vWidth: 1080, vHeight: 1920 },
  xiaohongshu: { horizontal: '1920x1080', vertical: '1080x1440', hWidth: 1920, hHeight: 1080, vWidth: 1080, vHeight: 1440 },
  wechat: { horizontal: '1920x1080', vertical: '1080x1920', hWidth: 1920, hHeight: 1080, vWidth: 1080, vHeight: 1920 },
  kuaishou: { horizontal: '1920x1080', vertical: '1080x1920', hWidth: 1920, hHeight: 1080, vWidth: 1080, vHeight: 1920 },
  bilibili: { horizontal: '1920x1080', vertical: '1080x1920', hWidth: 1920, hHeight: 1080, vWidth: 1080, vHeight: 1920 },
  ecommerce: { horizontal: '800x800', vertical: '800x800', hWidth: 800, hHeight: 800, vWidth: 800, vHeight: 800 },
}

const currentPlatformResolution = computed(() => {
  const res = platformResolutions[selectedPlatformId.value]
  return res || { horizontal: '1920x1080', vertical: '1080x1920' }
})

const selectOrientation = (orientation: 'horizontal' | 'vertical') => {
  selectedOrientation.value = orientation
}

const confirmPlatform = () => {
  const res = platformResolutions[selectedPlatformId.value]
  if (res) {
    if (selectedOrientation.value === 'horizontal') {
      settings.value.width = res.hWidth
      settings.value.height = res.hHeight
    } else {
      settings.value.width = res.vWidth
      settings.value.height = res.vHeight
    }
  }
  showPlatformDialog.value = false
}

// 处理分辨率选择变化
const handleResolutionChange = (value: string) => {
  if (value === 'auto' || value === 'custom') {
    // 自动或自定义，不设置宽高
    return
  }
  if (value === 'custom_16_9') {
    // 自定义16:9，设置默认值
    settings.value.width = 1920
    settings.value.height = 1080
    return
  }
  if (value === 'custom_4_3') {
    // 自定义4:3，设置默认值
    settings.value.width = 1280
    settings.value.height = 960
    return
  }
  // 预设分辨率
  const [width, height] = value.split('x').map(Number)
  if (width && height) {
    settings.value.width = width
    settings.value.height = height
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm', { format: selectedFormat.value, settings: settings.value })
  handleClose()
}
</script>

<style lang="scss">
.settings-dialog {
  .el-dialog__header {
    display: none;
  }
  
  .el-dialog__body {
    padding: 0;
  }
}

.device-dialog,
.platform-dialog {
  .el-dialog__header {
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    
    .el-dialog__title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }
  
  .el-dialog__body {
    padding: 0;
  }
  
  .el-dialog__footer {
    padding: 12px 20px;
    border-top: 1px solid #f0f0f0;
    
    .el-button--primary {
      background: #36d1c4;
      border-color: #36d1c4;
      
      &:hover {
        background: #2bb5a9;
        border-color: #2bb5a9;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.dialog-content {
  display: flex;
  height: 480px;
}

.format-panel {
  width: 200px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;

  .format-tabs {
    display: flex;
    padding: 16px 16px 12px;
    gap: 24px;

    span {
      font-size: 14px;
      color: #666;
      cursor: pointer;
      padding-bottom: 6px;
      border-bottom: 2px solid transparent;

      &.active {
        color: #36d1c4;
        border-bottom-color: #36d1c4;
      }
    }
  }

  .format-list {
    flex: 1;
    overflow-y: auto;

    .format-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #e8f8f6;
      }

      &.active {
        background: #e8f8f6;
        .format-name { color: #36d1c4; font-weight: 500; }
      }

      .format-icon {
        width: 40px;
        height: 40px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;

        span {
          font-size: 10px;
          color: #666;
          font-weight: 500;
        }

        &.format-purple {
          background: #f3e8ff;
          border-color: #c084fc;
          span { color: #9333ea; }
        }
        &.format-blue {
          background: #dbeafe;
          border-color: #60a5fa;
          span { color: #2563eb; }
        }
        &.format-orange {
          background: #ffedd5;
          border-color: #fb923c;
          span { color: #ea580c; }
        }
        &.format-green {
          background: #dcfce7;
          border-color: #4ade80;
          span { color: #16a34a; }
        }
        &.format-teal {
          background: #ccfbf1;
          border-color: #2dd4bf;
          span { color: #0d9488; }
        }
        &.format-pink {
          background: #fce7f3;
          border-color: #f472b6;
          span { color: #db2777; }
        }
        &.format-red {
          background: #fee2e2;
          border-color: #f87171;
          span { color: #dc2626; }
        }
        &.format-yellow {
          background: #fef9c3;
          border-color: #facc15;
          span { color: #ca8a04; }
        }
        &.format-indigo {
          background: #e0e7ff;
          border-color: #818cf8;
          span { color: #4f46e5; }
        }
        &.format-cyan {
          background: #cffafe;
          border-color: #22d3ee;
          span { color: #0891b2; }
        }
      }

      .format-name {
        font-size: 14px;
        color: #333;
      }
    }
  }

  .format-search {
    padding: 12px;
    border-top: 1px solid #e8e8e8;
  }
}

.settings-panel {
  flex: 1;
  display: flex;
  flex-direction: column;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 20px 0;

    .settings-tabs {
      display: flex;
      gap: 28px;

      span {
        font-size: 14px;
        color: #666;
        cursor: pointer;
        padding-bottom: 8px;
        border-bottom: 2px solid transparent;

        &.active {
          color: #36d1c4;
          border-bottom-color: #36d1c4;
        }
      }
    }

    .settings-title {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .close-btn {
      font-size: 22px;
      color: #999;
      cursor: pointer;
      line-height: 1;

      &:hover { color: #666; }
    }
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;

    .section {
      margin-bottom: 24px;

      h4 {
        font-size: 14px;
        color: #333;
        margin-bottom: 16px;
        font-weight: 500;
      }

      .form-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;

        label {
          font-size: 13px;
          color: #666;
          min-width: 55px;
        }

        .separator {
          color: #999;
        }

        .preset-btn {
          background: #36d1c4;
          border-color: #36d1c4;
          color: white;

          &:hover {
            background: #2bb5a9;
            border-color: #2bb5a9;
          }
        }
      }

      .audio-form-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;

        label {
          font-size: 13px;
          color: #666;
          min-width: 55px;
          flex-shrink: 0;
        }

        .audio-select {
          width: 160px;
          flex-shrink: 0;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;

    :deep(.el-button--primary) {
      background: #36d1c4;
      border-color: #36d1c4;

      &:hover {
        background: #2bb5a9;
        border-color: #2bb5a9;
      }
    }
  }
}

// 设备/平台选择弹窗通用样式
.selector-content {
  display: flex;
  height: 400px;
}

.brand-list {
  width: 140px;
  background: #f8f9fa;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;

  .brand-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #e8f8f6;
    }

    &.active {
      background: #e8f8f6;
      .brand-name {
        color: #36d1c4;
        font-weight: 500;
      }
    }

    .brand-icon {
      font-size: 18px;
    }

    .brand-name {
      font-size: 14px;
      color: #333;
    }
  }
}

.model-grid {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  overflow-y: auto;
  align-content: start;

  .model-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #36d1c4;
      background: #f8fffe;
    }

    &.active {
      border-color: #36d1c4;
      background: #e8f8f6;
    }

    .device-icon {
      margin-bottom: 8px;
    }

    .model-name {
      font-size: 12px;
      color: #333;
      text-align: center;
      margin-bottom: 4px;
    }

    .model-resolution {
      font-size: 11px;
      color: #999;
    }
  }
}

.orientation-panel {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;

  .orientation-title {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
  }

  .orientation-options {
    display: flex;
    gap: 32px;
    justify-content: center;
    flex: 1;
    align-items: center;

    .orientation-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 32px;
      border: 2px solid #e8e8e8;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 140px;

      &:hover {
        border-color: #36d1c4;
        background: #f8fffe;
      }

      &.active {
        border-color: #36d1c4;
        background: #e8f8f6;
      }

      .orientation-icon {
        margin-bottom: 16px;
        
        &.horizontal svg {
          width: 80px;
          height: 50px;
        }
        
        &.vertical svg {
          width: 40px;
          height: 70px;
        }
      }

      .orientation-label {
        font-size: 14px;
        color: #333;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .orientation-resolution {
        font-size: 12px;
        color: #999;
      }
    }
  }
}
</style>
