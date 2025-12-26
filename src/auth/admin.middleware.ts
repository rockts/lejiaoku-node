/**
 * 管理员权限守卫
 * 仅允许 admin 角色访问
 * 必须在 authGuard 之后使用
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 管理员权限守卫
 * 检查用户是否为 admin 角色
 * 如果不是 admin，返回 403 Forbidden
 */
export const adminGuard = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const uid = request.user?.id || 'anonymous';
  const userRole = (request.user as any)?.role || 'user';
  const path = request.path;

  console.log(`[AdminGuard] ${request.method} ${path} - UID: ${uid}, Role: ${userRole}`);

  // 检查用户是否为 admin
  if (userRole !== 'admin') {
    console.log(`[AdminGuard] 403 Forbidden - UID: ${uid}, Role: ${userRole}, Required: admin`);
    return response.status(403).json({
      success: false,
      message: '权限不足，仅管理员可访问',
      error: 'FORBIDDEN',
    });
  }

  next();
};


