import { Request, Response, NextFunction } from 'express';
import {
  createUserLikeResources,
  deleteUserLikeResources,
} from './like.service';

/**
 * 点赞内容
 */
export const storeUserLikeResources = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { resourcesId } = request.params;
  const { id: userId } = request.user;

  // 点赞内容
  try {
    const data = await createUserLikeResources(
      userId,
      parseInt(resourcesId, 10),
    );

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 取消点赞内容
 */
export const destroyUserLikeResources = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { resourcesId } = request.params;
  const { id: userId } = request.user;

  // 取消点赞内容
  try {
    const data = await deleteUserLikeResources(
      userId,
      parseInt(resourcesId, 10),
    );

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
