import { Request, Response, NextFunction, request } from 'express';
import _ from 'lodash';
import {
  updateCategory,
  getCategoryByName,
  deleteCategory,
  getCategoryTotalCount,
  getCategory,
  createCategory
} from './category.service';

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
    const totalCount = await getCategoryTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const category = await getCategory();
    response.send(category);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建分类
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, alias } = request.body;

  try {
    // 查找分类
    const category = await getCategoryByName(name);

    // 如果分类存在就报错
    if (category) throw new Error('CATEGORY_ALREADY_EXISTS');

    // 存储分类
    const data = await createCategory({ name, alias });

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
  const { categoryId } = request.params;
  const category = _.pick(request.body, ['name', 'alias']);

  // 更新分类
  try {
    const data = await updateCategory(parseInt(`${categoryId}`, 10), category);

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
  const { categoryId } = request.params;

  // 删除分类
  try {
    const data = await deleteCategory(parseInt(categoryId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
