import express from 'express';
import * as resourceController from './resource.controller';
import * as resourceAutoMetaController from './resource-auto-meta.controller';
import * as updateResourceController from './resource.controller.update';
import * as deleteResourceController from './resource.controller.delete';
import { authGuard } from '../auth/auth.middleware';
import { resourcePermissionGuard } from './resource.permission.middleware';
import { filter, adminFilter, myResourcesFilter, paginate, resourceFileInterceptor, resourceWithCoverInterceptor } from './resource.middleware';

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
 */
router.post(
  '/resources/:id/auto-parse',
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
 * 权限：user 或 admin
 */
router.post(
  '/resources',
  authGuard, // 需要登录
  resourceWithCoverInterceptor, // 文件上传中间件（支持资源文件 + 封面文件同时上传）
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
 * 注意：这是管理员接口，生产环境需要添加权限验证
 * 开发期暂不加 authGuard
 */
router.patch(
  '/admin/resources/:id/status',
  // authGuard, // TODO: 生产环境需要添加权限验证
  resourceController.updateStatus,
);

/**
 * 更新资源（编辑资源）
 * PUT /api/resources/:id
 * 权限：仅创建者或 admin 可修改
 */
router.put(
  '/resources/:id',
  authGuard, // 需要登录
  resourcePermissionGuard, // 权限验证：仅创建者或 admin
  updateResourceController.update,
);

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 权限：仅创建者或 admin 可删除
 */
router.delete(
  '/resources/:id',
  authGuard, // 需要登录
  resourcePermissionGuard, // 权限验证：仅创建者或 admin
  deleteResourceController.destroy,
);

/**
 * 导出路由
 */
export default router;

