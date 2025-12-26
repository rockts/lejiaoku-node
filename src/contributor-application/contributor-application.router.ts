/**
 * Contributor 申请路由
 */

import express from 'express';
import * as applicationController from './contributor-application.controller';
import { authGuard, requireRole } from '../auth/auth.middleware';
import { adminGuard } from '../auth/admin.middleware';

const router = express.Router();

/**
 * 创建申请
 * POST /api/contributor-applications
 * 权限：需要登录，仅 user 角色可调用
 */
router.post(
  '/contributor-applications',
  authGuard, // 需要登录
  requireRole(['user']), // 仅允许 user 角色申请
  applicationController.store,
);

/**
 * 获取待审核申请列表（管理员接口）
 * GET /api/admin/contributor-applications
 * 权限：仅 admin
 */
router.get(
  '/admin/contributor-applications',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  applicationController.getPendingList,
);

/**
 * 审核通过申请
 * POST /api/admin/contributor-applications/:id/approve
 * 权限：仅 admin
 */
router.post(
  '/admin/contributor-applications/:id/approve',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  applicationController.approve,
);

/**
 * 拒绝申请
 * POST /api/admin/contributor-applications/:id/reject
 * 权限：仅 admin
 */
router.post(
  '/admin/contributor-applications/:id/reject',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  applicationController.reject,
);

export default router;


