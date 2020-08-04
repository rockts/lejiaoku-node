import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createType,
  updateType,
  getTypeByName,
  deleteType,
} from './type.service';

/**
 * 创建分类
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name } = request.body;

  try {
    // 查找分类
    const type = await getTypeByName(name);

    // 如果分类存在就报错
    if (type) throw new Error('TYPE_ALREADY_EXISTS');

    // 存储分类
    const data = await createType({ name });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新分类
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { typeId } = request.params;
  const type = _.pick(request.body, ['name']);

  // 更新分类
  try {
    const data = await updateType(parseInt(`${typeId}`, 10), type);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除分类
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { typeId } = request.params;

  // 删除分类
  try {
    const data = await deleteType(parseInt(typeId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
