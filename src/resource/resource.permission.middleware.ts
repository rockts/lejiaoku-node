/**
 * 资源权限控制中间件
 * 用于验证用户是否有权限操作特定资源
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceByIdForAdmin } from './resource.service';

/**
 * 资源权限守卫
 * 检查用户是否有权限修改或删除资源
 * - 创建者可以操作自己创建的资源
 * - admin 可以操作所有资源
 * 
 * 使用方式：
 * router.put('/resources/:id', authGuard, resourcePermissionGuard, updateController);
 * router.delete('/resources/:id', authGuard, resourcePermissionGuard, deleteController);
 */
export const resourcePermissionGuard = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 1. 检查用户是否已认证（应该已经通过 authGuard）
    if (!request.user || !request.user.id) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    const userId = request.user.id;
    const userRole = (request.user as any).role || 'user';
    const { id } = request.params;
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return response.status(400).json({
        success: false,
        message: '无效的资源ID',
        error: 'INVALID_RESOURCE_ID',
      });
    }

    // 2. 获取资源信息
    let resource;
    try {
      resource = await getResourceByIdForAdmin(resourceId);
    } catch (error) {
      if ((error as any).message === 'NOT_FOUND') {
        return response.status(404).json({
          success: false,
          message: '资源不存在',
          error: 'RESOURCE_NOT_FOUND',
        });
      }
      throw error;
    }

    // 3. 检查权限
    // admin 可以操作所有资源
    if (userRole === 'admin') {
      return next();
    }

    // 创建者可以操作自己创建的资源
    if (resource.user_id === userId) {
      return next();
    }

    // 权限不足
    return response.status(403).json({
      success: false,
      message: '无权操作此资源',
      error: 'FORBIDDEN',
    });
  } catch (error) {
    console.error('资源权限验证失败:', error);
    next(error);
  }
};

