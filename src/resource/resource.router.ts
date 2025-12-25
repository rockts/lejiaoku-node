import express from 'express';
import * as resourceController from './resource.controller';
import * as resourceAutoMetaController from './resource-auto-meta.controller';
import * as updateResourceController from './resource.controller.update';
import * as deleteResourceController from './resource.controller.delete';
import * as resourceAdminController from './resource.controller.admin';
import * as resourceUserController from './resource.controller.user';
import { authGuard, roleGuard, requireRole } from '../auth/auth.middleware';
import { adminGuard } from '../auth/admin.middleware';
import { resourcePermissionGuard } from './resource.permission.middleware';
import { filter, adminFilter, myResourcesFilter, paginate, resourceFileInterceptor, resourceWithCoverInterceptor, resourceCoverProcessor } from './resource.middleware';

const router = express.Router();

/**
 * 资源列表
 */
router.get(
  '/resources',
  filter,
  paginate(30),
  resourceController.index,
);

/**
 * 我的资源列表（当前用户的所有资源）
 * GET /api/my/resources
 * 权限：需要登录
 */
router.get(
  '/my/resources',
  authGuard, // 需要登录
  myResourcesFilter, // 过滤当前用户的资源
  paginate(30),
  resourceController.myResources,
);

/**
 * 获取指定用户的资源列表
 * GET /api/users/:userId/resources
 * 权限：公开访问（只返回已审核的资源）
 */
router.get(
  '/users/:userId/resources',
  paginate(30),
  resourceUserController.getUserResources,
);

/**
 * 单个资源详情
 */
router.get(
  '/resources/:id',
  resourceController.show,
);

/**
 * 获取资源的自动解析元数据
 */
router.get(
  '/resources/:id/auto-meta',
  resourceAutoMetaController.getAutoMeta,
);

/**
 * 自动解析资源结构（最小可用版本，用于验证链路）
 * 权限：admin, editor
 */
router.post(
  '/resources/:id/auto-parse',
  authGuard, // 需要登录
  roleGuard(['admin', 'editor']), // 需要 admin 或 editor 角色
  resourceController.autoParse,
);

/**
 * 下载资源文件（强制下载，不预览）
 */
router.get(
  '/resources/:id/download',
  resourceController.download,
);

/**
 * 创建资源（支持文件上传）
 * 权限：contributor / editor / admin
 * user 角色禁止上传资源
 */
router.post(
  '/resources',
  authGuard, // 需要登录
  requireRole(['contributor', 'editor', 'admin']), // 仅允许 contributor、editor、admin
  resourceWithCoverInterceptor, // 文件上传中间件（支持资源文件 + 封面文件同时上传）
  resourceCoverProcessor, // 封面图片尺寸调整处理器（生成 large/medium/thumbnail）
  resourceController.store,
);

/**
 * 管理员资源列表（显示所有状态的资源，用于审核）
 * GET /api/admin/resources
 * 权限：仅 admin
 * 支持查询参数：status, uploader_id
 */
router.get(
  '/admin/resources',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  resourceAdminController.getResourceList,
);

/**
 * 审核资源状态（管理员接口）
 * PATCH /api/admin/resources/:id/status
 * 权限：仅 admin
 */
router.patch(
  '/admin/resources/:id/status',
  authGuard, // 需要登录
  adminGuard, // 仅允许 admin 角色
  resourceAdminController.updateResourceStatusByAdmin,
);

/**
 * 审核资源（通过审核）
 * POST /api/resources/:id/approve
 * 权限：editor / admin
 * user / contributor 禁止
 */
router.post(
  '/resources/:id/approve',
  authGuard, // 需要登录
  requireRole(['editor', 'admin']), // 仅允许 editor 和 admin
  resourceController.approve,
);

/**
 * 更新资源（编辑资源）
 * PUT /api/resources/:id
 * 权限：admin、editor 或资源所有者
 * 支持：更新字段 + 上传新封面（上传新封面时会删除旧封面）
 */
router.put(
  '/resources/:id',
  authGuard, // 需要登录
  resourcePermissionGuard, // 权限验证：admin、editor 或资源所有者
  resourceWithCoverInterceptor, // 文件上传中间件（支持上传封面文件）
  resourceCoverProcessor, // 封面图片尺寸调整处理器（生成 large/medium/thumbnail）
  updateResourceController.update,
);

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 权限：仅 admin 允许删除资源
 */
router.delete(
  '/resources/:id',
  authGuard, // 需要登录
  requireRole(['admin']), // 仅允许 admin 删除资源
  deleteResourceController.destroy,
);

/**
 * 导出路由
 */
export default router;

