import express from 'express';
import * as versionController from './version.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 版本列表
 */
router.get('/versions', versionController.index);

/**
 * 创建版本
 */
router.post('/versions', authGuard, versionController.store);

/**
 * 更新版本
 */
router.patch(
  '/versions/:versionId',
  authGuard,
  accessControl({ possession: true }),
  versionController.update,
);

/**
 *  删除版本
 */
router.delete(
  '/versions/:versionId',
  authGuard,
  accessControl({ possession: true }),
  versionController.destroy,
);

/**
 * 导出路由
 */
export default router;
