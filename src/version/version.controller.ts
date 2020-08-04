import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createVersion,
  updateVersion,
  getVersionByName,
  deleteVersion,
  getVersionTotalCount,
  getVersion,
} from './version.service';

/**
 * 版本列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计版本数量
    const totalCount = await getVersionTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const version = await getVersion();
    response.send(version);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建版本
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name } = request.body;

  try {
    // 查找版本
    const version = await getVersionByName(name);

    // 如果版本存在就报错
    if (version) throw new Error('VERSION_ALREADY_EXISTS');

    // 存储版本
    const data = await createVersion({ name });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新版本
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { versionId } = request.params;
  const version = _.pick(request.body, ['name']);

  // 更新版本
  try {
    const data = await updateVersion(parseInt(`${versionId}`, 10), version);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除版本
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { versionId } = request.params;

  // 删除版本
  try {
    const data = await deleteVersion(parseInt(versionId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
