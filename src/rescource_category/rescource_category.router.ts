import express from 'express';
import * as rescource_categoryController from './rescource_category.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 类别列表
 */
router.get('/rescource-categorys', rescource_categoryController.index);

/**
 * 创建类别
 */
router.post('/rescource-categorys', authGuard, rescource_categoryController.store);

/**
 * 更新类别
 */
router.patch(
  '/rescource-category/:rescource-categoryId',
  authGuard,
  accessControl({ possession: true }),
  rescource_categoryController.update,
);

/**
 *  删除分类
 */
router.delete(
  '/rescource-category/:rescource-categoryId',
  authGuard,
  accessControl({ possession: true }),
  rescource_categoryController.destroy,
);

/**
 * 导出路由
 */
export default router;
