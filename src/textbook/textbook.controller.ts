import { Request, Response, NextFunction } from 'express';
import { connection } from '../app/database/mysql';
import {
  createTextbook,
  getTextbookById,
  getTextbookByResourceId,
  createTextbookStructures,
  getTextbookStructureTree,
  bindResourceToCatalogByAutoMeta,
} from './textbook.service';
import {
  extractTextbookInfo,
  parseTextbookStructure,
} from './textbook-parser.service';
import { TextbookModel } from './textbook.model';

/**
 * 获取教材信息（包含结构树）
 */
export const show = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const textbookId = parseInt(id, 10);

    // 获取教材基本信息
    const textbook = await getTextbookById(textbookId);

    // 获取结构树
    const structureTree = await getTextbookStructureTree(textbookId);

    response.send({
      textbook: textbook,
      structure: structureTree,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 根据 resource_id 获取教材信息
 */
export const showByResourceId = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { resourceId } = request.params;
    const resourceIdNum = parseInt(resourceId, 10);

    const textbook = await getTextbookByResourceId(resourceIdNum);

    if (!textbook) {
      return response.status(404).send({ error: '教材不存在' });
    }

    // 获取结构树
    const structureTree = await getTextbookStructureTree(textbook.id);

    response.send({
      textbook: textbook,
      structure: structureTree,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 处理教材文件上传后的结构化入库
 */
export async function processTextbookUpload(
  resourceId: number,
  filePath: string,
  filename: string
): Promise<number> {
  try {
    console.log(`[教材解析] 开始处理资源 ID: ${resourceId}`);

    // 1. 提取教材基本信息
    const textbookInfo = await extractTextbookInfo(filePath, filename, resourceId);

    // 设置默认值
    const textbookData: TextbookModel = {
      title: textbookInfo.title || filename.replace(/\.[^.]+$/, ''),
      cover_url: null, // TODO: 提取封面
      description: textbookInfo.description || null,
      education_level: textbookInfo.education_level || '小学',
      subject: textbookInfo.subject || '其他',
      textbook_version: textbookInfo.textbook_version || null,
      volume: textbookInfo.volume || '上册',
      resource_id: resourceId,
      source_type: 'official',
      status: 'approved', // 开发环境直接批准
    };

    // 2. 创建教材记录
    const createResult: any = await createTextbook(textbookData);
    const textbookId = createResult.insertId;

    console.log(`[教材解析] 教材创建成功，ID: ${textbookId}`);

    // 3. 解析目录结构
    const structures = await parseTextbookStructure(filePath, textbookId);

    if (structures.length > 0) {
      // 批量插入所有结构节点（service层会处理parent_id的更新）
      await createTextbookStructures(structures);
      console.log(`[教材解析] 目录结构创建成功，共 ${structures.length} 个节点`);
    } else {
      console.log(`[教材解析] 未解析到目录结构`);
    }

    return textbookId;
  } catch (error) {
    console.error(`[教材解析] 处理失败:`, error);
    throw error;
  }
}

/**
 * 获取资源关联的教材信息（用于 resource.controller.ts）
 */
export const getResourceTextbooks = async (resourceId: number) => {
  const statement = `
    SELECT
      textbook_catalog.id,
      textbook_catalog.education_level,
      textbook_catalog.grade,
      textbook_catalog.subject,
      textbook_catalog.textbook_version,
      textbook_catalog.volume
    FROM resource_textbook_map
    JOIN textbook_catalog ON resource_textbook_map.textbook_catalog_id = textbook_catalog.id
    WHERE resource_textbook_map.resource_id = ?
  `;
  
  const [data] = await connection.promise().query(statement, resourceId);
  return data;
};

/**
 * 获取教材目录列表（骨架）
 */
export const getTextbookCatalogList = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const statement = `
      SELECT *
      FROM textbook_catalog
      ORDER BY education_level, grade, subject, textbook_version, volume
    `;
    
    const [data] = await connection.promise().query(statement);
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 绑定资源到教材目录
 */
export const bindResourceToTextbook = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const { textbook_catalog_id } = request.body;
    
    // 验证资源是否存在
    const resourceCheck = await connection.promise().query(
      'SELECT id FROM resource WHERE id = ?',
      [id]
    );
    if (!(resourceCheck[0] as any[]).length) {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }
    
    // 验证教材目录是否存在
    const catalogCheck = await connection.promise().query(
      'SELECT id FROM textbook_catalog WHERE id = ?',
      [textbook_catalog_id]
    );
    if (!(catalogCheck[0] as any[]).length) {
      return next(new Error('TEXTBOOK_CATALOG_NOT_FOUND'));
    }
    
    // 插入关联（幂等）
    const statement = `
      INSERT INTO resource_textbook_map (resource_id, textbook_catalog_id, source)
      VALUES (?, ?, 'manual')
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;
    
    await connection.promise().query(statement, [id, textbook_catalog_id]);
    response.send({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * 根据 auto_meta_result 自动绑定资源到教材目录
 * POST /api/resources/:id/bind-catalog-from-auto-meta
 */
export const bindResourceToCatalogFromAutoMeta = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const resourceId = parseInt(id, 10);
    
    // 验证资源是否存在
    const resourceCheck = await connection.promise().query(
      'SELECT id FROM resource WHERE id = ?',
      [resourceId]
    );
    if (!(resourceCheck[0] as any[]).length) {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }
    
    // 执行绑定
    const catalogId = await bindResourceToCatalogByAutoMeta(resourceId);
    
    if (catalogId === null) {
      return response.status(400).send({
        success: false,
        message: '无法绑定：资源缺少 auto_meta_result 或未找到匹配的教材目录',
      });
    }
    
    response.send({
      success: true,
      message: '绑定成功',
      resource_id: resourceId,
      textbook_catalog_id: catalogId,
    });
  } catch (error) {
    next(error);
  }
};
