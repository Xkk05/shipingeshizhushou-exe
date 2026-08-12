<template>
  <div class="selection-toolbar">
    <el-checkbox
      :model-value="allSelected"
      :indeterminate="someSelected"
      :disabled="disabled"
      @change="handleToggle"
    >
      {{ allSelected ? t('common.deselectAll') : t('common.selectAll') }}
    </el-checkbox>
    <span class="selection-summary">
      {{ t('common.selectedFilesCount', { count: selectedCount }) }}
    </span>
    <span v-if="selectedCount" class="selection-summary muted">
      {{ t('common.convertibleFilesCount', { count: readyCount }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  allSelected: boolean
  someSelected: boolean
  disabled?: boolean
  selectedCount: number
  readyCount?: number
}>(), {
  disabled: false,
  readyCount: 0,
})

const emit = defineEmits<{
  'toggle-all': [value: string | number | boolean]
}>()

const { t } = useI18n()

const handleToggle = (value: string | number | boolean) => {
  emit('toggle-all', value)
}
</script>

<style lang="scss" scoped>
.selection-toolbar {
  margin: 0 20px 12px;
  padding: 10px 14px;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #d8e4f0;
  border-radius: 12px;
  background: #fff;

  :deep(.el-checkbox__label) {
    color: #334155;
    font-size: 13px;
    font-weight: 400;
  }

  :deep(.el-checkbox__inner) {
    border-radius: 5px;
    border-color: #9bd8d1;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
  :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
    background: #36d1c4;
    border-color: #36d1c4;
  }

  .selection-summary {
    font-size: 13px;
    color: #36a99f;
  }

  .selection-summary.muted {
    color: #64748b;
  }
}

@media (max-width: 900px) {
  .selection-toolbar {
    margin: 0 8px 10px;
    flex-wrap: wrap;
  }
}
</style>
