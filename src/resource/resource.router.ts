import express from 'express';
import * as resourceController from './resource.controller';
import * as resourceAutoMetaController from './resource-auto-meta.controller';
import * as updateResourceController from './resource.controller.update';
import * as deleteResourceController from './resource.controller.delete';
import { authGuard, roleGuard } from '../auth/auth.middleware';
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
 */
router.get(
  '/my/resources',
  myResourcesFilter, // 过滤当前用户的资源
  paginate(30),
  resourceController.myResources,
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
 * 权限：必须登录（任何已登录用户都可以创建资源）
 */
router.post(
  '/resources',
  authGuard, // 需要登录
  resourceWithCoverInterceptor, // 文件上传中间件（支持资源文件 + 封面文件同时上传）
  resourceCoverProcessor, // 封面图片尺寸调整处理器（生成 large/medium/thumbnail）
  resourceController.store,
);

/**
 * 管理员资源列表（显示所有状态的资源，用于审核）
 * 注意：这是管理员接口，生产环境需要添加权限验证
 * 开发期暂不加 authGuard
 */
router.get(
  '/admin/resources',
  adminFilter, // 管理员过滤器（不过滤status，或按status过滤）
  paginate(30),
  resourceController.adminIndex,
);

/**
 * 审核资源状态（管理员接口）
 * 权限：仅允许 editor 和 admin
 * user 调用此接口将返回 403
 */
router.patch(
  '/admin/resources/:id/status',
  authGuard, // 需要登录
  roleGuard(['admin', 'editor']), // 仅允许 admin 或 editor 角色
  resourceController.updateStatus,
);

/**
 * 更新资源（编辑资源）
 * PUT /api/resources/:id
 * 权限：admin、editor 或资源所有者
 */
router.put(
  '/resources/:id',
  authGuard, // 需要登录
  resourcePermissionGuard, // 权限验证：admin、editor 或资源所有者
  updateResourceController.update,
);

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 权限：admin 可删除任何资源，user/editor 只能删除自己的资源
 */
router.delete(
  '/resources/:id',
  authGuard, // 需要登录
  resourcePermissionGuard, // 权限验证：admin 可删除任何，user/editor 只能删除自己的
  deleteResourceController.destroy,
);

/**
 * 导出路由
 */
export default router;

