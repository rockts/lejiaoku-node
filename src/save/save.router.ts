import express from 'express';
import * as saveController from './save.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 收藏内容
 * @deprecated 此接口基于 Post 模块，请迁移到 Resource 模块
 * TODO: 实现 POST /api/resources/:id/save 以替代此接口
 */
router.post(
    '/posts/:postId/save',
    authGuard,
    saveController.storeUserSavePost,
);

/**
 * 取消收藏内容
 * @deprecated 此接口基于 Post 模块，请迁移到 Resource 模块
 * TODO: 实现 DELETE /api/resources/:id/save 以替代此接口
 */
router.delete(
    '/posts/:postId/save',
    authGuard,
    saveController.destroyUserSavePost,
);

/**
 * 导出路由
 */
export default router;
