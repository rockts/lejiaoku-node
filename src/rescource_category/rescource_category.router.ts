import express from 'express';
import * as attribute_typeController from './rescource_category.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 分类列表
 */
router.get('/attribute_types', attribute_typeController.index);

/**
 * 创建分类
 */
router.post('/attribute_types', authGuard, attribute_typeController.store);

/**
 * 更新分类
 */
router.patch(
  '/attribute_types/:attribute_typesId',
  authGuard,
  accessControl({ possession: true }),
  attribute_typeController.update,
);

/**
 *  删除分类
 */
router.delete(
  '/attribute_types/:attribute_typesId',
  authGuard,
  accessControl({ possession: true }),
  attribute_typeController.destroy,
);

/**
 * 导出路由
 */
export default router;
