/**
 * 管理员资源管理接口
 * 仅 admin 可以调用
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceByIdForAdmin } from './resource.service';
import { connection } from '../app/database/mysql';

/**
 * 获取资源列表（管理员接口）
 * GET /api/admin/resources
 * 权限：仅 admin
 * 支持查询参数：
 * - status: pending | approved | rejected
 * - uploader_id: 上传者ID
 */
export const getResourceList = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { status, uploader_id } = request.query;

    // 构建查询条件
    let whereConditions: string[] = [];
    const params: any[] = [];

    // status 过滤
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (validStatuses.includes(status as string)) {
        whereConditions.push('resource.status = ?');
        params.push(status);
      }
    }

    // uploader_id 过滤
    if (uploader_id) {
      const uploaderId = parseInt(uploader_id as string, 10);
      if (!isNaN(uploaderId)) {
        whereConditions.push('resource.user_id = ?');
        params.push(uploaderId);
      }
    }

    // 构建 WHERE 子句
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 查询资源列表
    const statement = `
      SELECT 
        id,
        title,
        status,
        user_id as uploader_id,
        created_at
      FROM resource
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const [data] = await connection.promise().query(statement, params);

    response.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('获取资源列表失败:', error);
    next(error);
  }
};

/**
 * 审核资源状态（管理员接口）
 * PATCH /api/admin/resources/:id/status
 * 权限：仅 admin
 */
export const updateResourceStatusByAdmin = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const { status } = request.body;
    const resourceId = parseInt(id, 10);
    const reviewerId = request.user?.id;

    if (isNaN(resourceId)) {
      return response.status(400).json({
        success: false,
        message: '无效的资源ID',
        error: 'INVALID_RESOURCE_ID',
      });
    }

    // 验证 status 值（只允许 approved 或 rejected）
    if (status !== 'approved' && status !== 'rejected') {
      return response.status(400).json({
        success: false,
        message: '无效的状态值，只允许 approved 或 rejected',
        error: 'INVALID_STATUS',
      });
    }

    // 检查资源是否存在
    const resource: any = await getResourceByIdForAdmin(resourceId);
    if (!resource) {
      return response.status(404).json({
        success: false,
        message: '资源不存在',
        error: 'RESOURCE_NOT_FOUND',
      });
    }

    // 验证资源当前状态：必须是 pending 才能审核
    if (resource.status !== 'pending') {
      return response.status(400).json({
        success: false,
        message: `资源当前状态为 ${resource.status}，只有 pending 状态的资源可以审核`,
        error: 'RESOURCE_NOT_PENDING',
        current_status: resource.status,
      });
    }

    // 更新资源状态（包含审核人信息）
    // 尝试更新 reviewed_by 和 reviewed_at 字段（如果存在）
    let statement: string;
    let params: any[];

    try {
      // 尝试使用 reviewed_by 和 reviewed_at 字段
      statement = `
        UPDATE resource
        SET 
          status = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [status, reviewerId, resourceId];
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

    // 获取更新后的资源信息
    const updatedResource: any = await getResourceByIdForAdmin(resourceId);

    // 返回更新后的资源信息
    response.json({
      success: true,
      message: `资源已${status === 'approved' ? '通过' : '拒绝'}审核`,
      data: updatedResource,
    });
  } catch (error) {
    console.error('审核资源失败:', error);
    next(error);
  }
};

