import express from 'express';
import {
  show,
  showByResourceId,
  getTextbookCatalogList,
  bindResourceToTextbook,
  bindResourceToCatalogFromAutoMeta,
} from './textbook.controller';
import * as catalogStatisticsController from './catalog-statistics.controller';
import { authGuard, requireRole } from '../auth/auth.middleware';
import { adminGuard } from '../auth/admin.middleware';

const router = express.Router();

/**
 * 获取所有教材目录骨架
 */
router.get('/textbook-catalog', getTextbookCatalogList);

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
 * 导出路由
 */
export default router;

