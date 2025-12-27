/**
 * 用户资源列表接口
 * 获取指定用户的资源列表
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceList, getResourceTotalCount } from './resource.service';
import { getFullUrl } from './resource.controller';
import { enrichResourceListWithCatalogInfo } from './resource-helper.service';
import { connection } from '../app/database/mysql';

/**
 * 获取指定用户的资源列表
 * GET /api/users/:userId/resources
 * 权限：公开访问（只返回已审核的资源）
 */
export const getUserResources = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = request.params;
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      return response.status(400).json({
        success: false,
        message: '无效的用户ID',
        error: 'INVALID_USER_ID',
      });
    }

    // 检查用户是否存在
    const userCheckStatement = `SELECT id FROM user WHERE id = ?`;
    const [userCheck] = await connection.promise().query(userCheckStatement, [userIdNum]);
    
    if (!userCheck || (userCheck as any[]).length === 0) {
      return response.status(404).json({
        success: false,
        message: '用户不存在',
        error: 'USER_NOT_FOUND',
      });
    }

    // 构建过滤条件：只返回该用户的已审核资源
    const filter = {
      name: 'userResources',
      sql: `resource.user_id = ? AND resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`,
      params: [userIdNum],
    };

    // 支持分页
    const page = parseInt((request.query.page as string) || '1', 10);
    const limit = parseInt((request.query.limit as string) || '30', 10);
    const offset = (page - 1) * limit;

    const pagination = {
      limit,
      offset,
    };

    // 统计资源数量
    try {
      const totalCount = await getResourceTotalCount({ filter });
      response.header('X-Total-Count', totalCount.toString());
    } catch (error) {
      // 如果统计失败，继续执行
    }

    // 获取资源列表
    const resources: any = await getResourceList({
      filter,
      pagination,
    });

    // 将 file_url 和 cover_url 转换为完整 URL
    if (Array.isArray(resources)) {
      const resourcesWithFullUrl = resources.map((resource: any) => {
        if (resource.file_url && resource.file_url.startsWith('/')) {
          resource.file_url = getFullUrl(request, resource.file_url);
        }
        if (resource.cover_url && resource.cover_url.startsWith('/')) {
          resource.cover_url = getFullUrl(request, resource.cover_url);
        }
        return resource;
      });

      // 为资源列表添加 catalog_info
      const resourcesWithCatalogInfo = await enrichResourceListWithCatalogInfo(resourcesWithFullUrl);
      response.send(resourcesWithCatalogInfo);
    } else {
      response.send(resources);
    }
  } catch (error) {
    console.error('获取用户资源列表失败:', error);
    next(error);
  }
};

