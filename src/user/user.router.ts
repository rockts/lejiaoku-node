import express from 'express';
import * as userController from './user.controller';
import {
  validateUserData,
  hashPassword,
  validateUpdateUserData,
} from './user.middleware';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 用户列表
 */
router.get('/users/', userController.index);

/**
 * 创建用户
 */
router.post('/users', validateUserData, hashPassword, userController.store);

/**
 * 用户帐户
 */
router.get('/users/:userId', userController.show);

/**
 * 更新用户
 */
router.patch(
  '/users',
  authGuard,
  validateUpdateUserData,
  userController.update,
);

/**
 * 删除用户
 */
router.delete('/users/:userId', authGuard, userController.destroy);

/**
 * 导出路由
 */
export default router;
