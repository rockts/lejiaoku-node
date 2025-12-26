/**
 * Catalog 任务路由
 */

import express from 'express';
import * as taskController from './task.controller';
import { authGuard } from '../auth/auth.middleware';

const router = express.Router();

/**
 * 创建任务
 * POST /api/tasks
 * 权限：需要登录
 */
router.post(
  '/tasks',
  authGuard,
  taskController.createTask,
);

/**
 * 获取我的任务列表
 * GET /api/tasks/mine
 * GET /api/tasks/my (别名)
 * GET /my/tasks (别名，兼容前端可能使用的路径)
 * 权限：需要登录
 */
router.get(
  '/tasks/mine',
  authGuard,
  taskController.getMyTasks,
);

// 别名：支持 /api/tasks/my
router.get(
  '/tasks/my',
  authGuard,
  taskController.getMyTasks,
);

// 别名：支持 /my/tasks（需要单独挂载）
router.get(
  '/my/tasks',
  authGuard,
  taskController.getMyTasks,
);

export default router;

