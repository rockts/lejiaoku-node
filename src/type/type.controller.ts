import { Request, Response, NextFunction } from 'express';
import { createTag, getTypeByName } from './type.service';

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
    const data = await createTag({ name });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};
