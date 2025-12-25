import express from 'express';
import * as userController from './user.controller';
import * as userAdminController from './user.controller.admin';
import {
  validateUserData,
  hashPassword,
  validateUpdateUserData,
} from './user.middleware';
import { authGuard, requireRole } from '../auth/auth.middleware';
import { adminGuard } from '../auth/admin.middleware';

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
 * DELETE /api/users/:userId
 * 权限：仅 admin 允许删除用户
 */
router.delete(
  '/users/:userId',
  authGuard, // 需要登录
  requireRole(['admin']), // 仅允许 admin 删除用户
  userController.destroy,
);

/**
 * 获取用户列表（管理员接口）
 * GET /api/admin/users
 * 权限：仅 admin
 */
router.get(
  '/admin/users',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  userAdminController.getUserList,
);

/**
 * 修改用户角色（管理员接口）
 * PATCH /api/admin/users/:id/role
 * 权限：仅 admin
 */
router.patch(
  '/admin/users/:id/role',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  userAdminController.updateUserRole,
);

/**
 * 导出路由
 */
export default router;
