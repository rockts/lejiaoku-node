/**
 * 资源删除接口
 * DELETE /api/resources/:id
 */

import { Request, Response, NextFunction } from 'express';
import { connection } from '../app/database/mysql';
import { getResourceByIdForAdmin } from './resource.service';

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 权限：仅创建者或 admin 可删除
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return response.status(400).json({
        success: false,
        message: '无效的资源ID',
        error: 'INVALID_RESOURCE_ID',
      });
    }

    // 1. 获取资源信息（用于权限验证，已在 resourcePermissionGuard 中完成，这里作为双重检查）
    const existingResource: any = await getResourceByIdForAdmin(resourceId);
    if (!existingResource) {
      return response.status(404).json({
        success: false,
        message: '资源不存在',
        error: 'RESOURCE_NOT_FOUND',
      });
    }

    // 2. 权限验证（已在 resourcePermissionGuard 中完成，这里保留作为双重检查）
    // 删除权限规则：admin 可删除任何资源，user 不允许删除，contributor/editor 只能删除自己的资源
    const userId = request.user?.id;
    const userRole = (request.user as any)?.role || 'user';
    const isAdmin = userRole === 'admin';
    const isOwner = existingResource.user_id === userId;

    // user 角色不允许删除任何资源
    if (userRole === 'user') {
      return response.status(403).json({
        success: false,
        message: 'user 角色不允许删除资源',
        error: 'FORBIDDEN',
      });
    }

    // admin 可以删除任何资源
    if (isAdmin) {
      // 允许删除
    } else if (isOwner) {
      // contributor 和 editor 只能删除自己的资源
    } else {
      return response.status(403).json({
        success: false,
        message: '无权删除此资源',
        error: 'FORBIDDEN',
      });
    }

    // 3. 删除资源
    const statement = `
      DELETE FROM resource
      WHERE id = ?
    `;

    await connection.promise().query(statement, [resourceId]);

    // 4. 返回成功响应
    response.json({
      success: true,
      message: '资源删除成功',
      resource_id: resourceId,
    });
  } catch (error) {
    console.error('删除资源失败:', error);
    next(error);
  }
};

