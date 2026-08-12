import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useSelectableFiles } from '../src/composables/useSelectableFiles'

type MockFile = {
  id: string
  status?: string
  ready?: boolean
}

describe('useSelectableFiles', () => {
  it('keeps batch actions disabled until a ready file is selected', () => {
    const files = ref<MockFile[]>([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'converting' },
    ])

    const selection = useSelectableFiles(files)

    expect(selection.batchActionDisabled.value).toBe(true)
    selection.setFileSelected(files.value[1], true)
    expect(selection.selectedFileIds.value).toEqual([])

    selection.setFileSelected(files.value[0], true)
    expect(selection.selectedReadyFiles.value.map(file => file.id)).toEqual(['a'])
    expect(selection.batchActionDisabled.value).toBe(false)
  })

  it('selects, removes, and clears selectable files only', () => {
    const files = ref<MockFile[]>([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'completed' },
      { id: 'c', status: 'converting' },
    ])

    const selection = useSelectableFiles(files)

    selection.toggleSelectAll(true)
    expect(selection.selectedFileIds.value).toEqual(['a', 'b'])
    expect(selection.allSelectableSelected.value).toBe(true)

    selection.removeSelection('a')
    expect(selection.selectedFileIds.value).toEqual(['b'])
    expect(selection.someSelectableSelected.value).toBe(true)

    selection.clearSelection()
    expect(selection.selectedFileIds.value).toEqual([])
    expect(selection.batchActionDisabled.value).toBe(true)
  })

  it('supports module-specific ready rules', () => {
    const files = ref<MockFile[]>([
      { id: 'a', status: 'pending', ready: false },
      { id: 'b', status: 'pending', ready: true },
    ])

    const selection = useSelectableFiles(files, {
      isReady: file => file.status !== 'converting' && Boolean(file.ready),
    })

    selection.toggleSelectAll(true)
    expect(selection.selectedFiles.value.map(file => file.id)).toEqual(['a', 'b'])
    expect(selection.selectedReadyFiles.value.map(file => file.id)).toEqual(['b'])
    expect(selection.batchActionDisabled.value).toBe(false)
  })
})
