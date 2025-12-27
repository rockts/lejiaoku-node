import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import _ from 'lodash';
import * as userService from './user.service';
import { USERNAME_REGEX, USERNAME_FORMAT_DESCRIPTION } from './user.constants';

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

  // 准备数据
  // username: 登录用户名（必填，需验证格式）
  // name: 真实姓名（可选，不需要唯一）
  const { name, username, password, email, role } = request.body;

  // 验证必填数据
  if (!username) return next(new Error('USERNAME_IS_REQUIRED'));
  if (!password) return next(new Error('PASSWORD_IS_REQUIRED'));
  // email 可选，但如果有则验证
  // name 可选（真实姓名）

  // 验证用户名格式
  // 用户名格式：4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)
  if (!USERNAME_REGEX.test(username)) {
    return next(new Error('USERNAME_FORMAT_INVALID'));
  }

  // 验证用户名唯一性（只检查 username，不检查 name）
  const existingUser = await userService.getUserByName(username);
  if (existingUser) return next(new Error('USERNAME_ALREADY_EXIST'));

  // 验证邮箱（如果提供了 email）
  if (email) {
    const userEmail = await userService.getUserByEmail(email);
    if (userEmail) return next(new Error('EMAIL_ALREADY_EXIST'));
  }

  // 验证角色（如果提供，支持 user、contributor、editor、admin）
  // 但注册时只能创建 user 角色
  if (role && !['user', 'contributor', 'editor', 'admin'].includes(role)) {
    return next(new Error('INVALID_ROLE'));
  }

  // name 作为真实姓名（可选），如果没有提供则使用 username 作为默认值
  if (!name) {
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
  console.log('👮‍♂️ 验证更新用户数据', request.url, request.method);
  console.log('📦 请求体:', JSON.stringify(request.body, null, 2));

  // 准备数据
  const { validate, update } = request.body;

  // 当前用户
  const { id: userId } = request.user;

  // 兼容处理：如果没有 update 字段，但直接有 name/email/password 字段，则自动包裹
  let updateData = update;
  if (!updateData || typeof updateData !== 'object') {
    // 检查是否直接提供了更新字段（注意：user表中没有nickname字段，只有name字段）
    const directFields = ['name', 'email', 'password'];
    const hasDirectFields = directFields.some(field => request.body[field] !== undefined);

    if (hasDirectFields) {
      // 自动包裹到 update 字段中
      updateData = {};
      if (request.body.name !== undefined) updateData.name = request.body.name;
      if (request.body.email !== undefined) updateData.email = request.body.email;
      if (request.body.password !== undefined) updateData.password = request.body.password;

      // 将包裹后的数据设置回 request.body
      request.body.update = updateData;
      console.log('✅ 自动包裹更新数据:', JSON.stringify(updateData, null, 2));
    } else {
      // 既没有 update 字段，也没有直接字段，返回错误
      return next(new Error('UPDATE_DATA_REQUIRED'));
    }
  }

  try {
    // 调取用户数据（如果需要验证密码或更新密码时才需要 password）
    let user = null;
    const needPassword = updateData && updateData.password;

    if (needPassword) {
      // 如果要修改密码，必须提供当前密码进行验证
      if (!validate || !validate.password) {
        return next(new Error('PASSWORD_IS_REQUIRED'));
      }

      // 获取用户数据（包含密码）
      user = await userService.getUserById(userId, { password: true });

      // 验证用户密码是否匹配
      const matched = await bcrypt.compare(validate.password, user.password);

      if (!matched) {
        return next(new Error('PASSWORD_DOES_NOT_MATCH'));
      }
    }

    // 检查用户名是否被占用（排除当前用户）
    // 注意：name 是真实姓名，不需要唯一，所以只检查 username
    if (updateData && updateData.username) {
      // 验证用户名格式
      if (!USERNAME_REGEX.test(updateData.username)) {
        return next(new Error('USERNAME_FORMAT_INVALID'));
      }

      const existingUser = await userService.getUserByName(updateData.username);

      if (existingUser && existingUser.id !== userId) {
        return next(new Error('USERNAME_ALREADY_EXIST'));
      }
    }

    // name 作为真实姓名，不需要唯一性验证，可以重复

    // 处理用户邮箱是否占用（排除当前用户）
    if (updateData && updateData.email) {
      const existingUser = await userService.getUserByEmail(updateData.email);

      if (existingUser && existingUser.id !== userId) {
        return next(new Error('EMAIL_ALREADY_EXIST'));
      }
    }

    // 处理用户更新密码（仅在修改密码时需要）
    if (updateData && updateData.password) {
      // 如果之前没有获取用户数据，现在获取
      if (!user) {
        user = await userService.getUserById(userId, { password: true });
      }

      // 检查新密码是否与当前密码相同
      const matched = await bcrypt.compare(updateData.password, user.password);

      if (matched) {
        return next(new Error('PASSWORD_IS_THE_SAME'));
      }

      // HASH 用户更新密码
      request.body.update.password = await bcrypt.hash(updateData.password, 10);
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