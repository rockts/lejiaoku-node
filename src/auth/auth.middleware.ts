import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userService from '../user/user.service';
import { PUBLIC_KEY } from '../app/app.config';
import { possess } from './auth.service';

/**
 * 验证用户登录数据
 * 支持 username 或 email 登录
 */
export const validateLoginData = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('👮‍♂️ 验证用户登录数据');

  // 准备数据
  const { username, email, password } = request.body;

  // 验证必填数据
  if (!password) return next(new Error('PASSWORD_IS_REQUIRED'));
  if (!username && !email) return next(new Error('USERNAME_OR_EMAIL_IS_REQUIRED'));

  // 根据 username 或 email 查找用户
  let user = null;
  if (username) {
    user = await userService.getUserByName(username, { password: true });
  } else if (email) {
    user = await userService.getUserByEmail(email, { password: true });
  }

  if (!user) return next(new Error('USER_DOES_NOT_EXIST'));

  // 验证用户密码
  const matched = await bcrypt.compare(password, user.password);
  if (!matched) return next(new Error('PASSWORD_DOES_NOT_MATCH'));

  // 在请求主体里添加用户
  request.body.user = user;

  // 下一步
  next();
};

/**
 * 验证用户身份
 * 检查请求头 Authorization 中的 JWT token，验证用户身份
 */
export const authGuard = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('👮🏼‍♀️ 验证用户身份');

  // 检查是否有用户信息（由 currentUser 中间件注入）
  if (!request.user || !request.user.id) {
    return response.status(401).json({
      success: false,
      message: '未授权，请先登录',
      error: 'UNAUTHORIZED',
    });
  }

  next();
};

/**
 * 当前用户
 * 从请求头 Authorization 中提取并验证 JWT token，将用户信息注入 request.user
 */
export const currentUser = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  let user = null;

  try {
    // 提取 Authorization header
    const authorization = request.header('Authorization');

    if (authorization) {
      // 提取 JWT 令牌（支持 "Bearer <token>" 格式）
      const token = authorization.replace(/^Bearer\s+/i, '');

      if (token) {
        // 验证令牌
        const decoded = jwt.verify(token, PUBLIC_KEY, {
          algorithms: ['RS256'],
        }) as any;

        // decoded 包含 payload，需要提取 user 信息
        user = {
          id: decoded.id || decoded.payload?.id,
          name: decoded.name || decoded.payload?.name,
          email: decoded.email || decoded.payload?.email,
          role: decoded.role || decoded.payload?.role || 'user',
        };
      }
    }
  } catch (error) {
    // token 无效或过期，user 保持为 null
    // 不抛出错误，让后续的 authGuard 处理
    console.log('Token 验证失败:', error instanceof Error ? error.message : error);
  }

  // 在请求里添加当前用户（可能为 null）
  request.user = user;

  next();
};


/**
 * 访问控制
 */
interface AccessControlOptions {
  possession?: boolean;
}

export const accessControl = (options: AccessControlOptions) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    console.log('👮‍♀️ 访问控制');

    // 解构选项
    const { possession } = options;

    // 当前用户 ID
    const { id: userId } = request.user;

    // 放行管理员
    if (userId == 1) return next();

    // 准备资源
    const libraryIdParam = Object.keys(request.params)[0];
    const libraryType = libraryIdParam.replace('Id', '');
    const libraryId = parseInt(request.params[libraryIdParam], 10);

    // 检查资源拥有权
    if (possession) {
      try {
        const ownLibrary = await possess({ libraryId, libraryType, userId });

        if (!ownLibrary) {
          return next(new Error('USER_DOES_NOT_OWN_RESOURCE'));
        }
      } catch (error) {
        return next(error);
      }
    }

    // 下一步
    next();
  };
};
