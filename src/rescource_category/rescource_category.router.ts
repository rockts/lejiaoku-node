import express from 'express';
import * as rescource_categoryController from './rescource_category.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 资源类别列表
 */
router.get('/rescource-categorys', rescource_categoryController.index);

/**
 * 创建资源类别
 */
router.post(
  '/rescource-categorys', authGuard, accessControl({ possession: true }), rescource_categoryController.store);

/**
 * 更新资源类别
 */
router.patch(
  '/rescource-categorys/:categoryId',
  authGuard,
  accessControl({ possession: true }),
  rescource_categoryController.update,
);

/**
 *  删除分类
 */
router.delete(
  '/rescource-categorys/:categoryId',
  authGuard,
  accessControl({ possession: true }),
  rescource_categoryController.destroy,
);

/**
 * 导出路由
 */
export default router;
