import { Request, Response, NextFunction } from 'express';
import { signToken } from './auth.service';
import { enrichUserWithAvatarUrl } from '../user/user.helper';


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
    const { user: loginUser } = request.body;
    const { id, name, username, nickname, email, role, created_at, updated_at, description, avatar_url } = loginUser;

    // 重新获取完整的用户信息（包含 avatar 字段）
    // 因为登录时使用了 { password: true }，不会 JOIN avatar 表，所以需要重新获取
    const userService = await import('../user/user.service');
    const fullUser = await userService.getUserById(id);

    // 构建 token payload（包含用户 ID 和 role）
    // 按照需求，token payload 只包含 uid 和 role
    const payload = {
      uid: id, // 使用 uid 作为字段名
      role: role || 'user', // 默认角色为 user
    };

    // 签发令牌（24小时过期）
    const token = signToken({ payload });

    // 构建返回的用户信息（不包含密码，包含所有必要字段，包括 avatar）
    const user = {
      id,
      name,
      username,
      nickname,
      email,
      role: role || 'user',
      created_at,
      updated_at,
      avatar: fullUser ? (fullUser as any).avatar : null, // 从完整用户信息中获取 avatar
      description,
      avatar_url: avatar_url || null, // 先使用原有的 avatar_url
    };

    // 为用户设置 avatar_url（如果有头像）
    const enrichedUser = enrichUserWithAvatarUrl(user, id);

    // 返回响应
    response.send({
      success: true,
      message: '登录成功',
      token,
      user: enrichedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 当前用户
 * GET /user
 * 返回当前登录用户的完整信息
 */
export const user = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 从 request.user 获取用户 ID（由 currentUser 中间件注入）
    const userId = request.user?.id;

    if (!userId) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    // 从数据库获取完整的用户信息（包含 nickname, username 等所有字段）
    const userService = await import('../user/user.service');
    const fullUser = await userService.getUserById(userId);

    if (!fullUser) {
      return response.status(404).json({
        success: false,
        message: '用户不存在',
        error: 'USER_NOT_FOUND',
      });
    }

    // 为用户设置 avatar_url（如果有头像）
    const enrichedUser = enrichUserWithAvatarUrl(fullUser, userId);

    // 返回完整的用户信息（不包含密码）
    response.send(enrichedUser);
  } catch (error) {
    next(error);
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
