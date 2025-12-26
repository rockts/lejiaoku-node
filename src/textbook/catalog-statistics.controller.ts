/**
 * Catalog 统计控制器
 * 提供基于 catalog 的资源统计接口
 */

import { Request, Response, NextFunction } from 'express';
import * as catalogStatisticsService from './catalog-statistics.service';

/**
 * 获取所有 catalog 的统计信息
 * GET /api/admin/catalogs/statistics
 * 权限：仅 admin
 */
export const getCatalogStatistics = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const statistics = await catalogStatisticsService.getCatalogStatistics();

    response.json({
      success: true,
      data: statistics,
      count: statistics.length,
      message: `成功获取 ${statistics.length} 个 catalog 的统计信息`,
    });
  } catch (error) {
    console.error('获取 catalog 统计信息失败:', error);
    next(error);
  }
};

/**
 * 获取指定 catalog 下所有 unit 的统计信息
 * GET /api/admin/catalogs/:id/units/statistics
 * 权限：仅 admin
 */
export const getCatalogUnitStatistics = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const catalogId = parseInt(id, 10);

    if (isNaN(catalogId)) {
      return response.status(400).json({
        success: false,
        message: '无效的 catalog ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    const statistics = await catalogStatisticsService.getCatalogUnitStatistics(catalogId);

    response.json({
      success: true,
      data: statistics,
      catalog_id: catalogId,
      count: statistics.length,
      message: `成功获取 catalog ${catalogId} 下 ${statistics.length} 个 unit 的统计信息`,
    });
  } catch (error) {
    console.error('获取 catalog unit 统计信息失败:', error);
    next(error);
  }
};

/**
 * 获取指定 catalog 的质量诊断信息
 * GET /api/admin/catalogs/:id/quality
 * 权限：仅 admin
 */
export const getCatalogQualityDiagnosis = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const catalogId = parseInt(id, 10);

    if (isNaN(catalogId)) {
      return response.status(400).json({
        success: false,
        message: '无效的 catalog ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    const diagnosis = await catalogStatisticsService.getCatalogQualityDiagnosis(catalogId);

    if (!diagnosis) {
      return response.status(404).json({
        success: false,
        message: 'Catalog 不存在',
        error: 'CATALOG_NOT_FOUND',
      });
    }

    response.json({
      success: true,
      data: diagnosis,
      message: `成功获取 catalog ${catalogId} 的质量诊断信息`,
    });
  } catch (error) {
    console.error('获取 catalog 质量诊断信息失败:', error);
    next(error);
  }
};

