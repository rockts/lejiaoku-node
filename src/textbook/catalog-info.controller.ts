/**
 * Catalog Info 控制器
 * 提供教材目录页专用的接口
 */

import { Request, Response, NextFunction } from 'express';
import * as catalogInfoService from './catalog-info.service';

/**
 * 获取 Catalog 基本信息（用于教材目录页）
 * GET /api/catalogs/:catalogId/info
 * 权限：公开（无需登录）
 */
export const getCatalogInfo = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { catalogId } = request.params;
    const id = parseInt(catalogId, 10);

    if (isNaN(id)) {
      return response.status(400).json({
        success: false,
        message: '无效的 catalog ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    const catalogInfo = await catalogInfoService.getCatalogInfo(id);

    if (!catalogInfo) {
      return response.status(404).json({
        success: false,
        message: `未找到 catalog ID 为 ${id} 的信息`,
        error: 'CATALOG_NOT_FOUND',
      });
    }

    response.json({
      success: true,
      data: catalogInfo,
      message: `成功获取 catalog ${id} 的信息`,
    });
  } catch (error) {
    console.error('获取 catalog 信息失败:', error);
    next(error);
  }
};

/**
 * 获取 Catalog 下的 Unit 列表（用于教材目录页）
 * GET /api/catalogs/:catalogId/units
 * 权限：公开（无需登录）
 */
export const getCatalogUnits = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { catalogId } = request.params;
    const id = parseInt(catalogId, 10);

    if (isNaN(id)) {
      return response.status(400).json({
        success: false,
        message: '无效的 catalog ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    const units = await catalogInfoService.getCatalogUnits(id);

    response.json({
      success: true,
      data: units,
      catalog_id: id,
      count: units.length,
      message: `成功获取 catalog ${id} 下 ${units.length} 个 unit`,
    });
  } catch (error) {
    console.error('获取 catalog units 失败:', error);
    next(error);
  }
};

