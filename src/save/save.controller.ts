import { Request, Response, NextFunction } from 'express';
import {
  createUserSavePost,
  deleteUserSavePost,
} from './save.service';

/**
 * 收藏内容
 */
export const storeUserSavePost = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 收藏数据
  const { postId } = request.params;
  const { id: userId } = request.user;

  // 收藏内容
  try {
    const data = await createUserSavePost(
      userId,
      parseInt(postId, 10),
    );

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 取消收藏内容
 */
export const destroyUserSavePost = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { postId } = request.params;
  const { id: userId } = request.user;

  // 取消点赞内容
  try {
    const data = await deleteUserSavePost(
      userId,
      parseInt(postId, 10),
    );

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
