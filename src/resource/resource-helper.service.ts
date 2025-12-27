/**
 * Resource 辅助服务
 * 用于提供资源相关的辅助功能，如获取 catalog_info 等
 */

import { getResourceTextbooks } from '../textbook/textbook.controller';

/**
 * 将学段从英文转换为中文（用于前端显示）
 * 例如："elementary" -> "小学", "middle" -> "初中"
 * 如果已经是中文，直接返回
 */
const convertEducationLevelToChinese = (educationLevel: string | null | undefined): string | null | undefined => {
  if (!educationLevel || typeof educationLevel !== 'string') {
    return educationLevel;
  }
  
  const levelMap: { [key: string]: string } = {
    'elementary': '小学',
    'middle': '初中',
    'junior': '初中', // 兼容可能的其他英文表示
    '小学': '小学',
    '初中': '初中',
  };
  
  // 先尝试直接匹配
  const trimmed = educationLevel.trim();
  if (levelMap[trimmed]) {
    return levelMap[trimmed];
  }
  
  // 转换为小写后查找
  const normalized = trimmed.toLowerCase();
  if (levelMap[normalized]) {
    return levelMap[normalized];
  }
  
  // 如果无法转换，返回原值
  console.warn(`[学段转换] 未知的学段值: "${educationLevel}"`);
  return educationLevel;
};

/**
 * 为资源添加 catalog_info 信息，并转换 auto_meta_result 中的 education_level
 * @param resource 资源对象
 * @returns 添加了 catalog_info 的资源对象
 */
export async function enrichResourceWithCatalogInfo(resource: any): Promise<any> {
  // 转换 auto_meta_result 中的 education_level（如果存在）
  if (resource.auto_meta_result) {
    try {
      // auto_meta_result 可能是字符串（JSON）或对象
      // MySQL JSON 字段可能返回为 Buffer、字符串或已解析的对象
      let autoMeta = resource.auto_meta_result;
      
      // 处理 Buffer（MySQL JSON 字段有时返回 Buffer）
      if (Buffer.isBuffer(autoMeta)) {
        autoMeta = JSON.parse(autoMeta.toString());
      } else if (typeof autoMeta === 'string') {
        // 尝试解析字符串
        try {
          autoMeta = JSON.parse(autoMeta);
        } catch (e) {
          // 如果解析失败，可能是已经是字符串格式的值，跳过
          console.warn(`资源 ${resource.id} 的 auto_meta_result 解析失败:`, e);
          autoMeta = null;
        }
      }
      
      // 如果 autoMeta 是对象且有 education_level 字段
      if (autoMeta && typeof autoMeta === 'object' && autoMeta.education_level) {
        const originalValue = autoMeta.education_level;
        autoMeta.education_level = convertEducationLevelToChinese(autoMeta.education_level);
        
        // 调试日志
        if (originalValue !== autoMeta.education_level) {
          console.log(`[学段转换] 资源 ${resource.id}: ${originalValue} -> ${autoMeta.education_level}`);
        }
        
        // 更新 resource.auto_meta_result
        // 根据设计规范，auto_meta_result 应该是对象，不应该序列化为字符串
        resource.auto_meta_result = autoMeta;
      }
    } catch (error) {
      // 解析失败不影响主流程
      console.error(`转换资源 ${resource.id} 的 auto_meta_result 失败:`, error);
    }
  }

  try {
    const textbooks = await getResourceTextbooks(resource.id);
    if (textbooks && textbooks.length > 0) {
      // 只返回 catalog_info，不返回 textbooks 数组（避免重复）
      // 使用第一个关联的教材目录（目前系统设计：一个资源只关联一个教材目录）
      const firstTextbook = textbooks[0];
      if (firstTextbook) {
        // 在资源对象上直接添加 catalog_id 字段（前端需要）
        resource.catalog_id = firstTextbook.id;
        
        // 同时添加到 catalog_info 中（保持向后兼容）
        resource.catalog_info = {
          catalog_id: firstTextbook.id, // 添加 catalog_id 字段（前端需要）
          education_level: convertEducationLevelToChinese(firstTextbook.education_level), // 转换为中文显示
          grade: firstTextbook.grade,
          subject: firstTextbook.subject,
          textbook_version: firstTextbook.textbook_version,
          volume: firstTextbook.volume,
        };
      }
      // 注意：不再返回 textbooks 字段，避免与 catalog_info 重复
      // 如果未来需要支持一个资源关联多个教材，可以扩展 catalog_info 为数组
    } else {
      // 如果没有绑定教材目录，确保 catalog_id 为 null（前端需要）
      resource.catalog_id = null;
    }
  } catch (error) {
    // 获取教材信息失败不影响主流程，继续返回资源信息
    console.error(`获取资源 ${resource.id} 的教材信息失败:`, error);
    // 出错时也设置 catalog_id 为 null
    resource.catalog_id = null;
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

