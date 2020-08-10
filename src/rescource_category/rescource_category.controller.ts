import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createRescourceCategory,
  updateRescourceCategory,
  getRescourceCategoryByName,
  deleteRescourceCategory,
  getRescourceCategoryTotalCount,
  getRescourceCategory,
} from './rescource_category.service';

/**
 * 资源类别列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计分类数量
    const totalCount = await getRescourceCategoryTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const type = await getRescourceCategory();
    response.send(type);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建资源类别
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, attrId } = request.body

  try {
    // 查找资源类别
    const rescource_category = await getRescourceCategoryByName(name);

    // 如果资源类别存在就报错
    if (rescource_category) throw new Error('RESCOURCE_CATEGORY_ALREADY_EXISTS');

    // 存储分类
    const data = await createRescourceCategory({ name, attrId });

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
    const data = await updateRescourceCategory(parseInt(`${typeId}`, 10), type);

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
    const data = await deleteRescourceCategory(parseInt(typeId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
