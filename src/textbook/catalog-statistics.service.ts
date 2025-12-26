/**
 * Catalog 统计服务
 * 提供基于 catalog 的资源统计功能
 * 
 * 【系统级不变量】Catalog 统计规则：
 * 1. 统计必须以 catalog + unit 为维度
 * 2. 禁止"按学科/年级字符串统计"
 * 3. Catalog 统计 ≠ 搜索
 * 4. Catalog 统计是"系统真实内容密度"的唯一来源
 * 
 * 【Catalog 质量状态规则】：
 * - 质量状态必须派生而不是存表（可重复计算）
 * - Catalog 质量 ≠ 内容好坏
 * - Catalog 质量 = 系统是否可持续生长
 * - 质量状态是"运营唯一可信信号"
 * 
 * 约束：
 * - 只统计已审核（approved）资源
 * - 只统计已绑定 catalog 的资源
 * - SQL 必须基于：resource, resource_textbook_map, textbook_catalog
 * - 严禁任何 auto_meta_result / chapter_info 参与
 */

import { connection } from '../app/database/mysql';

/**
 * Catalog 质量状态枚举
 */
export type CatalogQualityState = 'healthy' | 'needs_content' | 'needs_organization' | 'empty';

/**
 * 计算 Catalog 质量状态
 * 
 * 状态判定规则（严格）：
 * 1. empty: resource_total = 0
 * 2. needs_organization: resource_total > 0 && resource_pending_unit > 0
 * 3. needs_content: resource_total > 0 && resource_pending_unit = 0 && (unit_total = 0 或 大部分unit的resource_count <= 1)
 * 4. healthy: resource_total > 0 && resource_pending_unit = 0 && unit_total > 0 && 大部分unit有资源(>= 2)
 * 
 * 注意：质量状态必须派生而不是存表（可重复计算）
 */
export const calculateCatalogQualityState = async (
  catalogId: number,
  resourceTotal: number,
  unitTotal: number,
  resourcePendingUnit: number,
): Promise<{ state: CatalogQualityState; reasons: string[] }> => {
  // 1. empty: resource_total = 0
  if (resourceTotal === 0) {
    return {
      state: 'empty',
      reasons: ['No resources in this catalog'],
    };
  }

  // 2. needs_organization: resource_total > 0 && resource_pending_unit > 0
  if (resourcePendingUnit > 0) {
    return {
      state: 'needs_organization',
      reasons: [`${resourcePendingUnit} resource${resourcePendingUnit > 1 ? 's' : ''} missing unit`],
    };
  }

  // 3. needs_content: resource_total > 0 && resource_pending_unit = 0 && (unit_total = 0 或 大部分unit的resource_count <= 1)
  // 4. healthy: resource_total > 0 && resource_pending_unit = 0 && unit_total > 0 && 大部分unit有资源(>= 2)
  
  if (unitTotal === 0) {
    return {
      state: 'needs_content',
      reasons: ['No units with resources'],
    };
  }

  // 获取每个 unit 的资源数量
  const unitStats = await getCatalogUnitStatistics(catalogId);
  const unitsWithMultipleResources = unitStats.filter((u: any) => u.resource_count >= 2).length;
  const unitsWithSingleResource = unitStats.filter((u: any) => u.resource_count === 1).length;

  // 如果大部分 unit 只有 1 个或更少的资源，则认为是 needs_content
  // 判断标准：如果超过 50% 的 unit 只有 1 个资源，或者所有 unit 都只有 1 个资源
  if (unitsWithMultipleResources === 0 || (unitsWithSingleResource > unitsWithMultipleResources)) {
    return {
      state: 'needs_content',
      reasons: [
        `${unitsWithSingleResource} unit${unitsWithSingleResource > 1 ? 's' : ''} with only 1 resource`,
        `Only ${unitsWithMultipleResources} unit${unitsWithMultipleResources !== 1 ? 's' : ''} with 2+ resources`,
      ],
    };
  }

  // 4. healthy: 大部分 unit 有资源(>= 2)
  return {
    state: 'healthy',
    reasons: [
      `${unitsWithMultipleResources} unit${unitsWithMultipleResources > 1 ? 's' : ''} with 2+ resources`,
      `${resourceTotal} total resources across ${unitTotal} unit${unitTotal > 1 ? 's' : ''}`,
    ],
  };
};

/**
 * 获取所有 catalog 的统计信息
 * 返回每个 catalog 的聚合信息（包含质量状态）
 * 
 * 注意：使用 LEFT JOIN 以包含所有 catalog（包括没有资源的，用于 empty 状态）
 */
export const getCatalogStatistics = async () => {
  const statement = `
    SELECT 
      c.id as catalog_id,
      c.subject,
      c.grade,
      c.volume,
      c.textbook_version,
      c.education_level,
      COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as resource_total,
      COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.unit END) as unit_total,
      COUNT(DISTINCT CASE WHEN r.status = 'approved' AND (r.unit IS NULL OR r.unit = '') THEN r.id END) as resource_pending_unit,
      MAX(CASE WHEN r.status = 'approved' THEN r.created_at END) as last_resource_created_at
    FROM textbook_catalog c
    LEFT JOIN resource_textbook_map m ON m.textbook_catalog_id = c.id
    LEFT JOIN resource r ON r.id = m.resource_id
    GROUP BY c.id, c.subject, c.grade, c.volume, c.textbook_version, c.education_level
    ORDER BY c.education_level, c.grade, c.subject, c.textbook_version, c.volume
  `;

  const [data] = await connection.promise().query(statement);
  const catalogs = data as any[];

  // 为每个 catalog 计算质量状态
  const catalogsWithQuality = await Promise.all(
    catalogs.map(async (catalog) => {
      const quality = await calculateCatalogQualityState(
        catalog.catalog_id,
        catalog.resource_total || 0,
        catalog.unit_total || 0,
        catalog.resource_pending_unit || 0,
      );
      return {
        ...catalog,
        quality_state: quality.state,
        quality_reason: quality.reasons,
      };
    }),
  );

  return catalogsWithQuality;
};

/**
 * 获取指定 catalog 下所有 unit 的统计信息
 * 返回该 catalog 下每个 unit 的统计
 */
export const getCatalogUnitStatistics = async (catalogId: number) => {
  const statement = `
    SELECT 
      r.unit,
      r.unit_index,
      COUNT(r.id) as resource_count,
      MAX(r.created_at) as last_resource_created_at
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
    GROUP BY r.unit, r.unit_index
    ORDER BY 
      CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
      r.unit_index ASC,
      r.unit ASC
  `;

  const [data] = await connection.promise().query(statement, [catalogId]);
  return data as any[];
};

/**
 * 获取指定 catalog 的详细信息（包含质量诊断）
 * 返回 catalog 基础信息、质量状态、unit 统计
 */
export const getCatalogQualityDiagnosis = async (catalogId: number) => {
  // 获取 catalog 基础信息
  const catalogStatement = `
    SELECT 
      c.id as catalog_id,
      c.subject,
      c.grade,
      c.volume,
      c.textbook_version,
      c.education_level
    FROM textbook_catalog c
    WHERE c.id = ?
  `;
  const [catalogData] = await connection.promise().query(catalogStatement, [catalogId]);
  
  if (!catalogData || (catalogData as any[]).length === 0) {
    return null;
  }

  const catalog = (catalogData as any[])[0];

  // 获取统计信息
  const statsStatement = `
    SELECT 
      COUNT(DISTINCT r.id) as resource_total,
      COUNT(DISTINCT r.unit) as unit_total,
      COUNT(DISTINCT CASE WHEN r.unit IS NULL OR r.unit = '' THEN r.id END) as resource_pending_unit,
      MAX(r.created_at) as last_resource_created_at
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
  `;
  const [statsData] = await connection.promise().query(statsStatement, [catalogId]);
  const stats = (statsData as any[])[0];

  // 计算质量状态
  const quality = await calculateCatalogQualityState(
    catalogId,
    stats.resource_total || 0,
    stats.unit_total || 0,
    stats.resource_pending_unit || 0,
  );

  // 获取 unit 统计
  const unitStatistics = await getCatalogUnitStatistics(catalogId);

  return {
    ...catalog,
    resource_total: stats.resource_total || 0,
    unit_total: stats.unit_total || 0,
    resource_pending_unit: stats.resource_pending_unit || 0,
    last_resource_created_at: stats.last_resource_created_at,
    quality_state: quality.state,
    quality_reason: quality.reasons,
    unit_statistics: unitStatistics,
  };
};

