/**
 * 资源类型常量配置
 */

/**
 * 允许的资源分类（教学用途）
 */
export const ALLOWED_CATEGORIES = [
  '教材',
  '教案',
  '课件',
  '习题',
  '其他',
] as const;

export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];

/**
 * 允许的文件格式
 */
export const ALLOWED_FILE_FORMATS = [
  'PDF',
  'DOC',
  'PPT',
  '图片',
  '其他',
] as const;

export type AllowedFileFormat = typeof ALLOWED_FILE_FORMATS[number];

/**
 * 被禁用的资源类型（历史数据保留，新上传不允许）
 */
export const DISABLED_CATEGORIES = ['视频'] as const;
export const DISABLED_FILE_FORMATS = ['视频', 'VIDEO'] as const;

/**
 * 检查分类是否被允许
 */
export function isCategoryAllowed(category: string): boolean {
  return ALLOWED_CATEGORIES.includes(category as AllowedCategory);
}

/**
 * 检查文件格式是否被允许
 */
export function isFileFormatAllowed(format: string): boolean {
  return ALLOWED_FILE_FORMATS.includes(format as AllowedFileFormat);
}

/**
 * 检查是否为视频资源（用于过滤）
 */
export function isVideoResource(category?: string | null, fileFormat?: string | null): boolean {
  if (!category && !fileFormat) return false;
  
  const videoCategories = ['视频'];
  const videoFormats = ['视频', 'VIDEO', 'video'];
  
  return (
    (category && videoCategories.includes(category)) ||
    (fileFormat && videoFormats.includes(fileFormat))
  );
}


