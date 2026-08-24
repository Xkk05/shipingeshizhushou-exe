type ConversionFileState = {
  status?: string
  progress?: number
  actualOutputSize?: number
  errorMsg?: string
  conversionRunId?: number
  cancelRequestedRunId?: number
}

type CancelOptions = {
  clearActualOutputSize?: boolean
  clearErrorMessage?: boolean
}

export const beginConversionRun = (file: ConversionFileState, options: CancelOptions = {}) => {
  const runId = Number(file.conversionRunId || 0) + 1
  file.conversionRunId = runId
  delete file.cancelRequestedRunId
  file.status = 'converting'
  file.progress = 0
  if (options.clearActualOutputSize) delete file.actualOutputSize
  if (options.clearErrorMessage) file.errorMsg = ''
  return runId
}

export const requestConversionCancel = (file: ConversionFileState, options: CancelOptions = {}) => {
  file.cancelRequestedRunId = Number(file.conversionRunId || 0)
  file.status = 'pending'
  file.progress = 0
  if (options.clearActualOutputSize) delete file.actualOutputSize
  if (options.clearErrorMessage) file.errorMsg = ''
}

export const isCurrentConversionRun = (file: ConversionFileState, runId: number) => {
  return file.conversionRunId === runId
}

export const isConversionCancelRequested = (file: ConversionFileState, runId: number) => {
  return file.cancelRequestedRunId === runId
}

export const finishCancelledConversion = (file: ConversionFileState, options: CancelOptions = {}) => {
  file.status = 'pending'
  file.progress = 0
  if (options.clearActualOutputSize) delete file.actualOutputSize
  if (options.clearErrorMessage) file.errorMsg = ''
  delete file.cancelRequestedRunId
}
