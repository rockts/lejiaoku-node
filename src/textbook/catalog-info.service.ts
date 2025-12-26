/**
 * Catalog Info 服务
 * 提供教材目录页专用的 catalog_info 信息
 * 
 * 【系统级不变量】Catalog Info 规则：
 * 1. catalog_info 不允许存表，只允许由查询 + 统计派生
 * 2. catalog_info = 用于前端"教材目录页"的只读信息
 * 3. 所有字段必须能用现有数据直接查出
 * 4. 不引入"未来扩展字段"
 * 
 * 【教材目录页行为态规则】：
 * - view_state 基于 action_type，前端只关心三种状态：add_resources, organize_units, no_action
 * - action_hint 提供一句话行为提示
 * - unit_state 定义 Unit 级别的健康度：empty | healthy | sparse
 */

import { connection } from '../app/database/mysql';
import {
  calculateCatalogQualityState,
  calculateCatalogAction,
  CatalogQualityState,
  CatalogActionType,
} from './catalog-statistics.service';

/**
 * 教材目录页行为态类型
 * 前端只关心三种状态：add_resources, organize_units, no_action
 */
export type CatalogViewState = 'add_resources' | 'organize_units' | 'no_action';

/**
 * Unit 健康度类型
 */
export type UnitState = 'empty' | 'sparse' | 'healthy';

/**
 * 将 action_type 转换为 view_state
 * 前端只关心三种状态：add_resources, organize_units, no_action
 */
const convertActionTypeToViewState = (actionType: CatalogActionType): CatalogViewState => {
  if (actionType === 'add_resources' || actionType === 'prioritize_upload') {
    return 'add_resources';
  }
  if (actionType === 'organize_units') {
    return 'organize_units';
  }
  return 'no_action';
};

/**
 * 生成行为提示（一句话）
 */
const generateActionHint = (
  viewState: CatalogViewState,
  resourceTotal: number,
  unitTotal: number,
): string => {
  switch (viewState) {
    case 'add_resources':
      if (resourceTotal === 0) {
        return '该教材暂无资源，建议优先补充内容';
      }
      return '该教材资源密度不足，建议补充更多资源';
    case 'organize_units':
      return '该教材有资源但缺少单元信息，建议整理单元';
    case 'no_action':
      return '该教材内容充足，无需行动';
    default:
      return '';
  }
};

/**
 * 获取 Catalog 基本信息（用于教材目录页）
 * 
 * 返回结构：
 * - catalog_id
 * - subject
 * - grade
 * - volume
 * - textbook_version
 * - education_level
 * - unit_total
 * - resource_total
 * - quality_state
 * - action_type
 */
export const getCatalogInfo = async (catalogId: number) => {
  // 1. 获取 catalog 基础信息
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

  // 2. 获取统计信息（只统计已审核资源）
  const statsStatement = `
    SELECT 
      COUNT(DISTINCT r.id) as resource_total,
      COUNT(DISTINCT r.unit) as unit_total
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
  `;
  const [statsData] = await connection.promise().query(statsStatement, [catalogId]);
  const stats = (statsData as any[])[0];

  const resourceTotal = stats.resource_total || 0;
  const unitTotal = stats.unit_total || 0;
  const resourcePendingUnit = 0; // 对于用户端，不显示 pending unit 数量

  // 3. 计算质量状态
  const quality = await calculateCatalogQualityState(
    catalogId,
    resourceTotal,
    unitTotal,
    resourcePendingUnit,
  );

  // 4. 计算行动建议
  const action = await calculateCatalogAction(
    catalogId,
    quality.state,
    quality.reasons,
  );

  // 5. 计算 view_state 和 action_hint
  const viewState = convertActionTypeToViewState(action.action_type);
  const actionHint = generateActionHint(viewState, resourceTotal, unitTotal);

  // 6. 组装 catalog_info
  return {
    catalog_id: catalog.catalog_id,
    subject: catalog.subject,
    grade: catalog.grade,
    volume: catalog.volume,
    textbook_version: catalog.textbook_version,
    education_level: catalog.education_level,
    unit_total: unitTotal,
    resource_total: resourceTotal,
    quality_state: quality.state,
    action_type: action.action_type,
    view_state: viewState, // 教材目录页行为态（前端可直接使用）
    action_hint: actionHint, // 行为提示（一句话）
  };
};

/**
 * 计算 Unit 健康度
 * 
 * 规则：
 * - empty: resource_count = 0
 * - sparse: resource_count = 1
 * - healthy: resource_count >= 2
 */
const calculateUnitState = (resourceCount: number): UnitState => {
  if (resourceCount === 0) {
    return 'empty';
  }
  if (resourceCount === 1) {
    return 'sparse';
  }
  return 'healthy';
};

/**
 * 获取 Catalog 下的 Unit 列表（用于教材目录页）
 * 
 * 返回结构：
 * - unit (unit 名称)
 * - unit_index (unit 序号)
 * - resource_count (该 unit 下的资源数量)
 * - unit_state (Unit 健康度：empty | sparse | healthy)
 */
export const getCatalogUnits = async (catalogId: number) => {
  const statement = `
    SELECT 
      r.unit,
      r.unit_index,
      COUNT(r.id) as resource_count
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
      AND r.unit IS NOT NULL
      AND r.unit != ''
    GROUP BY r.unit, r.unit_index
    ORDER BY 
      CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
      r.unit_index ASC,
      r.unit ASC
  `;

  const [data] = await connection.promise().query(statement, [catalogId]);
  const units = data as any[];

  // 为每个 unit 派生 unit_state
  return units.map((unit: any) => ({
    ...unit,
    unit_state: calculateUnitState(unit.resource_count || 0),
  }));
};

