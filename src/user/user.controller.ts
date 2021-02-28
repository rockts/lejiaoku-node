import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { UserModel } from './user.model';
import { deleteUser, createUser, updateUser, getUserList, getUserById, getUserTotalCount } from './user.service';

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
  // 准备数据
  const { id } = request.user;
  const userData = _.pick(request.body.update, ['name', 'password', 'email']);

  // 更新用户
  try {
    const data = await updateUser(id, userData);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除用户
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { userId } = request.params;

  // 删除用户
  try {

    const data = await deleteUser(parseInt(userId, 10));

    // 做出响应
    response.send(data);

  } catch (error) {
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
