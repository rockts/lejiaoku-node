import express from 'express';
import * as categoryController from './category.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 资源类别列表
 */
router.get('/categorys', categoryController.index);

/**
 * 获取单个类型
 */
router.get('/categorys/:categoryId', categoryController.show);

/**
 * 创建资源类别
 */
router.post(
    '/categorys', authGuard, accessControl({ possession: true }), categoryController.store);

/**
 * 更新资源类别
 */
router.patch(
    '/categorys/:categoryId',
    authGuard,
    accessControl({ possession: true }),
    categoryController.update,
);

/**
 *  删除分类
 */
router.delete(
    '/categorys/:categoryId',
    authGuard,
    accessControl({ possession: true }),
    categoryController.destroy,
);

/**
 * 导出路由
 */
export default router;
