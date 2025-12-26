/**
 * Catalog Unit 搜索服务
 * 提供教材目录页点击 unit 后的资源搜索功能
 * 
 * 【系统级不变量】第一条被"定死"的教材搜索 SQL：
 * - 场景：用户在"教材目录页"点击某个 unit
 * - 搜索条件固定为：subject, grade, textbook_version, unit, status = approved
 * - 不做搜索 DSL，不做通用搜索
 * - SQL 必须基于：resource, resource_textbook_map, textbook_catalog
 */

import { connection } from '../app/database/mysql';

/**
 * 第一条被"定死"的教材搜索 SQL
 * 
 * 场景：用户在"教材目录页"点击某个 unit
 * 搜索条件固定为：
 * - subject
 * - grade
 * - textbook_version
 * - unit
 * - status = approved
 * 
 * 返回：该 unit 下的所有已审核资源
 */
export const searchResourcesByCatalogUnit = async (
  catalogId: number,
  unit: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) => {
  const limit = options?.limit || 30;
  const offset = options?.offset || 0;

  // 【第一条被"定死"的教材搜索 SQL】
  // 场景：用户在"教材目录页"点击某个 unit
  // 搜索条件固定为：subject, grade, textbook_version, unit, status = approved
  const statement = `
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
    WHERE 
      c.id = ?
      AND r.unit = ?
      AND r.status = 'approved'
      AND r.file_format NOT IN ('视频', 'VIDEO')
      AND r.category NOT IN ('视频')
    ORDER BY 
      CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
      r.unit_index ASC,
      r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [data] = await connection.promise().query(statement, [catalogId, unit, limit, offset]);
  return data as any[];
};

/**
 * 统计指定 catalog + unit 的资源总数
 */
export const countResourcesByCatalogUnit = async (
  catalogId: number,
  unit: string,
): Promise<number> => {
  const statement = `
    SELECT COUNT(DISTINCT r.id) as total
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
    WHERE 
      c.id = ?
      AND r.unit = ?
      AND r.status = 'approved'
      AND r.file_format NOT IN ('视频', 'VIDEO')
      AND r.category NOT IN ('视频')
  `;

  const [data] = await connection.promise().query(statement, [catalogId, unit]);
  const result = (data as any[])[0];
  return result?.total || 0;
};

