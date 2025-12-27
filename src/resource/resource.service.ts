/**
 * 【系统级不变量】教材单元体系规则
 * 
 * 1. 「教材单元」唯一合法来源：resource.unit
 *    - Unit 不是 Tag，不是文本推断结果
 *    - 禁止任何基于 chapter_info / auto_meta_result.structure 的推断
 *    - 禁止任何 LIKE / JSON 搜索推断单元
 * 
 * 2. Catalog + Unit 是资源筛选的**最小稳定组合**
 *    - 筛选时：Catalog → Unit → Resource 路径不依赖任何历史字段
 *    - 如果同时传了 catalog_id 和 unit，必须同时满足，任一缺失 → 不返回数据
 * 
 * 3. 教材单元完整性硬约束
 *    - 凡是已绑定 catalog 的资源，resource.unit 必须非空
 *    - 在资源创建、编辑、绑定 catalog 时强制校验
 * 
 * 4. Catalog → Unit 结构稳定性保证
 *    - Catalog 章节页展示的 Unit 只能来源于两处之一：
 *      a. catalog 自身结构（优先）
 *      b. 已绑定资源的 resource.unit（兜底）
 *    - 禁止任何基于 chapter_info / auto_meta_result.structure 的前端或后端推断
 *    - 若 catalog 无结构、且无资源 unit，明确返回"该教材暂无可用单元结构"
 */

import { connection } from '../app/database/mysql';
import { ResourceModel } from './resource.model';

/**
 * 获取资源列表
 */
/**
 * 【搜索系统规范】排序规则标准化
 * 
 * 排序策略（按搜索模式）：
 * 1. catalog + unit 场景：ORDER BY unit_index ASC, created_at DESC
 * 2. catalog 场景：ORDER BY unit_index ASC, created_at DESC
 * 3. keyword 场景：ORDER BY relevance DESC, created_at DESC（relevance 用简单 LIKE 命中数模拟）
 * 4. 普通列表：ORDER BY created_at DESC
 */
export const getResourceList = async (options: {
  filter?: { 
    name: string; 
    sql: string; 
    params: Array<any>; 
    catalogFilters?: any; 
    unit?: string;
    keyword?: string;
    searchMode?: 'catalog_unit' | 'catalog' | 'keyword' | 'default';
  };
  pagination: { limit: number; offset: number };
}) => {
  const { filter, pagination } = options;

  // 检查是否需要使用 catalog JOIN（教材筛选）
  const useCatalogJoin = filter && filter.name === 'catalogFilter' && filter.catalogFilters;

  let baseSql = '';
  let baseParams: Array<any> = [];

  if (filter && filter.name === 'adminFilter') {
    // 管理员过滤器，显示所有状态的资源，但仍排除视频
    baseSql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
    baseParams = [...filter.params];
  } else if (filter && filter.name === 'myResourcesFilter') {
    // 我的资源过滤器，显示用户所有资源，不区分状态，但仍排除视频
    baseSql = `resource.user_id = ? AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    baseParams = [...filter.params];
  } else if (filter && filter.sql) {
    // 其他自定义过滤器（包括 catalogFilter 的基础条件）
    baseSql = filter.sql;
    baseParams = [...filter.params];
  } else {
    // 默认：只显示已审核的资源，且排除视频资源
    baseSql = 'resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  }

  let statement: string;
  let queryParams: Array<any>;

  if (useCatalogJoin) {
    // 使用 JOIN 结构，基于 catalog 表筛选
    const catalogFilters = filter.catalogFilters;
    const catalogConditions: string[] = [];
    const catalogParams: Array<any> = [];

    // 调试日志
    console.log('🔍 [资源查询] 使用 catalogFilter:');
    console.log('  catalogFilters:', JSON.stringify(catalogFilters, null, 2));
    console.log('  baseSql:', baseSql);
    console.log('  baseParams:', baseParams);

    // 构建 catalog 筛选条件
    if (catalogFilters.catalog_id) {
      catalogConditions.push('c.id = ?');
      // catalog_id 可能是字符串，需要转换为数字
      const catalogIdNum = parseInt(String(catalogFilters.catalog_id), 10);
      catalogParams.push(isNaN(catalogIdNum) ? catalogFilters.catalog_id : catalogIdNum);
      console.log('  ✅ 添加 catalog_id 条件:', catalogIdNum);
    } else {
      // 如果没有 catalog_id，使用组合参数
      if (catalogFilters.subject) {
        catalogConditions.push('c.subject = ?');
        catalogParams.push(catalogFilters.subject);
      }
      if (catalogFilters.grade) {
        catalogConditions.push('c.grade = ?');
        catalogParams.push(catalogFilters.grade);
      }
      if (catalogFilters.volume) {
        catalogConditions.push('c.volume = ?');
        catalogParams.push(catalogFilters.volume);
      }
      if (catalogFilters.textbook_version) {
        catalogConditions.push('c.textbook_version = ?');
        catalogParams.push(catalogFilters.textbook_version);
      }
    }

    // 构建完整的 WHERE 条件
    // 注意：在 JOIN 查询中，需要将 baseSql 中的 resource. 替换为 r.
    let whereClause = baseSql.replace(/resource\./g, 'r.');
    if (catalogConditions.length > 0) {
      whereClause += ` AND ${catalogConditions.join(' AND ')}`;
    }

    // 如果同时有 catalog 和 unit 筛选，必须同时满足
    if (filter.unit) {
      whereClause += ' AND r.unit = ?';
      catalogParams.push(filter.unit);
    }

    // 调试日志
    console.log('🔍 [资源查询] catalogFilter SQL 构建:');
    console.log('  whereClause:', whereClause);
    console.log('  catalogParams:', catalogParams);
    console.log('  baseParams:', baseParams);
    console.log('  final queryParams:', [...baseParams, ...catalogParams, pagination.limit, pagination.offset]);

    // 【搜索系统规范】排序规则：catalog + unit 或 catalog 场景
    // ORDER BY unit_index ASC, created_at DESC
    const orderBy = filter.unit 
      ? 'r.unit_index ASC, r.created_at DESC'  // catalog + unit 场景
      : 'r.unit_index ASC, r.created_at DESC'; // catalog 场景（即使没有 unit，也按 unit_index 排序）

    statement = `
      SELECT DISTINCT
        r.id,
        r.title,
        r.description,
        r.category,
        r.subject,
        r.grade,
        r.textbook,
        r.chapter_info,
        r.unit,
        r.unit_index,
        r.file_format,
        r.file_url,
        r.cover_url,
        r.download_count,
        r.status,
        r.user_id,
        r.auto_meta_status,
        r.auto_meta_result,
        r.created_at,
        r.updated_at
      FROM resource r
      INNER JOIN resource_textbook_map m ON m.resource_id = r.id
      INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ?
      OFFSET ?
    `;

    queryParams = [...baseParams, ...catalogParams, pagination.limit, pagination.offset];
    
    // 调试日志：打印最终 SQL
    console.log('  📝 最终 SQL:', statement.replace(/\s+/g, ' ').trim());
    console.log('  📝 查询参数:', queryParams);
  } else if (filter && filter.name === 'keyword') {
    // 【搜索系统规范】keyword 场景
    // 排序规则：ORDER BY relevance DESC, created_at DESC
    // relevance 用简单 LIKE 命中数模拟（title 命中权重更高）
    const keyword = filter.keyword || '';
    const keywordPattern = `%${keyword}%`;
    
    statement = `
      SELECT
        resource.id,
        resource.title,
        resource.description,
        resource.category,
        resource.subject,
        resource.grade,
        resource.textbook,
        resource.chapter_info,
        resource.unit,
        resource.unit_index,
        resource.file_format,
        resource.file_url,
        resource.cover_url,
        resource.download_count,
        resource.status,
        resource.user_id,
        resource.auto_meta_status,
        resource.auto_meta_result,
        resource.created_at,
        resource.updated_at,
        (
          CASE 
            WHEN resource.title LIKE ? THEN 2
            WHEN resource.description LIKE ? THEN 1
            ELSE 0
          END
        ) as relevance
      FROM resource
      WHERE ${baseSql}
      ORDER BY relevance DESC, resource.created_at DESC
      LIMIT ?
      OFFSET ?
    `;

    queryParams = [...baseParams, keywordPattern, keywordPattern, pagination.limit, pagination.offset];
  } else {
    // 【搜索系统规范】普通列表场景
    // 排序规则：ORDER BY created_at DESC
    // 注意：unit 筛选已经在 middleware 中添加到 baseSql 中
    statement = `
      SELECT
        resource.id,
        resource.title,
        resource.description,
        resource.category,
        resource.subject,
        resource.grade,
        resource.textbook,
        resource.chapter_info,
        resource.unit,
        resource.unit_index,
        resource.file_format,
        resource.file_url,
        resource.cover_url,
        resource.download_count,
        resource.status,
        resource.user_id,
        resource.auto_meta_status,
        resource.auto_meta_result,
        resource.created_at,
        resource.updated_at
      FROM resource
      WHERE ${baseSql}
      ORDER BY resource.created_at DESC
      LIMIT ?
      OFFSET ?
    `;

    queryParams = [...baseParams, pagination.limit, pagination.offset];
  }

  const [data] = await connection
    .promise()
    .query(statement, queryParams);

  // 调试日志：查询结果
  if (useCatalogJoin) {
    console.log('  📊 查询结果数量:', Array.isArray(data) ? data.length : 0);
    if (Array.isArray(data) && data.length > 0) {
      console.log('  ✅ 找到资源:', data.map((r: any) => ({ id: r.id, title: r.title, unit: r.unit, status: r.status })));
    } else {
      console.log('  ⚠️  未找到资源，可能原因：');
      console.log('    1. 资源未绑定到该 catalog');
      console.log('    2. 资源状态不符合查询条件');
      console.log('    3. JOIN 条件不匹配');
    }
  }

  return data;
};

/**
 * 获取资源总数
 */
export const getResourceTotalCount = async (options: {
  filter?: { 
    name: string; 
    sql: string; 
    params: Array<any>; 
    catalogFilters?: any; 
    unit?: string;
    keyword?: string;
    searchMode?: 'catalog_unit' | 'catalog' | 'keyword' | 'default';
  };
}) => {
  const { filter } = options;

  // 检查是否需要使用 catalog JOIN（教材筛选）
  const useCatalogJoin = filter && filter.name === 'catalogFilter' && filter.catalogFilters;

  let baseSql = '';
  let baseParams: Array<any> = [];

  if (filter && filter.name === 'adminFilter') {
    // 管理员过滤器，显示所有状态的资源，但仍排除视频
    baseSql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
    baseParams = [...filter.params];
  } else if (filter && filter.name === 'myResourcesFilter') {
    // 我的资源过滤器，显示用户所有资源，不区分状态，但仍排除视频
    baseSql = `resource.user_id = ? AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    baseParams = [...filter.params];
  } else if (filter && filter.sql) {
    // 其他自定义过滤器（包括 catalogFilter 的基础条件）
    baseSql = filter.sql;
    baseParams = [...filter.params];
  } else {
    // 默认：只显示已审核的资源，且排除视频资源
    baseSql = 'resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  }

  let statement: string;
  let queryParams: Array<any>;

  if (useCatalogJoin) {
    // 使用 JOIN 结构，基于 catalog 表筛选
    const catalogFilters = filter.catalogFilters;
    const catalogConditions: string[] = [];
    const catalogParams: Array<any> = [];

    // 构建 catalog 筛选条件
    if (catalogFilters.subject) {
      catalogConditions.push('c.subject = ?');
      catalogParams.push(catalogFilters.subject);
    }
    if (catalogFilters.grade) {
      catalogConditions.push('c.grade = ?');
      catalogParams.push(catalogFilters.grade);
    }
    if (catalogFilters.volume) {
      catalogConditions.push('c.volume = ?');
      catalogParams.push(catalogFilters.volume);
    }
    if (catalogFilters.textbook_version) {
      catalogConditions.push('c.textbook_version = ?');
      catalogParams.push(catalogFilters.textbook_version);
    }

    // 构建完整的 WHERE 条件
    // 注意：在 JOIN 查询中，需要将 baseSql 中的 resource. 替换为 r.
    let whereClause = baseSql.replace(/resource\./g, 'r.');
    if (catalogConditions.length > 0) {
      whereClause += ` AND ${catalogConditions.join(' AND ')}`;
    }

    // 如果同时有 catalog 和 unit 筛选，必须同时满足
    if (filter.unit) {
      whereClause += ' AND r.unit = ?';
      catalogParams.push(filter.unit);
    }

    statement = `
      SELECT COUNT(DISTINCT r.id) as total
      FROM resource r
      INNER JOIN resource_textbook_map m ON m.resource_id = r.id
      INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
      WHERE ${whereClause}
    `;

    queryParams = [...baseParams, ...catalogParams];
  } else {
    // 普通查询，不使用 JOIN
    statement = `
      SELECT COUNT(*) as total
      FROM resource
      WHERE ${baseSql}
    `;

    queryParams = baseParams;
  }

  const [data] = await connection.promise().query(statement, queryParams);

  return (data as any)[0].total;
};

/**
 * 根据 ID 获取资源（仅已审核）
 * 
 * 返回字段说明（已冻结，6个月内不破坏性变更）：
 * - 必须字段：id, title, category, file_url, file_format
 * - 可选字段：description, subject, grade, textbook, chapter_info, cover_url
 * - AI字段：auto_meta_status, auto_meta_result（只读）
 * - 系统字段：download_count, created_at, updated_at
 * 
 * 注意：status 字段不返回（因为只查询已审核资源）
 * 
 * 详细接口规范请参考：docs/api/resource-detail-api-standard.md
 */
export const getResourceById = async (resourceId: number) => {
  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.chapter_info,
      resource.unit,
      resource.unit_index,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.user_id,
      resource.auto_meta_status,
      resource.auto_meta_result,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE resource.id = ? AND resource.status = "approved"
  `;
  const [data] = await connection.promise().query(statement, resourceId);
  if (!data || !data[0] || !data[0].id) {
    throw new Error('NOT_FOUND');
  }
  return data[0];
};

/**
 * 根据 ID 获取资源（管理员，不限制状态）
 */
export const getResourceByIdForAdmin = async (resourceId: number) => {
  // 尝试查询 reviewed_by 和 reviewed_at 字段（如果存在）
  // 如果字段不存在，SQL 会报错，需要捕获并回退到不查询这些字段
  let statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.chapter_info,
      resource.unit,
      resource.unit_index,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.status,
      resource.user_id,
      resource.reviewed_by,
      resource.reviewed_at,
      resource.auto_meta_status,
      resource.auto_meta_result,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE resource.id = ?
  `;

  try {
    const [data] = await connection.promise().query(statement, resourceId);
    if (!data || !data[0] || !data[0].id) {
      throw new Error('NOT_FOUND');
    }
    return data[0];
  } catch (error) {
    // 如果字段不存在，回退到不查询这些字段
    if ((error as any).code === 'ER_BAD_FIELD_ERROR' && (error as any).message.includes('reviewed_by')) {
      statement = `
        SELECT
          resource.id,
          resource.title,
          resource.description,
          resource.category,
          resource.subject,
          resource.grade,
          resource.textbook,
          resource.chapter_info,
          resource.file_format,
          resource.file_url,
          resource.cover_url,
          resource.download_count,
          resource.status,
          resource.user_id,
          resource.auto_meta_status,
          resource.auto_meta_result,
          resource.created_at,
          resource.updated_at
        FROM resource
        WHERE resource.id = ?
      `;
      const [data] = await connection.promise().query(statement, resourceId);
      if (!data || !data[0] || !data[0].id) {
        throw new Error('NOT_FOUND');
      }
      return data[0];
    }
    throw error;
  }
};

/**
 * 创建资源
 */
export const createResource = async (resource: ResourceModel) => {
  const statement = `
    INSERT INTO resource
    SET ?
  `;

  const [data] = await connection.promise().query(statement, resource);
  return data as any;
};

/**
 * 更新资源状态（审核资源）
 * @param resourceId 资源ID
 * @param status 新状态（approved 或 rejected）
 * @param reviewedBy 审核人ID（可选，如果数据库有 reviewed_by 字段则使用）
 */
export const updateResourceStatus = async (
  resourceId: number,
  status: string,
  reviewedBy?: number,
) => {
  // 检查数据库是否有 reviewed_by 和 reviewed_at 字段
  // 如果有则更新，如果没有则只更新 status
  let statement: string;
  let params: any[];

  // 尝试使用 reviewed_by 和 reviewed_at（如果字段存在）
  // 注意：如果字段不存在，SQL 会报错，需要捕获并回退到只更新 status
  try {
    if (reviewedBy !== undefined) {
      statement = `
        UPDATE resource
        SET 
          status = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [status, reviewedBy, resourceId];
    } else {
      statement = `
        UPDATE resource
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [status, resourceId];
    }

    await connection.promise().query(statement, params);
  } catch (error) {
    // 如果字段不存在，回退到只更新 status
    if ((error as any).code === 'ER_BAD_FIELD_ERROR' && (error as any).message.includes('reviewed_by')) {
      statement = `
        UPDATE resource
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [status, resourceId];
      await connection.promise().query(statement, params);
    } else {
      throw error;
    }
  }
};

/**
 * 更新资源的自动解析结果
 */
export const updateResourceAutoParse = async (
  resourceId: number,
  autoMetaResult: object,
  chapterInfo: string,
) => {
  const statement = `
    UPDATE resource
    SET 
      auto_meta_result = ?,
      chapter_info = ?,
      auto_meta_status = 'done',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await connection.promise().query(statement, [
    JSON.stringify(autoMetaResult),
    chapterInfo,
    resourceId,
  ]);
};

/**
 * 更新资源信息
 * @param resourceId 资源ID
 * @param updates 要更新的字段（不包括 id, status, created_at, auto_meta_status, auto_meta_result）
 */
export const updateResource = async (
  resourceId: number,
  updates: Partial<ResourceModel>,
) => {
  // 构建更新字段（排除不允许直接更新的字段）
  const allowedFields = [
    'title',
    'category',
    'description',
    'subject',
    'grade',
    'textbook',
    'chapter_info',
    'cover_url',
    'file_url',
    'file_format',
  ];

  const updateFields: { [key: string]: any } = {};
  allowedFields.forEach(field => {
    if (updates.hasOwnProperty(field) && updates[field as keyof ResourceModel] !== undefined) {
      updateFields[field] = updates[field as keyof ResourceModel];
    }
  });

  // 如果没有要更新的字段，直接返回
  if (Object.keys(updateFields).length === 0) {
    return;
  }

  // 添加更新时间
  updateFields.updated_at = new Date();

  const statement = `
    UPDATE resource
    SET ?
    WHERE id = ?
  `;

  await connection.promise().query(statement, [updateFields, resourceId]);
};
