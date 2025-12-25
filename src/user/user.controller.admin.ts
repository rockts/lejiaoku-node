/**
 * 管理员用户管理接口
 * 仅 admin 可以调用
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { UserModel } from './user.model';

/**
 * 修改用户角色
 * PATCH /api/admin/users/:id/role
 * 权限：仅 admin
 */
export const updateUserRole = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const { role } = request.body;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return response.status(400).json({
        success: false,
        message: '无效的用户ID',
        error: 'INVALID_USER_ID',
      });
    }

    // 验证角色值
    const validRoles = ['user', 'contributor', 'editor', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return response.status(400).json({
        success: false,
        message: `无效的角色值，只允许: ${validRoles.join(', ')}`,
        error: 'INVALID_ROLE',
      });
    }

    // 检查用户是否存在
    const existingUser = await userService.getUserById(userId);
    if (!existingUser) {
      return response.status(404).json({
        success: false,
        message: '用户不存在',
        error: 'USER_NOT_FOUND',
      });
    }

    // 更新用户角色
    const updateData: Partial<UserModel> = { role: role as any };
    await userService.updateUser(userId, updateData);

    // 获取更新后的用户信息
    const updatedUser = await userService.getUserById(userId);

    // 返回更新后的用户信息
    response.json({
      success: true,
      message: '用户角色更新成功',
      user: updatedUser,
    });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    next(error);
  }
};

