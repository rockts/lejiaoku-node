import { Request, Response, NextFunction } from 'express';
import { getAutoMetaByResourceId } from './resource-auto-meta.service';
import { getResourceById } from './resource.service';

/**
 * 获取资源的自动解析元数据
 */
export const getAutoMeta = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const { id } = request.params;
  const resourceId = parseInt(id, 10);

  if (isNaN(resourceId)) {
    return next(new Error('INVALID_ID'));
  }

  try {
    // 验证资源是否存在
    await getResourceById(resourceId);
  } catch (error) {
    return next(new Error('RESOURCE_NOT_FOUND'));
  }

  try {
    const meta = await getAutoMetaByResourceId(resourceId);

    if (!meta) {
      // 如果还没有解析记录，返回 processing 状态
      return response.send({
        status: 'processing',
        message: '解析中，请稍后重试',
      });
    }

    // 返回解析结果
    response.send({
      status: meta.status,
      data: {
        title: meta.auto_title,
        subject: meta.auto_subject,
        grade: meta.auto_grade,
        volume: meta.auto_volume,
        textbook_version: meta.auto_version,
        description: meta.auto_description,
        cover_url: meta.auto_cover_url,
        confidence: meta.confidence,
      },
    });
  } catch (error) {
    next(error);
  }
};


