import fs from 'fs'

import type { FontStyleOptions } from './watermarkFilters'

type FontCandidates = {
  regular: string[]
  bold?: string[]
  italic?: string[]
  boldItalic?: string[]
}

const windowsFontMap: Record<string, FontCandidates> = {
  'Microsoft YaHei': {
    regular: ['C:\\Windows\\Fonts\\msyh.ttc'],
    bold: ['C:\\Windows\\Fonts\\msyhbd.ttc', 'C:\\Windows\\Fonts\\msyh.ttc'],
    italic: ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simkai.ttf'],
    boldItalic: ['C:\\Windows\\Fonts\\msyhbd.ttc', 'C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simkai.ttf'],
  },
  '微软雅黑': {
    regular: ['C:\\Windows\\Fonts\\msyh.ttc'],
    bold: ['C:\\Windows\\Fonts\\msyhbd.ttc', 'C:\\Windows\\Fonts\\msyh.ttc'],
    italic: ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simkai.ttf'],
    boldItalic: ['C:\\Windows\\Fonts\\msyhbd.ttc', 'C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simkai.ttf'],
  },
  SimSun: {
    regular: ['C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    bold: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    italic: ['C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    boldItalic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
  },
  '宋体': {
    regular: ['C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    bold: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    italic: ['C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
    boldItalic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simsun.ttc', 'C:\\Windows\\Fonts\\SIMSUN.TTC'],
  },
  SimHei: {
    regular: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF'],
    italic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF', 'C:\\Windows\\Fonts\\simkai.ttf'],
    boldItalic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF', 'C:\\Windows\\Fonts\\simkai.ttf'],
  },
  '黑体': {
    regular: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF'],
    italic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF', 'C:\\Windows\\Fonts\\simkai.ttf'],
    boldItalic: ['C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\SIMHEI.TTF', 'C:\\Windows\\Fonts\\simkai.ttf'],
  },
  Arial: {
    regular: ['C:\\Windows\\Fonts\\arial.ttf', 'C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\msyh.ttc'],
    bold: ['C:\\Windows\\Fonts\\arialbd.ttf', 'C:\\Windows\\Fonts\\simhei.ttf', 'C:\\Windows\\Fonts\\msyhbd.ttc'],
    italic: ['C:\\Windows\\Fonts\\ariali.ttf', 'C:\\Windows\\Fonts\\arial.ttf', 'C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simhei.ttf'],
    boldItalic: ['C:\\Windows\\Fonts\\arialbi.ttf', 'C:\\Windows\\Fonts\\arialbd.ttf', 'C:\\Windows\\Fonts\\simkai.ttf', 'C:\\Windows\\Fonts\\simhei.ttf'],
  },
}

const cjkFallbackFamilies = ['Microsoft YaHei', 'SimHei', 'SimSun']
const defaultFontPaths = [
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\SIMHEI.TTF',
  'C:\\Windows\\Fonts\\msyh.ttc',
  'C:\\Windows\\Fonts\\msyhbd.ttc',
  'C:\\Windows\\Fonts\\simsun.ttc',
  'C:\\Windows\\Fonts\\SIMSUN.TTC',
]

export const containsCjkText = (text?: string) =>
  /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(String(text || ''))

const styledFontPaths = (candidates: FontCandidates, style: FontStyleOptions = {}) => {
  const styled = style.bold && style.italic
    ? candidates.boldItalic
    : style.bold
      ? candidates.bold
      : style.italic
        ? candidates.italic
        : undefined

  return [...(styled || []), ...candidates.regular]
}

const existingFont = (paths: string[]) => paths.find((fontPath) => fs.existsSync(fontPath))

export const resolveWatermarkFontPath = (
  fontFamily?: string,
  style: FontStyleOptions = {},
  text = '',
) => {
  const hasCjk = containsCjkText(text)
  const requestedFamily = fontFamily && windowsFontMap[fontFamily] ? fontFamily : undefined
  const familyQueue = hasCjk
    ? [
        ...(requestedFamily && requestedFamily !== 'Arial' ? [requestedFamily] : []),
        ...cjkFallbackFamilies,
        ...(requestedFamily === 'Arial' ? ['Arial'] : []),
      ]
    : [requestedFamily || 'Arial']

  for (const family of familyQueue) {
    const candidates = windowsFontMap[family]
    const fontPath = candidates ? existingFont(styledFontPaths(candidates, style)) : undefined
    if (fontPath) return fontPath
  }

  return existingFont(defaultFontPaths) || 'C:\\Windows\\Fonts\\arial.ttf'
}
