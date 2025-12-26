/**
 * 资源教材目录绑定控制器
 * 用于人工绑定资源到教材目录
 */

import { Request, Response, NextFunction } from 'express';
import {
  getUnboundResources,
  bindResourceToCatalog,
} from './resource-catalog-bind.service';
import { getResourceByIdForAdmin } from './resource.service';
import * as resourceUnitValidationService from './resource-unit-validation.service';

/**
 * 获取待人工绑定的资源列表
 * GET /admin/resources/unbound-catalog
 * 权限：admin / editor
 */
export const getUnboundResourcesList = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const resources = await getUnboundResources();

    response.json({
      success: true,
      data: resources,
      count: resources.length,
    });
  } catch (error) {
    console.error('获取待绑定资源列表失败:', error);
    next(error);
  }
};

/**
 * 人工绑定教材目录
 * POST /admin/resources/:id/bind-catalog
 * 权限：admin / editor
 */
export const bindCatalog = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const { catalog_id } = request.body;
    const operatorId = request.user?.id;

    // 参数验证
    const resourceId = parseInt(id, 10);
    const catalogId = catalog_id ? parseInt(String(catalog_id), 10) : null;

    if (isNaN(resourceId)) {
      return response.status(400).json({
        success: false,
        message: '无效的资源ID',
        error: 'INVALID_RESOURCE_ID',
      });
    }

    if (!catalogId || isNaN(catalogId)) {
      return response.status(400).json({
        success: false,
        message: '无效的教材目录ID',
        error: 'INVALID_CATALOG_ID',
      });
    }

    if (!operatorId) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    // 【系统级不变量】教材单元完整性硬约束
    // 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
    // 在绑定 catalog 前，检查资源是否有 unit
    const resource = await getResourceByIdForAdmin(resourceId);
    if (!resource) {
      return response.status(404).json({
        success: false,
        message: '资源不存在',
        error: 'RESOURCE_NOT_FOUND',
      });
    }

    if (!resource.unit || (typeof resource.unit === 'string' && resource.unit.trim() === '')) {
      return response.status(400).json({
        success: false,
        message: '该资源未设置所属单元，无法绑定教材。请先设置 unit 字段',
        error: 'UNIT_REQUIRED_FOR_CATALOG',
      });
    }

    // 执行绑定
    const result = await bindResourceToCatalog(resourceId, catalogId, operatorId);

    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: result.message,
        error: 'BIND_FAILED',
      });
    }

    response.json({
      success: true,
      message: result.message,
      data: {
        resource_id: resourceId,
        catalog_id: catalogId,
      },
    });
  } catch (error) {
    console.error('绑定教材目录失败:', error);
    next(error);
  }
};

