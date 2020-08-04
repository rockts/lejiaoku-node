import express from 'express';
import * as subjectController from './subject.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 学科列表
 */
router.get('/subjects', subjectController.index);

/**
 * 创建学科
 */
router.post('/subjects', authGuard, subjectController.store);

/**
 * 更新学科
 */
router.patch(
  '/subjects/:subjectId',
  authGuard,
  accessControl({ possession: true }),
  subjectController.update,
);

/**
 *  删除学科
 */
router.delete(
  '/subjects/:subjectId',
  authGuard,
  accessControl({ possession: true }),
  subjectController.destroy,
);

/**
 * 导出路由
 */
export default router;
