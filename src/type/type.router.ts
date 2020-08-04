import express from 'express';
import * as typeController from './type.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 创建分类
 */
router.post('/types', authGuard, typeController.store);

/**
 * 更新分类
 */
router.patch(
  '/types/:typeId',
  authGuard,
  accessControl({ possession: true }),
  typeController.update,
);

/**
 *  删除分类
 */
router.delete(
  '/types/:typeId',
  authGuard,
  accessControl({ possession: true }),
  typeController.destroy,
);

/**
 * 导出路由
 */
export default router;
