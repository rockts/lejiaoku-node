import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import _ from 'lodash';
import * as userService from './user.service';

/**
 * 验证用户数据
 * 支持 username 或 name 字段
 */
export const validateUserData = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('👮‍♂️ 验证用户数据');

  // 准备数据（支持 username 或 name）
  const { name, username, password, email, role } = request.body;
  const userNameValue = username || name; // 兼容 username 和 name

  // 验证必填数据
  if (!userNameValue) return next(new Error('USERNAME_OR_NAME_IS_REQUIRED'));
  if (!password) return next(new Error('PASSWORD_IS_REQUIRED'));
  // email 可选，但如果有则验证

  // 验证用户名（如果提供了 name/username）
  if (userNameValue) {
    const existingUser = await userService.getUserByName(userNameValue);
    if (existingUser) return next(new Error('USERNAME_ALREADY_EXIST'));
  }

  // 验证邮箱（如果提供了 email）
  if (email) {
    const userEmail = await userService.getUserByEmail(email);
    if (userEmail) return next(new Error('EMAIL_ALREADY_EXIST'));
  }

  // 验证角色（如果提供）
  if (role && !['user', 'admin'].includes(role)) {
    return next(new Error('INVALID_ROLE'));
  }

  // 将 username 映射到 name（如果使用的是 username）
  if (username && !name) {
    request.body.name = username;
  }

  // 下一步
  next();
};

/**
 * HASH 密码
 */
export const hashPassword = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { password } = request.body;

  // HASH 密码
  request.body.password = await bcrypt.hash(password, 10);

  // 下一步
  next();
};

/**
 * 验证更新用户数据
 */
export const validateUpdateUserData = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { validate, update } = request.body;

  // 当前用户
  const { id: userId } = request.user;

  try {
    // 检查用户是否提供了当前密码
    if (!_.has(validate, 'password')) {
      return next(new Error('PASSWORD_IS_REQUIRED'));
    }

    // 调取用户数据
    const user = await userService.getUserById(userId, { password: true });

    // 验证用户密码是否匹配
    const matched = await bcrypt.compare(validate.password, user.password);

    if (!matched) {
      return next(new Error('PASSWORD_DOES_NOT_MATCH'));
    }

    // 检查用户名是否被占用
    if (update.name) {
      const user = await userService.getUserByName(update.name);

      if (user) {
        return next(new Error('USER_ALREADY_EXIST'));
      }
    }

    // 处理用户邮箱是否占用
    if (update.email) {
      const user = await userService.getUserByEmail(update.email);

      if (user) {
        return next(new Error('EMAIL_ALREADY_EXIST'));
      }
    }

    // 处理用户更新密码
    if (update.password) {
      const matched = await bcrypt.compare(update.password, user.password);

      if (matched) {
        return next(new Error('PASSWORD_IS_THE_SAME'));
      }

      // HASH 用户更新密码
      request.body.update.password = await bcrypt.hash(update.password, 10);
    }
  } catch (error) {
    return next(error);
  }

  // 下一步
  next();
};


/**
 * 忘记密码处理
 */
export const forgotPassword = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {

}