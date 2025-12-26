/**
 * Catalog 任务服务
 * 提供任务创建和查询功能
 * 
 * 【系统级不变量】Catalog 任务规则：
 * 1. 任务只用于"记录人要做什么"，不是系统状态
 * 2. 不做复杂校验
 * 3. 不引入 workflow / assign / claim
 * 4. 不影响现有 Catalog / Action / Quality 代码
 */

import { connection } from '../app/database/mysql';
import { CatalogTaskModel } from './task.model';

/**
 * 创建任务
 */
export const createTask = async (task: CatalogTaskModel) => {
  try {
    const statement = `
      INSERT INTO catalog_tasks (task_type, catalog_id, unit, created_by, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
    const [result] = await connection.promise().query(statement, [
      task.task_type,
      task.catalog_id,
      task.unit || null,
      task.created_by,
    ]);
    return result as any;
  } catch (error) {
    // 如果是表不存在的错误，提供更友好的错误信息
    const err = error as any;
    if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes('catalog_tasks')) {
      throw new Error('catalog_tasks 表不存在，请先执行数据库迁移脚本：scripts/create-catalog-tasks-table.sql');
    }
    throw error;
  }
};

/**
 * 获取当前用户的 pending 任务列表
 */
export const getMyPendingTasks = async (userId: number) => {
  try {
    const statement = `
      SELECT 
        t.id,
        t.task_type,
        t.catalog_id,
        t.unit,
        t.created_by,
        t.status,
        t.created_at,
        t.updated_at,
        c.subject,
        c.grade,
        c.volume,
        c.textbook_version
      FROM catalog_tasks t
      INNER JOIN textbook_catalog c ON c.id = t.catalog_id
      WHERE t.created_by = ?
        AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `;
    const [data] = await connection.promise().query(statement, [userId]);
    return data as any[];
  } catch (error) {
    // 如果是表不存在的错误，返回空数组而不是抛出错误
    const err = error as any;
    if (err.code === 'ER_NO_SUCH_TABLE' || err.message?.includes('catalog_tasks')) {
      console.warn('catalog_tasks 表不存在，返回空任务列表。请先执行数据库迁移脚本：scripts/create-catalog-tasks-table.sql');
      return [];
    }
    throw error;
  }
};

