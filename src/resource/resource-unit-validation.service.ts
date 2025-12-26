/**
 * 资源单元字段校验服务
 */
import { connection } from '../app/database/mysql';

/**
 * 检查资源是否已绑定 catalog
 */
export const isResourceBoundToCatalog = async (resourceId: number): Promise<boolean> => {
  const statement = `
    SELECT COUNT(*) as count
    FROM resource_textbook_map
    WHERE resource_id = ?
  `;
  const [data]: any = await connection.promise().query(statement, [resourceId]);
  return data[0]?.count > 0;
};

/**
 * 获取未填写 unit 的资源列表
 */
export const getResourcesMissingUnit = async () => {
  const statement = `
    SELECT 
      id,
      title,
      subject,
      grade,
      textbook,
      chapter_info,
      unit,
      unit_index,
      status,
      user_id,
      created_at
    FROM resource
    WHERE (unit IS NULL OR unit = '')
      AND status = 'approved'
    ORDER BY created_at DESC
  `;

  const [data] = await connection.promise().query(statement);
  return data as any[];
};

/**
 * 批量设置资源的 unit 和 unit_index
 */
export const batchSetResourceUnit = async (
  resourceIds: number[],
  unit: string,
  unitIndex: number | null,
) => {
  if (!resourceIds || resourceIds.length === 0) {
    throw new Error('RESOURCE_IDS_REQUIRED');
  }
  if (!unit || unit.trim() === '') {
    throw new Error('UNIT_REQUIRED');
  }

  const statement = `
    UPDATE resource
    SET unit = ?, unit_index = ?
    WHERE id IN (?)
  `;

  await connection.promise().query(statement, [unit, unitIndex, resourceIds]);

  return {
    success: true,
    updatedCount: resourceIds.length,
  };
};
