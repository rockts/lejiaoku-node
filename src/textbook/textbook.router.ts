import express from 'express';
import {
  show,
  showByResourceId,
  getTextbookCatalogList,
  bindResourceToTextbook,
  bindResourceToCatalogFromAutoMeta,
} from './textbook.controller';

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
 * 导出路由
 */
export default router;

