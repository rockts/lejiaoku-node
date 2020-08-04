import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createSubject,
  updateSubject,
  getSubjectByName,
  deleteSubject,
  getSubjectTotalCount,
  getSubject,
} from './subject.service';

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
    const totalCount = await getSubjectTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const subject = await getSubject();
    response.send(subject);
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
  const { name } = request.body;

  try {
    // 查找分类
    const subject = await getSubjectByName(name);

    // 如果分类存在就报错
    if (subject) throw new Error('TYPE_ALREADY_EXISTS');

    // 存储分类
    const data = await createSubject({ name });

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
  const { subjectId } = request.params;
  const subject = _.pick(request.body, ['name']);

  // 更新分类
  try {
    const data = await updateSubject(parseInt(`${subjectId}`, 10), subject);

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
  const { subjectId } = request.params;

  // 删除分类
  try {
    const data = await deleteSubject(parseInt(subjectId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};