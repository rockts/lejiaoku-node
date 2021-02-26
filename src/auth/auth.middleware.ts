import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userService from '../user/user.service';
import { PUBLIC_KEY } from '../app/app.config';
import { TokenPayload } from './auth.interface';
import { possess } from './auth.service';

/**
 * 验证用户登录数据
 */
export const validateLoginData = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('👮‍♂️ 验证用户登录数据');

  // 准备数据
  const { email, password } = request.body;

  // 验证必填数据
  if (!email) return next(new Error('EMAIL_IS_REQUIRED'));
  if (!password) return next(new Error('PASSWORD_IS_REQUIRED'));

  // 验证邮箱
  const user = await userService.getUserByEmail(email, { password: true });
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
 */
export const authGuard = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('👮🏼‍♀️ 验证用户身份');

  return request.user.id ? next() : next(new Error('UNAUTHORIZED'));
};

/**
 * 当前用户
 */
export const currentUser = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  let user = {
    // 未登录的用户
    id: null,
    name: 'anonymous',
  };

  try {
    // 提取 Authorization
    const authorization = request.header('Authorization');

    // 提取 JWT 令牌
    const token = authorization.replace('Bearer ', '');

    if (token) {
      // 验证令牌
      const decoded = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ['RS256'],
      });

      user = decoded as any;
    }
  } catch (error) { }

  // 在请求里添加当前用户
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
