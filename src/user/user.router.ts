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
router.post('/register', validateUserData, hashPassword, userController.store);

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
 * 更新用户（兼容前端 /user/profile 路径）
 * 支持 PATCH 和 PUT 方法
 */
router.patch(
  '/user/profile',
  authGuard,
  validateUpdateUserData,
  userController.update,
);

router.put(
  '/user/profile',
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
