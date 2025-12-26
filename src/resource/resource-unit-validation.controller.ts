/**
 * 资源单元字段校验控制器
 */
import { Request, Response, NextFunction } from 'express';
import * as resourceUnitValidationService from './resource-unit-validation.service';

/**
 * 获取未填写 unit 的资源列表（仅 admin）
 */
export const getResourcesMissingUnit = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const resources = await resourceUnitValidationService.getResourcesMissingUnit();

    response.json({
      success: true,
      data: resources,
      count: resources.length,
      message: resources.length > 0 
        ? `发现 ${resources.length} 条资源未填写 unit 字段`
        : '所有已审核资源都已填写 unit 字段',
    });
  } catch (error) {
    console.error('获取未填写 unit 的资源列表失败:', error);
    next(error);
  }
};

/**
 * 批量设置资源的 unit 和 unit_index（仅 admin）
 */
export const batchSetUnit = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { resource_ids, unit, unit_index } = request.body;

    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return response.status(400).json({
        success: false,
        message: 'resource_ids 必须是非空数组',
        error: 'INVALID_RESOURCE_IDS',
      });
    }

    if (!unit || typeof unit !== 'string' || unit.trim() === '') {
      return response.status(400).json({
        success: false,
        message: 'unit 必须是非空字符串',
        error: 'INVALID_UNIT',
      });
    }

    const result = await resourceUnitValidationService.batchSetResourceUnit(
      resource_ids,
      unit.trim(),
      unit_index || null,
    );

    response.json({
      success: true,
      message: `成功为 ${result.updatedCount} 条资源设置 unit`,
      data: result,
    });
  } catch (error) {
    console.error('批量设置 unit 失败:', error);
    next(error);
  }
};

