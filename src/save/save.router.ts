import express from 'express';
import * as saveController from './save.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 点赞内容
 */
router.post(
    '/posts/:postId/save',
    authGuard,
    saveController.storeUserSavePost,
);

/**
 * 取消点赞内容
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
