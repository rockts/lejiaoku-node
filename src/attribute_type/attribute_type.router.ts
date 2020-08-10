import express from 'express';
import * as attribute_typeController from './attribute_type.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 分类列表
 */
router.get('/attribute-types', attribute_typeController.index);

/**
 * 创建分类
 */
router.post('/attribute-types', authGuard, attribute_typeController.store);

/**
 * 更新分类
 */
router.patch(
  '/attribute-types/:attribute-typeId',
  authGuard,
  accessControl({ possession: true }),
  attribute_typeController.update,
);

/**
 *  删除分类
 */
router.delete(
  '/attribute-types/:attribute_typeId',
  authGuard,
  accessControl({ possession: true }),
  attribute_typeController.destroy,
);

/**
 * 导出路由
 */
export default router;
