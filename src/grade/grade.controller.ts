import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  createGrade,
  updateGrade,
  getGradeByName,
  deleteGrade,
  getGradeTotalCount,
  getGrade,
} from './grade.service';

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
    const totalCount = await getGradeTotalCount();

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const grade = await getGrade();
    response.send(grade);
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
    const grade = await getGradeByName(name);

    // 如果分类存在就报错
    if (grade) throw new Error('GRADE_ALREADY_EXISTS');

    // 存储分类
    const data = await createGrade({ name });

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
  const { gradeId } = request.params;
  const grade = _.pick(request.body, ['name']);

  // 更新分类
  try {
    const data = await updateGrade(parseInt(`${gradeId}`, 10), grade);

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
  const { gradeId } = request.params;

  // 删除分类
  try {
    const data = await deleteGrade(parseInt(gradeId, 10));

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
