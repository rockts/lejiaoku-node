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
 * 将学段从英文转换为中文（用于前端显示）
 * 例如："elementary" -> "小学", "middle" -> "初中"
 * 如果已经是中文，直接返回
 */
const convertEducationLevelToChinese = (educationLevel: string): string => {
  if (!educationLevel) {
    return educationLevel;
  }
  
  const levelMap: { [key: string]: string } = {
    'elementary': '小学',
    'middle': '初中',
    '小学': '小学',
    '初中': '初中',
  };
  
  // 转换为小写后查找
  const normalized = educationLevel.trim().toLowerCase();
  const mapped = levelMap[educationLevel] || levelMap[normalized];
  
  if (mapped) {
    return mapped;
  }
  
  // 如果无法转换，返回原值
  return educationLevel;
};

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

  // 2. 获取统计信息（只统计已审核资源，且 unit 不为空）
  // 【修复】统计口径与单元列表保持一致：只统计 unit 不为空且不为空字符串的资源
  const statsStatement = `
    SELECT 
      COUNT(DISTINCT r.id) as resource_total,
      COUNT(DISTINCT r.unit) as unit_total
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
      AND r.unit IS NOT NULL
      AND r.unit != ''
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
    education_level: convertEducationLevelToChinese(catalog.education_level), // 转换为中文显示
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
  // 【彻底修复】相同名称的单元应该合并，处理以下问题：
  // 1. 只按 unit 分组，不按 unit_index 分组
  // 2. 规范化 unit 字段：去除首尾空格，将多个连续空格合并为一个空格
  // 3. 对于 unit_index，取最小的非空值
  const statement = `
    SELECT 
      TRIM(REGEXP_REPLACE(r.unit, ' +', ' ')) as unit,
      MIN(CASE WHEN r.unit_index IS NOT NULL THEN r.unit_index END) as unit_index,
      COUNT(r.id) as resource_count
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    WHERE m.textbook_catalog_id = ?
      AND r.status = 'approved'
      AND r.unit IS NOT NULL
      AND r.unit != ''
    GROUP BY TRIM(REGEXP_REPLACE(r.unit, ' +', ' '))
    ORDER BY 
      CASE WHEN MIN(CASE WHEN r.unit_index IS NOT NULL THEN r.unit_index END) IS NULL THEN 1 ELSE 0 END,
      MIN(CASE WHEN r.unit_index IS NOT NULL THEN r.unit_index END) ASC,
      TRIM(REGEXP_REPLACE(r.unit, ' +', ' ')) ASC
  `;

  const [data] = await connection.promise().query(statement, [catalogId]);
  const units = data as any[];

  // 【双重保障】在应用层再次规范化 unit 字段，确保完全一致
  // 规范化规则：去除首尾空格，将多个连续空格合并为一个空格
  const normalizeUnit = (unit: string): string => {
    if (!unit || typeof unit !== 'string') return unit;
    return unit.trim().replace(/\s+/g, ' ');
  };

  // 为每个 unit 派生 unit_state，并确保 unit 字段已规范化
  const normalizedUnits = units.map((unit: any) => ({
    ...unit,
    unit: normalizeUnit(unit.unit), // 确保 unit 字段已规范化
    unit_state: calculateUnitState(unit.resource_count || 0),
  }));

  // 【最终去重】如果规范化后仍有重复，再次合并（双重保障）
  const unitMap = new Map<string, any>();
  for (const unit of normalizedUnits) {
    const normalizedUnitName = normalizeUnit(unit.unit);
    if (unitMap.has(normalizedUnitName)) {
      const existing = unitMap.get(normalizedUnitName);
      existing.resource_count += unit.resource_count;
      // 如果 existing 的 unit_index 为空，使用新的 unit_index
      if (!existing.unit_index && unit.unit_index) {
        existing.unit_index = unit.unit_index;
      }
      // 如果新的 unit_index 更小，使用更小的
      if (unit.unit_index && (!existing.unit_index || unit.unit_index < existing.unit_index)) {
        existing.unit_index = unit.unit_index;
      }
    } else {
      unitMap.set(normalizedUnitName, { ...unit, unit: normalizedUnitName });
    }
  }

  // 转换为数组并排序
  const finalUnits = Array.from(unitMap.values()).sort((a, b) => {
    // 先按 unit_index 排序（null 放最后）
    if (a.unit_index === null && b.unit_index !== null) return 1;
    if (a.unit_index !== null && b.unit_index === null) return -1;
    if (a.unit_index !== null && b.unit_index !== null) {
      if (a.unit_index !== b.unit_index) return a.unit_index - b.unit_index;
    }
    // 再按 unit 名称排序
    return a.unit.localeCompare(b.unit, 'zh-CN');
  });

  return finalUnits;
};

