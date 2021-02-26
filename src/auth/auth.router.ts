import express from 'express';
import * as authController from './auth.controller';
import { validateLoginData, authGuard, currentUser } from './auth.middleware';

const router = express.Router();

/**
 * 用户登录
 */
router.post('/login', validateLoginData, authController.login);

/**
 * 验证登录
 */
router.post('/auth/validate', authGuard, authController.validate);

/** 
 * 返回当前用户
 */
router.get('/user', currentUser, authController.user)

/**
 * 导出路由
 */
export default router;
