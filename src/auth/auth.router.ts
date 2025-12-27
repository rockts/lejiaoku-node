import express from 'express';
import * as authController from './auth.controller';
import * as registerController from './auth.controller.register';
import { validateLoginData, authGuard, currentUser } from './auth.middleware';
import { validateUserData, hashPassword } from '../user/user.middleware';

const router = express.Router();

/**
 * 用户注册
 * POST /api/register
 * 输入：username (或 name), password, role (可选)
 */
router.post(
  '/register',
  validateUserData,
  hashPassword,
  registerController.register,
);

/**
 * 用户登录
 * POST /api/login
 * 输入：username (或 email), password
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
