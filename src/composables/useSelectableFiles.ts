import { computed, ref, type ComputedRef, type Ref } from 'vue'

type SelectableFile = {
  id: string
  status?: string
}

type FileSource<T> = Ref<T[]> | ComputedRef<T[]>

type UseSelectableFilesOptions<T> = {
  isSelectable?: (file: T) => boolean
  isReady?: (file: T) => boolean
}

const defaultIsSelectable = <T extends SelectableFile>(file: T) => file.status !== 'converting'

export function useSelectableFiles<T extends SelectableFile>(
  files: FileSource<T>,
  options: UseSelectableFilesOptions<T> = {},
) {
  const selectedFileIds = ref<string[]>([])
  const isSelectable = options.isSelectable || defaultIsSelectable
  const isReady = options.isReady || isSelectable

  const selectableFiles = computed(() => files.value.filter(isSelectable))
  const selectedFiles = computed(() => files.value.filter(file => selectedFileIds.value.includes(file.id)))
  const selectedReadyFiles = computed(() => selectedFiles.value.filter(isReady))
  const batchActionDisabled = computed(() => selectedReadyFiles.value.length === 0)

  const allSelectableSelected = computed(() => (
    selectableFiles.value.length > 0 &&
    selectableFiles.value.every(file => selectedFileIds.value.includes(file.id))
  ))

  const someSelectableSelected = computed(() => (
    !allSelectableSelected.value &&
    selectableFiles.value.some(file => selectedFileIds.value.includes(file.id))
  ))

  const setFileSelected = (file: T, selected: boolean) => {
    if (!isSelectable(file)) return
    if (selected) {
      if (!selectedFileIds.value.includes(file.id)) {
        selectedFileIds.value = [...selectedFileIds.value, file.id]
      }
      return
    }
    selectedFileIds.value = selectedFileIds.value.filter(id => id !== file.id)
  }

  const toggleSelectAll = (value: string | number | boolean) => {
    selectedFileIds.value = value ? selectableFiles.value.map(file => file.id) : []
  }

  const clearSelection = () => {
    selectedFileIds.value = []
  }

  const removeSelection = (fileOrId: T | string) => {
    const id = typeof fileOrId === 'string' ? fileOrId : fileOrId.id
    selectedFileIds.value = selectedFileIds.value.filter(selectedId => selectedId !== id)
  }

  return {
    selectedFileIds,
    selectableFiles,
    selectedFiles,
    selectedReadyFiles,
    batchActionDisabled,
    allSelectableSelected,
    someSelectableSelected,
    setFileSelected,
    toggleSelectAll,
    clearSelection,
    removeSelection,
  }
}
