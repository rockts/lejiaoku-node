import express from 'express';
import * as coverController from './cover.controller';
import { authGuard } from '../auth/auth.middleware';
import {
  coverInterceptor,
  coverProcessor,
  deletePostCover,
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
  deletePostCover,
  coverController.destroy,
);

/**
 * cover serve
 */ router.get('/covers/:coverId', coverController.serve);

/**
 * cover metadat
 */
router.get('/covers/:coverId/metadata', coverController.metadata);

/**
 * 导出路由
 */
export default router;
