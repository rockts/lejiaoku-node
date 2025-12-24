import express from 'express';
import * as likeController from './like.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 点赞内容
 * @deprecated 此接口基于 Post 模块，请迁移到 Resource 模块
 * TODO: 实现 POST /api/resources/:id/like 以替代此接口
 */
router.post(
    '/posts/:postId/like',
    authGuard,
    likeController.storeUserLikePost,
);

/**
 * 取消点赞内容
 * @deprecated 此接口基于 Post 模块，请迁移到 Resource 模块
 * TODO: 实现 DELETE /api/resources/:id/like 以替代此接口
 */
router.delete(
    '/posts/:postId/like',
    authGuard,
    likeController.destroyUserLikePost,
);

/**
 * 导出路由
 */
export default router;
