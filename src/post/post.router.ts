import express from 'express';
import * as postController from './post.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';
import { sort, filter, paginate } from './post.middleware';
import { POSTS_PER_PAGE } from '../app/app.config';

const router = express.Router();

/**
 * 内容列表
 */
router.get(
  '/post',
  sort,
  filter,
  paginate(POSTS_PER_PAGE),
  postController.index,
);

/**
 * 创建内容
 */
router.post('/post', authGuard, postController.store);

/**
 * 更新内容
 */
router.patch(
  '/post/:postId',
  authGuard,
  accessControl({ possession: true }),
  postController.update,
);

/**
 * 删除内容
 */
router.delete(
  '/post/:postId',
  authGuard,
  accessControl({ possession: true }),
  postController.destroy,
);

/**
 * 添加内容标签
 */
router.post(
  '/post/:postId/tag',
  authGuard,
  accessControl({ possession: true }),
  postController.storePostTag,
);

/**
 * 移除内容标签
 */
router.delete(
  '/post/:postId/tag',
  authGuard,
  accessControl({ possession: true }),
  postController.destroyPostTag,
);

/**
 * 单个内容
 */
router.get('/post/:postId', postController.show);

/**
 * 导出路由
 */
export default router;
