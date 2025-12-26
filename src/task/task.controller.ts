/**
 * Catalog 任务控制器
 * 提供任务创建和查询接口
 */

import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';

/**
 * 创建任务
 * POST /api/tasks
 * 权限：需要登录
 */
export const createTask = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    const { task_type, catalog_id, unit } = request.body;

    // 简单校验
    if (!task_type || !['add_resources', 'organize_units'].includes(task_type)) {
      return response.status(400).json({
        success: false,
        message: 'task_type 必须是 add_resources 或 organize_units',
        error: 'INVALID_TASK_TYPE',
      });
    }

    if (!catalog_id || isNaN(parseInt(catalog_id, 10))) {
      return response.status(400).json({
        success: false,
        message: 'catalog_id 必须是一个有效的数字',
        error: 'INVALID_CATALOG_ID',
      });
    }

    // 创建任务
    const result = await taskService.createTask({
      task_type,
      catalog_id: parseInt(catalog_id, 10),
      unit: unit || null,
      created_by: userId,
      status: 'pending',
    });

    response.status(201).json({
      success: true,
      message: '任务创建成功',
      data: {
        id: result.insertId,
        task_type,
        catalog_id: parseInt(catalog_id, 10),
        unit: unit || null,
        created_by: userId,
        status: 'pending',
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    next(error);
  }
};

/**
 * 获取我的任务列表
 * GET /api/tasks/mine
 * 权限：需要登录
 */
export const getMyTasks = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    const tasks = await taskService.getMyPendingTasks(userId);

    response.json({
      success: true,
      data: tasks,
      count: tasks.length,
      message: `成功获取 ${tasks.length} 个待处理任务`,
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    next(error);
  }
};

