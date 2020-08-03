import express from 'express';
import * as likeController from './like.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 点赞内容
 */
router.post(
  '/resources/:resourcesId/like',
  authGuard,
  likeController.storeUserLikeResources,
);

/**
 * 取消点赞内容
 */
router.delete(
  '/resources/:resourcesId/like',
  authGuard,
  likeController.destroyUserLikeResources,
);

/**
 * 导出路由
 */
export default router;
