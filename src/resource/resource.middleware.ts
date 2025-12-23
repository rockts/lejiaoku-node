import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * 确保上传目录存在
 */
const uploadDir = 'uploads/resources';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 文件过滤器 - 允许教学资源文件格式
 */
const resourceFileFilter = (
  request: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => {
  // 允许的文件类型
  const allowedTypes = [
    'application/pdf', // PDF
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'application/vnd.ms-powerpoint', // PPT
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'image/png',
    'image/jpeg',
    'image/jpg',
    'video/mp4',
    'video/quicktime',
  ];

  const allowed = allowedTypes.some(type => type === file.mimetype);

  if (allowed) {
    callback(null, true);
  } else {
    callback(new Error('FILE_TYPE_NOT_ACCEPT'));
  }
};

/**
 * Multer 存储配置 - 自定义文件名
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 文件名格式：时间戳 + 原始文件名（安全处理）
    const timestamp = Date.now();
    
    // 安全处理原始文件名：彻底清理所有危险字符
    let originalName = file.originalname || '';
    
    // 1. 移除所有 null bytes 和不可打印字符
    originalName = originalName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // 2. 移除路径分隔符和特殊字符（避免路径遍历攻击）
    originalName = originalName.replace(/[\/\\?%*:|"<>]/g, '');
    
    // 3. 尝试安全解码（如果包含非ASCII字符）
    try {
      // 先移除所有 null bytes
      const cleaned = originalName.replace(/\0/g, '');
      // 尝试从 latin1 解码到 utf8
      if (cleaned !== originalName || /[\x80-\xFF]/.test(cleaned)) {
        try {
          originalName = Buffer.from(cleaned, 'latin1').toString('utf8');
          // 再次清理（解码后可能产生新的问题字符）
          originalName = originalName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        } catch (e) {
          // 解码失败，使用清理后的原始名称
          originalName = cleaned;
        }
      } else {
        originalName = cleaned;
      }
    } catch (e) {
      // 如果处理失败，使用默认名称
      originalName = 'file';
    }
    
    // 4. 先提取扩展名（在清理之前，避免丢失）
    const originalExt = path.extname(originalName) || '';
    let originalBaseName = path.basename(originalName, originalExt) || 'file';
    
    // 5. 清理文件名主体部分（不包括扩展名）
    originalBaseName = originalBaseName.replace(/\s+/g, '_'); // 空格替换为下划线
    originalBaseName = originalBaseName.replace(/[^\w\-_]/g, ''); // 只保留字母、数字、下划线、连字符（不包括点，因为扩展名已分离）
    
    // 6. 如果文件名为空，使用默认名称
    if (!originalBaseName || originalBaseName.trim() === '') {
      originalBaseName = 'file';
    }
    
    // 7. 清理扩展名（移除危险字符，保留字母、数字、点）
    const safeExt = originalExt.replace(/[^\w\.]/g, '').substring(0, 10);
    
    // 8. 限制文件名长度（避免过长）
    let name = originalBaseName.substring(0, 100);
    
    // 9. 生成最终文件名：时间戳-文件名.扩展名
    const filename = `${timestamp}-${name}${safeExt}`;
    
    // 10. 最终验证：确保文件名不包含 null bytes
    if (filename.indexOf('\0') >= 0) {
      cb(new Error('生成的文件名包含非法字符'), '');
      return;
    }
    
    cb(null, filename);
  },
});

/**
 * 创建 Multer 实例
 */
const resourceUpload = multer({
  storage: storage,
  fileFilter: resourceFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

/**
 * 文件上传拦截器
 */
export const resourceFileInterceptor = resourceUpload.single('file');

/**
 * 过滤列表
 */
export const filter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 解构查询参数
  const { keyword, category, subject, grade, textbook } = request.query;

  // 设置默认的过滤
  let sql = 'resource.status = "approved"';
  const params: Array<any> = [];

  // 按关键词过滤（搜索标题和描述）
  if (keyword) {
    sql += ' AND (resource.title LIKE ? OR resource.description LIKE ?)';
    const keywordPattern = `%${keyword}%`;
    params.push(keywordPattern, keywordPattern);
  }

  // 按教学用途分类过滤
  if (category) {
    sql += ' AND resource.category = ?';
    params.push(category);
  }

  // 按学科过滤
  if (subject) {
    sql += ' AND resource.subject = ?';
    params.push(subject);
  }

  // 按年级过滤
  if (grade) {
    sql += ' AND resource.grade = ?';
    params.push(parseInt(grade as string, 10));
  }

  // 按教材版本过滤
  if (textbook) {
    sql += ' AND resource.textbook = ?';
    params.push(textbook);
  }

  // 设置请求中的过滤
  request.filter = {
    name: 'default',
    sql: sql,
    params: params,
  };

  // 下一步
  next();
};

/**
 * 资源分页
 */
export const paginate = (itemsPerPage: number = 30) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    // 当前页码
    const { page = 1 } = request.query;

    // 每页内容数量
    const limit = itemsPerPage;

    // 计算出偏移量
    const offset = limit * (parseInt(page as string, 10) - 1);

    // 设置请求中的分页
    request.pagination = { limit, offset };

    // 下一步
    next();
  };
};
