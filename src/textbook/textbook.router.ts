import express from 'express';
import {
  show,
  showByResourceId,
  getTextbookCatalogList,
  bindResourceToTextbook,
  bindResourceToCatalogFromAutoMeta,
} from './textbook.controller';
import * as catalogStatisticsController from './catalog-statistics.controller';
import * as catalogInfoController from './catalog-info.controller';
import * as catalogUnitSearchController from './catalog-unit-search.controller';
import { authGuard, requireRole } from '../auth/auth.middleware';
import { adminGuard } from '../auth/admin.middleware';

const router = express.Router();

/**
 * 获取所有教材目录骨架
 * GET /api/textbook-catalog 或 /api/catalogs
 * 权限：仅 contributor、editor、admin 可访问
 */
router.get('/textbook-catalog', authGuard, requireRole(['contributor', 'editor', 'admin']), getTextbookCatalogList);
router.get('/catalogs', authGuard, requireRole(['contributor', 'editor', 'admin']), getTextbookCatalogList); // 别名，方便前端使用

/**
 * 绑定资源与教材目录（手动指定教材目录ID）
 */
router.post('/resources/:id/bind-textbook', bindResourceToTextbook);

/**
 * 根据 auto_meta_result 自动绑定资源到教材目录
 */
router.post('/resources/:id/bind-catalog-from-auto-meta', bindResourceToCatalogFromAutoMeta);

/**
 * 获取教材信息（包含结构树）
 */
router.get('/textbooks/:id', show);

/**
 * 根据 resource_id 获取教材信息
 */
router.get('/textbooks/by-resource/:resourceId', showByResourceId);

/**
 * 获取所有 catalog 的统计信息（仅 admin）
 * GET /api/admin/catalogs/statistics
 */
router.get(
  '/admin/catalogs/statistics',
  authGuard,
  adminGuard,
  catalogStatisticsController.getCatalogStatistics,
);

/**
 * 获取指定 catalog 下所有 unit 的统计信息（仅 admin）
 * GET /api/admin/catalogs/:id/units/statistics
 */
router.get(
  '/admin/catalogs/:id/units/statistics',
  authGuard,
  adminGuard,
  catalogStatisticsController.getCatalogUnitStatistics,
);

/**
 * 获取指定 catalog 的质量诊断信息（仅 admin）
 * GET /api/admin/catalogs/:id/quality
 */
router.get(
  '/admin/catalogs/:id/quality',
  authGuard,
  adminGuard,
  catalogStatisticsController.getCatalogQualityDiagnosis,
);

/**
 * 获取待行动的 Catalog 列表（仅 admin）
 * GET /api/admin/catalogs/actions
 */
router.get(
  '/admin/catalogs/actions',
  authGuard,
  adminGuard,
  catalogStatisticsController.getCatalogActions,
);

/**
 * 获取 Catalog 基本信息（用于教材目录页）
 * GET /api/catalogs/:catalogId/info
 * 权限：仅 contributor、editor、admin 可访问
 */
router.get(
  '/catalogs/:catalogId/info',
  authGuard,
  requireRole(['contributor', 'editor', 'admin']),
  catalogInfoController.getCatalogInfo,
);

/**
 * 获取 Catalog 下的 Unit 列表（用于教材目录页）
 * GET /api/catalogs/:catalogId/units
 * 权限：仅 contributor、editor、admin 可访问
 */
router.get(
  '/catalogs/:catalogId/units',
  authGuard,
  requireRole(['contributor', 'editor', 'admin']),
  catalogInfoController.getCatalogUnits,
);

/**
 * 搜索指定 catalog + unit 的资源（第一条被"定死"的教材搜索 SQL）
 * GET /api/catalogs/:catalogId/units/:unit/resources
 * 权限：仅 contributor、editor、admin 可访问
 * 
 * 场景：用户在"教材目录页"点击某个 unit
 * 搜索条件固定为：subject, grade, textbook_version, unit, status = approved
 */
router.get(
  '/catalogs/:catalogId/units/:unit/resources',
  authGuard,
  requireRole(['contributor', 'editor', 'admin']),
  catalogUnitSearchController.searchResourcesByCatalogUnit,
);

/**
 * 导出路由
 */
export default router;

