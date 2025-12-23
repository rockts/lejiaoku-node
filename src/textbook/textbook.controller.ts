import { Request, Response, NextFunction } from 'express';
import {
  getTextbookCatalogList,
  getTextbookCatalogById,
  getResourceTextbookList,
  createResourceTextbookMap,
  checkResourceExists,
} from './textbook.service';

/**
 * 获取所有教材骨架
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const catalogs = await getTextbookCatalogList();
    response.send(catalogs);
  } catch (error) {
    next(error);
  }
};

/**
 * 绑定资源与教材
 */
export const bindTextbook = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const { id } = request.params;
  const { textbook_catalog_id } = request.body;

  // 验证参数
  if (!textbook_catalog_id) {
    return next(new Error('TEXTBOOK_CATALOG_ID_IS_REQUIRED'));
  }

  const resourceId = parseInt(id, 10);
  const catalogId = parseInt(textbook_catalog_id, 10);

  if (isNaN(resourceId) || isNaN(catalogId)) {
    return next(new Error('INVALID_ID'));
  }

  try {
    // 检查资源是否存在
    const resourceExists = await checkResourceExists(resourceId);
    if (!resourceExists) {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }

    // 检查教材骨架是否存在
    const catalog = await getTextbookCatalogById(catalogId);
    if (!catalog) {
      return next(new Error('TEXTBOOK_CATALOG_NOT_FOUND'));
    }

    // 创建关联（使用 INSERT IGNORE 实现幂等）
    await createResourceTextbookMap({
      resource_id: resourceId,
      textbook_catalog_id: catalogId,
      source: 'manual',
      confidence: null,
    });

    // 返回成功响应
    response.status(201).send({
      message: '绑定成功',
      resource_id: resourceId,
      textbook_catalog_id: catalogId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取资源关联的教材列表（用于在资源详情中附加教材信息）
 */
export const getResourceTextbooks = async (
  resourceId: number,
): Promise<any[]> => {
  try {
    const textbooks: any = await getResourceTextbookList(resourceId);
    // 格式化返回数据
    if (Array.isArray(textbooks)) {
      return textbooks.map((item: any) => ({
        id: item.textbook_id,
        education_level: item.education_level,
        grade: item.grade,
        subject: item.subject,
        textbook_version: item.textbook_version,
        volume: item.volume,
        source: item.source,
        bind_time: item.created_at,
      }));
    }
    return [];
  } catch (error) {
    // 如果出错，返回空数组，不影响主流程
    return [];
  }
};

