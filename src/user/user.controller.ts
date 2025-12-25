import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { UserModel } from './user.model';
import { deleteUser, createUser, updateUser, getUserList, getUserById, getUserTotalCount } from './user.service';
import { connection } from '../app/database/mysql';

/**
 * 用户列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计用户数量
    const totalCount = await getUserTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount)
  } catch (error) {
    next(error)
  }

  try {
    const user = await getUserList();
    response.send(user);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建用户
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, password, email } = request.body;

  // 创建用户
  try {
    const data = await createUser({ name, password, email });

    response.status(201).send({ message: '注册成功', data });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户帐户
 */
export const show = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { userId } = request.params;

  // 调取用户
  try {
    const user = await getUserById(parseInt(userId, 10));

    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }

    // 做出响应
    response.send(user);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log('📝 更新用户信息');

  // 准备数据
  const { id } = request.user;
  const update = request.body.update || {};
  // name: 真实姓名（可选，不需要唯一）
  // username: 登录用户名（可选，需验证格式和唯一性）
  const userData = _.pick(update, ['name', 'username', 'password', 'email', 'description', 'nickname', 'avatar_url']);

  // 如果没有要更新的字段，返回错误
  if (Object.keys(userData).length === 0) {
    return next(new Error('NO_UPDATE_FIELDS'));
  }

  console.log('👤 用户ID:', id);
  console.log('📋 更新数据:', userData);

  // 更新用户
  try {
    await updateUser(id, userData);

    // 获取更新后的用户信息
    const updatedUser = await getUserById(id);

    if (!updatedUser) {
      return next(new Error('USER_NOT_FOUND'));
    }

    // 做出响应（返回更新后的用户信息）
    response.send({
      success: true,
      message: '更新成功',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除用户
 * DELETE /api/users/:userId
 * 权限：仅 admin 允许删除用户
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 准备数据
    const { userId } = request.params;
    const targetUserId = parseInt(userId, 10);

    if (isNaN(targetUserId)) {
      return response.status(400).json({
        error: 'invalid_user_id',
        message: 'Invalid user ID',
        success: false,
      });
    }

    // 检查用户是否存在
    const existingUser = await getUserById(targetUserId);
    if (!existingUser) {
      return response.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
        success: false,
      });
    }

    // 禁止删除最后一个 admin
    if ((existingUser as any).role === 'admin') {
      const [adminCountResult] = await connection.promise().query(
        `SELECT COUNT(*) as count FROM user WHERE role = 'admin'`,
      );
      const adminCount = (adminCountResult as any[])[0].count;

      if (adminCount <= 1) {
        return response.status(400).json({
          error: 'cannot_delete_last_admin',
          message: 'Cannot delete the last admin user',
          success: false,
        });
      }
    }

    // 删除用户
    await deleteUser(targetUserId);

    // 做出响应
    response.json({
      success: true,
      message: 'User deleted successfully',
      user_id: targetUserId,
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    next(error);
  }
};

/**
 * 忘记密码
 */
export const forgot = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {

}
