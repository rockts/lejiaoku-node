/**
 * Resource 辅助服务
 * 用于提供资源相关的辅助功能，如获取 catalog_info 等
 */

import { getResourceTextbooks } from '../textbook/textbook.controller';

/**
 * 为资源添加 catalog_info 信息
 * @param resource 资源对象
 * @returns 添加了 catalog_info 的资源对象
 */
export async function enrichResourceWithCatalogInfo(resource: any): Promise<any> {
  try {
    const textbooks = await getResourceTextbooks(resource.id);
    if (textbooks && textbooks.length > 0) {
      resource.textbooks = textbooks;
      // 如果有关联的教材目录，返回简化的 catalog_info（使用第一个关联的目录）
      const firstTextbook = textbooks[0];
      if (firstTextbook) {
        resource.catalog_info = {
          education_level: firstTextbook.education_level,
          grade: firstTextbook.grade,
          subject: firstTextbook.subject,
          textbook_version: firstTextbook.textbook_version,
          volume: firstTextbook.volume,
        };
      }
    }
  } catch (error) {
    // 获取教材信息失败不影响主流程，继续返回资源信息
    console.error(`获取资源 ${resource.id} 的教材信息失败:`, error);
  }
  return resource;
}

/**
 * 批量为资源列表添加 catalog_info 信息
 * @param resources 资源对象数组
 * @returns 添加了 catalog_info 的资源对象数组
 */
export async function enrichResourceListWithCatalogInfo(resources: any[]): Promise<any[]> {
  // 使用 Promise.all 并行处理，提高性能
  const enrichedResources = await Promise.all(
    resources.map(resource => enrichResourceWithCatalogInfo(resource))
  );
  return enrichedResources;
}

