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
/**
 * 将学段从英文转换为中文（用于前端显示）
 */
const convertEducationLevelToChinese = (educationLevel: string): string => {
  if (!educationLevel || typeof educationLevel !== 'string') {
    return educationLevel;
  }
  
  const levelMap: { [key: string]: string } = {
    'elementary': '小学',
    'middle': '初中',
    'junior': '初中',
    '小学': '小学',
    '初中': '初中',
  };
  
  const trimmed = educationLevel.trim();
  if (levelMap[trimmed]) {
    return levelMap[trimmed];
  }
  
  const normalized = trimmed.toLowerCase();
  return levelMap[normalized] || educationLevel;
};

export const getTextbookCatalogList = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 获取查询参数
    const educationLevel = request.query.education_level as string | undefined; // 学段筛选：'elementary' 或 'middle' 或 '小学' 或 '初中'
    const grade = request.query.grade as string | undefined; // 年级筛选
    const subject = request.query.subject as string | undefined; // 学科筛选
    const textbookVersion = request.query.textbook_version as string | undefined; // 教材版本筛选
    const page = parseInt(request.query.page as string || '1', 10); // 页码，默认第1页
    const limit = parseInt(request.query.limit as string || '20', 10); // 每页数量，默认20条
    const offset = (page - 1) * limit;

    // 构建 WHERE 条件
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (educationLevel) {
      // 支持中文和英文两种格式
      const levelValue = educationLevel === '小学' || educationLevel === 'elementary' 
        ? 'elementary' 
        : educationLevel === '初中' || educationLevel === 'middle' 
        ? 'middle' 
        : educationLevel;
      whereConditions.push('education_level = ?');
      params.push(levelValue);
    }

    if (grade) {
      whereConditions.push('grade = ?');
      params.push(grade);
    }

    // 特殊处理：如果指定了版本但没有指定学科，需要根据版本限制学科
    // 规则：
    // - 部编版：只用于 语文、道德与法治、历史
    // - 教科版：只用于 科学
    // - 美术出版社：只用于 美术、书法练习指导
    if (textbookVersion && !subject) {
      if (textbookVersion === '部编版') {
        // 部编版只用于：语文、道德与法治、历史
        // 根据学段决定：小学有语文、道德与法治；初中有语文、道德与法治、历史
        const levelValue = educationLevel === '小学' || educationLevel === 'elementary' 
          ? 'elementary' 
          : educationLevel === '初中' || educationLevel === 'middle' 
          ? 'middle' 
          : educationLevel;
        
        if (levelValue === 'elementary') {
          // 小学：语文、道德与法治
          whereConditions.push('subject IN (?, ?)');
          params.push('语文', '道德与法治');
        } else if (levelValue === 'middle') {
          // 初中：语文、道德与法治、历史
          whereConditions.push('subject IN (?, ?, ?)');
          params.push('语文', '道德与法治', '历史');
        } else {
          // 如果学段也不确定，包含所有可能的学科
          whereConditions.push('subject IN (?, ?, ?)');
          params.push('语文', '道德与法治', '历史');
        }
      } else if (textbookVersion === '教科版') {
        // 教科版只用于：科学（只有小学）
        whereConditions.push('subject = ?');
        params.push('科学');
      } else if (textbookVersion === '美术出版社') {
        // 美术出版社只用于：美术、书法练习指导
        whereConditions.push('subject IN (?, ?)');
        params.push('美术', '书法练习指导');
      } else {
        // 其他版本：如果指定了版本但没有指定学科，不限制学科
        // 保持原有逻辑
      }
    } else if (subject) {
      // 如果指定了学科，直接使用
      whereConditions.push('subject = ?');
      params.push(subject);
    }

    if (textbookVersion) {
      whereConditions.push('textbook_version = ?');
      params.push(textbookVersion);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 查询总数
    const countStatement = `
      SELECT COUNT(*) as total
      FROM textbook_catalog
      ${whereClause}
    `;
    const [countResult]: any = await connection.promise().query(countStatement, params);
    const total = countResult[0]?.total || 0;

    // 查询数据
    const statement = `
      SELECT *
      FROM textbook_catalog
      ${whereClause}
      ORDER BY 
        CASE education_level 
          WHEN 'elementary' THEN 1 
          WHEN 'middle' THEN 2 
          ELSE 3 
        END,
        grade, subject, textbook_version, volume
      LIMIT ? OFFSET ?
    `;
    
    const [data] = await connection.promise().query(statement, [...params, limit, offset]);
    
    // 转换 education_level 为中文
    const catalogs = (data as any[]).map((catalog: any) => {
      const originalLevel = catalog.education_level;
      const chineseLevel = convertEducationLevelToChinese(originalLevel);
      return {
        ...catalog,
        education_level: chineseLevel,
      };
    });
    
    // 确保排序：小学在前，初中在后（防止前端或其他地方重新排序）
    // 使用稳定的排序逻辑
    catalogs.sort((a, b) => {
      // 定义学段排序优先级
      const getLevelOrder = (level: string | null | undefined): number => {
        if (!level) return 99;
        const levelStr = String(level).trim();
        if (levelStr === '小学' || levelStr === 'elementary') return 1;
        if (levelStr === '初中' || levelStr === 'middle' || levelStr === 'junior') return 2;
        return 99;
      };
      
      const orderA = getLevelOrder(a.education_level);
      const orderB = getLevelOrder(b.education_level);
      
      // 首先按学段排序
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 如果学段相同，按其他字段排序
      if (a.grade !== b.grade) {
        const gradeA = String(a.grade || '').padStart(2, '0');
        const gradeB = String(b.grade || '').padStart(2, '0');
        return gradeA.localeCompare(gradeB);
      }
      if (a.subject !== b.subject) return (a.subject || '').localeCompare(b.subject || '');
      if (a.textbook_version !== b.textbook_version) return (a.textbook_version || '').localeCompare(b.textbook_version || '');
      return (a.volume || '').localeCompare(b.volume || '');
    });
    
    // 返回分页结果
    response.send({
      data: catalogs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
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
