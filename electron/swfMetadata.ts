import * as fs from 'fs'
import * as zlib from 'zlib'

type SwfBuffer = {
  compressed: boolean
  file: Buffer
  uncompressed: Buffer
}

export type SwfRepairResult = {
  patched: boolean
  frameCount: number
  previousFrameCount: number
}

export type SwfMetadata = {
  frameCount: number
  frameRate: number
  duration: number
}

const SWF_HEADER_SIZE = 8
const SHOW_FRAME_TAG = 1
const END_TAG = 0

const readSwf = (filePath: string): SwfBuffer | null => {
  const file = fs.readFileSync(filePath)
  const signature = file.subarray(0, 3).toString('ascii')

  if (signature === 'FWS') {
    return { compressed: false, file, uncompressed: Buffer.from(file) }
  }

  if (signature === 'CWS') {
    const header = Buffer.from(file.subarray(0, SWF_HEADER_SIZE))
    header.write('FWS', 0, 'ascii')

    return {
      compressed: true,
      file,
      uncompressed: Buffer.concat([header, zlib.inflateSync(file.subarray(SWF_HEADER_SIZE))]),
    }
  }

  return null
}

const getHeaderOffsets = (swf: Buffer) => {
  if (swf.length <= SWF_HEADER_SIZE) return -1

  const rectBits = swf[SWF_HEADER_SIZE] >> 3
  const rectBytes = Math.ceil((5 + rectBits * 4) / 8)
  const frameRateOffset = SWF_HEADER_SIZE + rectBytes
  const frameCountOffset = frameRateOffset + 2

  return frameCountOffset + 2 <= swf.length ? { frameRateOffset, frameCountOffset } : -1
}

const countShowFrames = (swf: Buffer, tagsOffset: number) => {
  let offset = tagsOffset
  let frameCount = 0

  while (offset + 2 <= swf.length) {
    const tagHeader = swf.readUInt16LE(offset)
    offset += 2

    const tagCode = tagHeader >> 6
    let tagLength = tagHeader & 0x3f

    if (tagLength === 0x3f) {
      if (offset + 4 > swf.length) break
      tagLength = swf.readUInt32LE(offset)
      offset += 4
    }

    if (tagCode === SHOW_FRAME_TAG) frameCount += 1
    if (tagCode === END_TAG) break

    offset += tagLength
  }

  return frameCount
}

export const repairSwfFrameCount = (filePath: string): SwfRepairResult | null => {
  const swf = readSwf(filePath)
  if (!swf) return null

  const offsets = getHeaderOffsets(swf.uncompressed)
  if (offsets === -1) {
    throw new Error(`Invalid SWF header: ${filePath}`)
  }

  const previousFrameCount = swf.uncompressed.readUInt16LE(offsets.frameCountOffset)
  const frameCount = countShowFrames(swf.uncompressed, offsets.frameCountOffset + 2)
  if (frameCount <= 0 || previousFrameCount === frameCount) {
    return { patched: false, frameCount, previousFrameCount }
  }

  swf.uncompressed.writeUInt16LE(Math.min(frameCount, 0xffff), offsets.frameCountOffset)

  if (swf.compressed) {
    const output = Buffer.concat([
      Buffer.from(swf.file.subarray(0, SWF_HEADER_SIZE)),
      zlib.deflateSync(swf.uncompressed.subarray(SWF_HEADER_SIZE)),
    ])
    output.write('CWS', 0, 'ascii')
    fs.writeFileSync(filePath, output)
  } else {
    fs.writeFileSync(filePath, swf.uncompressed)
  }

  return { patched: true, frameCount, previousFrameCount }
}

export const readSwfMetadata = (filePath: string): SwfMetadata | null => {
  const swf = readSwf(filePath)
  if (!swf) return null

  const offsets = getHeaderOffsets(swf.uncompressed)
  if (offsets === -1) {
    throw new Error(`Invalid SWF header: ${filePath}`)
  }

  const frameCount = swf.uncompressed.readUInt16LE(offsets.frameCountOffset)
  const frameRate = swf.uncompressed.readUInt16LE(offsets.frameRateOffset) / 256

  return {
    frameCount,
    frameRate,
    duration: frameRate > 0 ? frameCount / frameRate : 0,
  }
}
