/**
 * 用户注册接口
 * POST /api/register
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from '../user/user.service';
import * as userMiddleware from '../user/user.middleware';
import { signToken } from './auth.service';

/**
 * 注册用户
 * POST /api/register
 * 输入：username (或 name), password, role (可选，默认 user)
 * 返回：JWT token 和用户信息
 */
export const register = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 准备数据（从 validateUserData 和 hashPassword 中间件处理后）
    const { name, username, email, password, role = 'user' } = request.body;

    // 验证角色（只能是 user 或 admin）
    if (role && !['user', 'admin'].includes(role)) {
      return response.status(400).json({
        success: false,
        message: '角色只能是 user 或 admin',
        error: 'INVALID_ROLE',
      });
    }

    // 构建用户数据（使用 name 或 username）
    const userData = {
      name: name || username, // 兼容 name 和 username
      email,
      password, // 已经过 hashPassword 中间件加密
      role: role || 'user', // 默认角色为 user
    };

    // 创建用户
    const data: any = await userService.createUser(userData);
    const userId = data.insertId;

    // 获取新创建的用户信息
    const newUser = await userService.getUserById(userId);

    if (!newUser) {
      return next(new Error('USER_CREATE_FAILED'));
    }

    // 构建 token payload
    const payload = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: (newUser as any).role || 'user',
    };

    // 签发令牌
    const token = signToken({ payload });

    // 构建返回的用户信息（不包含密码）
    const user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: (newUser as any).role || 'user',
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      avatar: newUser.avatar,
    };

    // 返回响应
    response.status(201).send({
      success: true,
      message: '注册成功',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

