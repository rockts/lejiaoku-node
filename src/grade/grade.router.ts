import express from 'express';
import * as gradeController from './grade.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 年级列表
 */
router.get('/grades', gradeController.index);

/**
 * 创建年级
 */
router.post('/grades', authGuard, gradeController.store);

/**
 * 更新年级
 */
router.patch(
  '/grades/:gradeId',
  authGuard,
  accessControl({ possession: true }),
  gradeController.update,
);

/**
 *  删除年级
 */
router.delete(
  '/grades/:gradeId',
  authGuard,
  accessControl({ possession: true }),
  gradeController.destroy,
);

/**
 * 导出路由
 */
export default router;
