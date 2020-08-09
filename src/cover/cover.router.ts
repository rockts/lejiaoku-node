import express from 'express';
import * as coverController from './cover.controller';
import { authGuard } from '../auth/auth.middleware';
import {
  coverInterceptor,
  coverProcessor,
  deleteResourcesCover,
} from './cover.middleware';

const router = express.Router();

/**
 * 上传封面
 */
router.post(
  '/covers',
  authGuard,
  coverInterceptor,
  coverProcessor,
  coverController.store,
);

/**
 * delete cover
 */
router.delete(
  '/covers/:coverId',
  authGuard,
  deleteResourcesCover,
  coverController.destroy,
);

/**
 * 文件服务
 */ router.get('/covers/:coverId/serve', coverController.serve);

/**
 * 文件信息
 */
router.get('/covers/:coverId/metadata', coverController.metadata);

/**
 * 导出路由
 */
export default router;
