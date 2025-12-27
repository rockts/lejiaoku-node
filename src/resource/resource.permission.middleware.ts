/**
 * 资源权限控制中间件
 * 用于验证用户是否有权限操作特定资源
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceByIdForAdmin } from './resource.service';

/**
 * 资源权限守卫
 * 检查用户是否有权限修改或删除资源
 * 
 * 权限规则：
 * - 编辑资源（PUT）：admin、editor 或资源所有者可以编辑
 * - 删除资源（DELETE）：admin 可删除任何资源，user/editor 只能删除自己的资源
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
        error: 'unauthorized',
        message: 'Unauthorized, please login first',
        success: false,
      });
    }

    const userId = request.user.id;
    const userRole = (request.user as any).role || 'user';
    const { id } = request.params;
    const resourceId = parseInt(id, 10);
    const method = request.method; // 获取 HTTP 方法

    console.log(`[ResourcePermissionGuard] ${method} /api/resources/${resourceId} - User ID: ${userId}, Role: ${userRole}`);

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
    // 确保类型一致（都转换为 number）
    const resourceUserId = Number(resource.user_id);
    const currentUserId = Number(userId);
    const isOwner = resourceUserId === currentUserId;
    console.log(`[ResourcePermissionGuard] Resource user_id: ${resource.user_id} (${typeof resource.user_id}), Current user_id: ${userId} (${typeof userId})`);
    console.log(`[ResourcePermissionGuard] Resource user_id (num): ${resourceUserId}, Current user_id (num): ${currentUserId}, isOwner: ${isOwner}`);

    // 编辑资源（PUT）权限规则：
    // - user 不允许编辑任何资源
    // - admin 可以编辑任何资源
    // - editor 可以编辑任何资源
    // - contributor 只能编辑自己上传的资源
    if (method === 'PUT') {
      // user 角色不允许编辑
      if (userRole === 'user') {
        return response.status(403).json({
          error: 'permission_denied',
          message: 'You do not have permission to perform this action',
          success: false,
        });
      }

      // admin 和 editor 可以编辑任何资源
      if (userRole === 'admin' || userRole === 'editor') {
        return next();
      }

      // contributor 只能编辑自己的资源
      if (userRole === 'contributor') {
        if (isOwner) {
          console.log(`[ResourcePermissionGuard] ✅ Contributor allowed to edit own resource`);
          return next();
        } else {
          // contributor 尝试编辑他人资源，拒绝
          console.log(`[ResourcePermissionGuard] ❌ Contributor denied: trying to edit resource owned by user ${resource.user_id}`);
          return response.status(403).json({
            error: 'permission_denied',
            message: 'You do not have permission to perform this action',
            success: false,
          });
        }
      }
    }

    // 删除资源（DELETE）权限规则：
    // - 仅 admin 可以删除资源
    // 注意：DELETE 路由已经使用 requireRole(['admin']) 进行了权限检查
    // 这里保留作为防御性检查
    if (method === 'DELETE') {
      // 仅 admin 可以删除资源
      if (userRole === 'admin') {
        return next();
      }

      // 其他角色不允许删除
      return response.status(403).json({
        error: 'permission_denied',
        message: 'You do not have permission to perform this action',
        success: false,
      });
    }

    // 权限不足
    return response.status(403).json({
      error: 'permission_denied',
      message: 'You do not have permission to perform this action',
      success: false,
    });
  } catch (error) {
    console.error('资源权限验证失败:', error);
    next(error);
  }
};

