import express from 'express';
import * as postController from './post.controller';
import { authGuard, accessControl } from '../auth/auth.middleware';
import { sort, filter, paginate } from './post.middleware';
import { POSTS_PER_PAGE } from '../app/app.config';

const router = express.Router();

/**
 * @deprecated Post 模块已废弃，请使用 Resource 模块
 * 
 * Post 模块的所有功能已由 Resource 模块完整替代：
 * - GET /posts → GET /api/resources
 * - POST /posts → POST /api/resources
 * - GET /posts/:postId → GET /api/resources/:id
 * - PATCH /posts/:postId → 使用管理员接口 PATCH /api/admin/resources/:id/status
 * - DELETE /posts/:postId → 使用管理员接口（暂未实现）
 * 
 * 此模块保留仅用于向后兼容，新功能请使用 Resource 模块。
 * 相关迁移计划请参考：docs/migration/post-to-resource-migration-plan.md
 */

/**
 * 内容列表
 * @deprecated 请使用 GET /api/resources
 */
router.get(
    '/posts',
    sort,
    filter,
    paginate(POSTS_PER_PAGE),
    postController.index,
);

/**
 * 创建内容
 * @deprecated 请使用 POST /api/resources
 */
router.post('/posts', authGuard, postController.store);

/**
 * 更新内容
 * @deprecated 请使用管理员接口 PATCH /api/admin/resources/:id/status
 */
router.patch(
    '/posts/:postId',
    authGuard,
    accessControl({ possession: true }),
    postController.update,
);

/**
 * 删除内容
 * @deprecated 请使用管理员接口（暂未实现）
 */
router.delete(
    '/posts/:postId',
    authGuard,
    accessControl({ possession: true }),
    postController.destroy,
);



/**
 * 添加内容标签
 * @deprecated 请使用 Resource 模块的标签功能（如需要）
 */
router.post(
    '/posts/:postId/tag',
    authGuard,
    accessControl({ possession: true }),
    postController.storePostTag,
);

/**
 * 移除内容标签
 * @deprecated 请使用 Resource 模块的标签功能（如需要）
 */
router.delete(
    '/posts/:postId/tag',
    authGuard,
    accessControl({ possession: true }),
    postController.destroyPostTag,
);

/**
 * 单个内容
 * @deprecated 请使用 GET /api/resources/:id
 */
router.get('/posts/:postId', postController.show);

/**
 * 导出路由
 */
export default router;
