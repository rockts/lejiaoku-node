import express from 'express';
import * as resourcesController from './resources.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';
import { sort, filter, paginate } from './resources.middleware';
import { POSTS_PER_PAGE } from '../app/app.config';

const router = express.Router();

/**
 * 内容列表
 */
router.get(
  '/resources',
  sort,
  filter,
  paginate(POSTS_PER_PAGE),
  resourcesController.index,
);

/**
 * 创建内容
 */
router.post('/resources', authGuard, resourcesController.store);

/**
 * 更新内容
 */
router.patch(
  '/resources/:resourcesId',
  authGuard,
  accessControl({ possession: true }),
  resourcesController.update,
);

/**
 * 删除内容
 */
router.delete(
  '/resources/:resourcesId',
  authGuard,
  accessControl({ possession: true }),
  resourcesController.destroy,
);

/**
 * 添加内容标签
 */
router.post(
  '/resources/:resourcesId/tag',
  authGuard,
  accessControl({ possession: true }),
  resourcesController.storeResourcesTag,
);

/**
 * 移除内容标签
 */
router.delete(
  '/resources/:resourcesId/tag',
  authGuard,
  accessControl({ possession: true }),
  resourcesController.destroyResourcesTag,
);

/**
 * 单个内容
 */
router.get('/resources/:resourcesId', resourcesController.show);

/**
 * 导出路由
 */
export default router;
