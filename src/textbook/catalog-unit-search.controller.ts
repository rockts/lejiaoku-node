/**
 * Catalog Unit 搜索控制器
 * 提供教材目录页点击 unit 后的资源搜索接口
 */

import { Request, Response, NextFunction } from 'express';
import * as catalogUnitSearchService from './catalog-unit-search.service';
import { getFullUrl } from '../resource/resource.controller';

/**
 * 搜索指定 catalog + unit 的资源
 * GET /api/catalogs/:catalogId/units/:unit/resources
 * 权限：公开（无需登录）
 * 
 * 这是第一条被"定死"的教材搜索 SQL
 * 场景：用户在"教材目录页"点击某个 unit
 * 搜索条件固定为：subject, grade, textbook_version, unit, status = approved
 */
export const searchResourcesByCatalogUnit = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { catalogId, unit } = request.params;
    const id = parseInt(catalogId, 10);

    if (isNaN(id)) {
      return response.status(400).json({
        success: false,
        message: '无效的 catalog ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    if (!unit || unit.trim() === '') {
      return response.status(400).json({
        success: false,
        message: 'unit 参数不能为空',
        error: 'INVALID_UNIT',
      });
    }

    // 支持分页
    const page = parseInt((request.query.page as string) || '1', 10);
    const limit = parseInt((request.query.limit as string) || '30', 10);
    const offset = (page - 1) * limit;

    // 统计资源总数
    const totalCount = await catalogUnitSearchService.countResourcesByCatalogUnit(id, unit);

    // 获取资源列表
    const resources = await catalogUnitSearchService.searchResourcesByCatalogUnit(id, unit, {
      limit,
      offset,
    });

    // 转换 file_url 和 cover_url 为完整 URL
    const resourcesWithFullUrl = resources.map((resource: any) => {
      if (resource.file_url && resource.file_url.startsWith('/')) {
        resource.file_url = getFullUrl(request, resource.file_url);
      }
      if (resource.cover_url && resource.cover_url.startsWith('/')) {
        resource.cover_url = getFullUrl(request, resource.cover_url);
      }
      return resource;
    });

    // 设置响应头部
    response.header('X-Total-Count', totalCount.toString());

    response.json({
      success: true,
      data: resourcesWithFullUrl,
      catalog_id: id,
      unit: unit,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
      message: `成功获取 catalog ${id} 的 unit "${unit}" 下 ${resources.length} 条资源`,
    });
  } catch (error) {
    console.error('搜索 catalog unit 资源失败:', error);
    next(error);
  }
};

