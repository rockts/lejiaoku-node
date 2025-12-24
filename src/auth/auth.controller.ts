import { Request, Response, NextFunction } from 'express';
import { signToken } from './auth.service';


/**
 * 用户登录
 * POST /api/login
 * 输入：username (或 email), password
 * 返回：JWT token 和用户信息
 */
export const login = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 准备数据（从 validateLoginData 中间件注入）
    const {
      user: { id, name, email, role, created_at, updated_at, avatar },
    } = request.body;

    // 构建 token payload（包含用户 ID、name、email、role）
    const payload = {
      id,
      name,
      email,
      role: role || 'user', // 默认角色为 user
    };

    // 签发令牌（24小时过期）
    const token = signToken({ payload });

    // 构建返回的用户信息（不包含密码）
    const user = {
      id,
      name,
      email,
      role: role || 'user',
      created_at,
      updated_at,
      avatar,
    };

    // 返回响应
    response.send({
      success: true,
      message: '登录成功',
      token,
      user,
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
