import { Request, Response, NextFunction } from 'express';
import { signToken } from './auth.service';


/**
 * 用户登录
 */
export const login = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const {
    user: { id, name, email, created_at, updated_at, avatar },
  } = request.body;

  const payload = { id, name, email };

  try {
    // 签发令牌
    const token = signToken({ payload });

    const user = { id, name, email, created_at, updated_at, avatar }

    // 做出响应
    response.send({
      message: 'success',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 当前用户
 */
export const user = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const Authorization = request.user;
  const user = Authorization;




  try {
    response.send(user)
    console.log(user);


  } catch (error) {
    next(error)
  }
};

/**
 * 验证登录
 */
export const validate = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log(request.user);
  response.sendStatus(200);
};
