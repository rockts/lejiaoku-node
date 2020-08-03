import express from 'express';
import * as tagController from './type.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 创建标签
 */
router.post('/types', authGuard, tagController.store);

/**
 * 导出路由
 */
export default router;
