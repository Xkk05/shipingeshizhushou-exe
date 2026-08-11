<template>
  <div class="top-toolbar" :class="{ 'is-web-toolbar': !platformService.isElectron }">
    <div class="left-btns">
      <div class="add-btn-group">
        <el-button type="primary" class="add-btn" @click="$emit('add-files')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          {{ t('common.addFiles') }}
        </el-button>
        <el-dropdown trigger="click" @command="handleAddCommand">
          <el-button type="primary" class="add-btn-dropdown">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="files">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#666" style="margin-right: 8px">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
                {{ t('common.addFiles') }}
              </el-dropdown-item>
              <el-dropdown-item v-if="platformService.isElectron" command="folder">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#666" style="margin-right: 8px">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                {{ t('common.addFolder') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-button v-if="platformService.isElectron" class="device-btn" @click="$emit('add-device')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
        </svg>
        {{ t('common.deviceAddFiles') }}
      </el-button>
      <el-button
        v-if="platformService.isElectron && showUrlDownload"
        class="m3u8-btn"
        @click="$emit('add-url')"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        {{ t('common.urlDownload') }}
      </el-button>
    </div>
    <div class="right-btns">
      <el-button class="clear-btn" @click="$emit('clear')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
        {{ t('common.clearList') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { platformService } from '@/services/platformService';

const { t } = useI18n();

defineProps<{
  showM3u8?: boolean;
  showUrlDownload?: boolean;
}>();

const emit = defineEmits(['add-files', 'add-folder', 'add-device', 'add-m3u8', 'add-url', 'clear']);

const handleAddCommand = (command: string) => {
  if (command === 'files') {
    emit('add-files');
  } else if (command === 'folder') {
    emit('add-folder');
  }
};
</script>

<style lang="scss" scoped>
.top-toolbar {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  gap: 12px;

  .left-btns {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .add-btn-group {
    display: flex;

    .add-btn {
      background: #36d1c4;
      border-color: #36d1c4;
      border-radius: 20px 0 0 20px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-right: 1px solid rgba(255, 255, 255, 0.3);

      &:hover {
        background: #2bb5a9;
        border-color: #2bb5a9;
      }
    }

    .add-btn-dropdown {
      background: #36d1c4;
      border-color: #36d1c4;
      border-radius: 0 20px 20px 0;
      padding: 8px 10px;
      min-width: auto;

      &:hover {
        background: #2bb5a9;
        border-color: #2bb5a9;
      }
    }
  }

  .device-btn,
  .m3u8-btn {
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #36d1c4;
    border-color: #36d1c4;
    background: #fff;

    &:hover {
      background: #e8f8f6;
      color: #36d1c4;
      border-color: #36d1c4;
    }
  }

  .clear-btn {
    border-radius: 20px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #36d1c4;
    border-color: #36d1c4;
    background: #fff;

    &:hover {
      background: #e8f8f6;
      color: #36d1c4;
      border-color: #36d1c4;
    }
  }

  &.is-web-toolbar {
    padding: 18px 20px 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 1));

    .add-btn {
      min-height: 44px;
      padding: 0 18px;
      background: linear-gradient(135deg, #0f766e, #14b8a6);
      border-color: #14b8a6;
      box-shadow: 0 18px 36px rgba(20, 184, 166, 0.16);
    }

    .add-btn-dropdown {
      min-height: 44px;
      background: linear-gradient(135deg, #0f766e, #14b8a6);
      border-color: #14b8a6;
    }

    .clear-btn {
      min-height: 44px;
      border-color: rgba(148, 163, 184, 0.22);
      color: #334155;
      background: rgba(255, 255, 255, 0.9);
    }
  }
}

@media (max-width: 720px) {
  .top-toolbar {
    padding: 14px 14px 12px;
    flex-direction: column;
    align-items: stretch;

    .left-btns,
    .right-btns {
      width: 100%;
    }

    .add-btn-group {
      width: 100%;

      .add-btn {
        flex: 1;
        justify-content: center;
      }
    }

    .clear-btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
