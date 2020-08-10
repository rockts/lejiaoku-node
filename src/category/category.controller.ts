import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createCategory,
  updateCategory,
  getCategoryByName,
  deleteCategory,
  getCategoryTotalCount,
  getCategory,
} from './category.service';

/**
 * 类别列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计类别数量
    const totalCount = await getCategoryTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const type = await getCategory();
    response.send(type);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建类别
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, attrId, attr_name, attr_alias } = request.body

  try {
    // 查找资源类别
    const rescource_category = await getCategoryByName(name);

    // 如果资源类别存在就报错
    if (rescource_category) throw new Error('RESCOURCE_CATEGORY_ALREADY_EXISTS');

    // 存储分类
    const data = await createCategory({ name, attrId, attr_name, attr_alias });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新类别
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { categoryId } = request.params;
  const category = _.pick(request.body, ['name', 'attrId', 'attr_name', 'attr_alias']);

  // 更新类别
  try {
    const data = await updateCategory(parseInt(`${categoryId}`, 10), category);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除类别
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
