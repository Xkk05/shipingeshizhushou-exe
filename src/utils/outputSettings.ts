export const clonePlain = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const cloneOutputSettings = <T extends Record<string, any>>(settings: T, defaults?: Record<string, any>) => ({
  ...(defaults || {}),
  ...clonePlain(settings || ({} as T)),
})

export const isFileOutputCustomized = (file: any) => Boolean(file?.hasCustomOutputSettings)

export const markFileOutputCustomized = (file: any, customized = true) => {
  if (file) file.hasCustomOutputSettings = customized
}

export const resetFileOutputStatus = (file: any) => {
  if (file?.status === 'completed' || file?.status === 'error') {
    file.status = 'pending'
    file.progress = 0
  }
}

export const buildOutputName = (fileName: string, suffix: string, format: string) => {
  const baseName = String(fileName || 'output')
  const outputSuffix = `${suffix}.${String(format).toLowerCase()}`
  return /\.[^.]+$/.test(baseName) ? baseName.replace(/\.[^.]+$/, outputSuffix) : `${baseName}${outputSuffix}`
}
