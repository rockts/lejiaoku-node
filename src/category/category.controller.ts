import { Request, Response, NextFunction, request } from 'express';
import _ from 'lodash';
import {
  createAttr,
  updateCategory,
  getCategoryByName,
  deleteCategory,
  getCategoryTotalCount,
  getAttrTotalCount,
  getCategory,
  getAttr,
  findAttrById,
  getAttrByName,
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
    const category = await getCategory();
    response.send(category);
  } catch (error) {
    next(error);
  }
};

/** 
 * 属性类型列表
 */
export const index_attr = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计属性类型数量
    const totalcount = await getAttrTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalcount);
  } catch (error) {
    next(error);
  }

  try {
    const attr = await getAttr();
    response.send(attr);
  } catch (error) {
    next(error)
  }
};

/**
 * 创建属性类型
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { name, attrId, attr_name, attr_alias } = request.body;

  try {
    // 查找属性类型
    const attr = await getAttrByName(attr_name);

    // 如果属性类型存在就报错
    if (attr) throw new Error('ATTR_ALREADY_EXISTS');

    // 存储分类
    const data = await createAttr({ name, attrId, attr_name, attr_alias });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 根据属性类型创建类别
 */
export const category_store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取 attr_Id
  const { attrId } = request.params;

  try {
    // 查找 attr 信息
    const attr = await findAttrById(parseInt(attrId, 10));

    // 提供 attrid 参数
    const { attrid } = request.query;

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
