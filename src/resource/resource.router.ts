import express from 'express';
import * as resourceController from './resource.controller';
import * as resourceAutoMetaController from './resource-auto-meta.controller';
import { authGuard } from '../auth/auth.middleware';
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
 * 临时方案：暂时移除 authGuard 以便测试，生产环境应恢复
 * TODO: 恢复 authGuard 中间件以确保安全
 */
router.post(
  '/resources',
  // authGuard, // 临时注释以支持测试
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
 * 导出路由
 */
export default router;

