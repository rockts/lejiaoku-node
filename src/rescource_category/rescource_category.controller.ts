import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createAttributeType,
  updateAttributeType,
  getAttributeTypeByName,
  deleteAttributeType,
  getAttributeTypeTotalCount,
  getAttributeType,
} from './rescource_category.service';

/**
 * 分类列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计分类数量
    const totalCount = await getAttributeTypeTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const type = await getAttributeType();
    response.send(type);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建类型
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, alias } = request.body;

  try {
    // 查找类型
    const arttribute_type = await getAttributeTypeByName(name);

    // 如果分类存在就报错
    if (arttribute_type) throw new Error('ARTTRIBUTE_TYPE_ALREADY_EXISTS');

    // 存储分类
    const data = await createAttributeType({ name, alias });

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
    const data = await updateAttributeType(parseInt(`${typeId}`, 10), type);

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
    const data = await deleteAttributeType(parseInt(typeId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
