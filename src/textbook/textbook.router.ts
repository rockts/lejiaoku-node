import express from 'express';
import * as textbookController from './textbook.controller';

const router = express.Router();

/**
 * 获取所有教材骨架
 */
router.get(
  '/textbook-catalog',
  textbookController.index,
);

/**
 * 绑定资源与教材
 */
router.post(
  '/resources/:id/bind-textbook',
  textbookController.bindTextbook,
);

/**
 * 导出路由
 */
export default router;

