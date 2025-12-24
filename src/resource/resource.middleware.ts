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
 * 资源文件过滤器 - 允许教学资源文件格式（排除视频）
 */
const resourceFileFilter = (
  request: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => {
  // 允许的文件类型（视频已移除）
  const allowedTypes = [
    'application/pdf', // PDF
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'application/vnd.ms-powerpoint', // PPT
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'image/png',
    'image/jpeg',
    'image/jpg',
    // 视频类型已移除：'video/mp4', 'video/quicktime'
  ];

  // 明确拒绝视频类型
  if (file.mimetype && file.mimetype.startsWith('video/')) {
    callback(new Error('VIDEO_FILE_NOT_ACCEPT'));
    return;
  }

  const allowed = allowedTypes.some(type => type === file.mimetype);

  if (allowed) {
    callback(null, true);
  } else {
    callback(new Error('FILE_TYPE_NOT_ACCEPT'));
  }
};

/**
 * 封面图片过滤器
 */
const coverFileFilter = (
  request: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => {
  // 允许的图片类型
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
  ];

  const allowed = allowedTypes.some(type => type === file.mimetype);

  if (allowed) {
    callback(null, true);
  } else {
    callback(new Error('COVER_TYPE_NOT_ACCEPT'));
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
 * 封面存储配置
 */
const coverUploadDir = 'uploads/cover';
if (!fs.existsSync(coverUploadDir)) {
  fs.mkdirSync(coverUploadDir, { recursive: true });
}

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coverUploadDir);
  },
  filename: (req, file, cb) => {
    // 封面文件名：使用时间戳 + 原始文件名（简化处理）
    const timestamp = Date.now();
    const originalName = file.originalname || '';
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext).replace(/[^\w\-_]/g, '');
    const filename = `${timestamp}-${name || 'cover'}${ext}`;
    cb(null, filename);
  },
});

/**
 * 创建 Multer 实例（封面文件）
 */
const coverUpload = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * 资源文件上传拦截器（仅资源文件）
 */
export const resourceFileInterceptor = resourceUpload.single('file');

/**
 * 资源文件 + 封面文件上传拦截器（支持同时上传）
 * 使用 multer 的 fields 方法来处理多个文件字段
 */
export const resourceWithCoverInterceptor = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 使用 multer 的 fields 方法，但需要自定义 storage 来处理不同字段
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.fieldname === 'file') {
          cb(null, uploadDir);
        } else if (file.fieldname === 'cover') {
          cb(null, coverUploadDir);
        } else {
          cb(new Error('UNEXPECTED_FILE_FIELD'), '');
        }
      },
      filename: (req, file, cb) => {
        if (file.fieldname === 'file') {
          // 使用资源文件的文件名处理逻辑
          const timestamp = Date.now();
          let originalName = file.originalname || '';
          originalName = originalName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          originalName = originalName.replace(/[\/\\?%*:|"<>]/g, '');
          try {
            const cleaned = originalName.replace(/\0/g, '');
            if (/[\x80-\xFF]/.test(cleaned)) {
              try {
                originalName = Buffer.from(cleaned, 'latin1').toString('utf8');
                originalName = originalName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
              } catch (e) {
                originalName = cleaned;
              }
            } else {
              originalName = cleaned;
            }
          } catch (e) {
            originalName = 'file';
          }
          const originalExt = path.extname(originalName) || '';
          let originalBaseName = path.basename(originalName, originalExt) || 'file';
          originalBaseName = originalBaseName.replace(/\s+/g, '_');
          originalBaseName = originalBaseName.replace(/[^\w\-_]/g, '');
          if (!originalBaseName || originalBaseName.trim() === '') {
            originalBaseName = 'file';
          }
          const safeExt = originalExt.replace(/[^\w\.]/g, '').substring(0, 10);
          let name = originalBaseName.substring(0, 100);
          const filename = `${timestamp}-${name}${safeExt}`;
          cb(null, filename);
        } else if (file.fieldname === 'cover') {
          // 使用封面文件的简化逻辑
          const timestamp = Date.now();
          const originalName = file.originalname || '';
          const ext = path.extname(originalName);
          const name = path.basename(originalName, ext).replace(/[^\w\-_]/g, '');
          const filename = `${timestamp}-${name || 'cover'}${ext}`;
          cb(null, filename);
        } else {
          cb(new Error('UNEXPECTED_FILE_FIELD'), '');
        }
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'file') {
        resourceFileFilter(req, file, cb);
      } else if (file.fieldname === 'cover') {
        coverFileFilter(req, file, cb);
      } else {
        cb(new Error('UNEXPECTED_FILE_FIELD'));
      }
    },
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
    },
  }).fields([
    { name: 'file', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]);

  upload(req, res, next);
};

/**
 * 过滤列表（普通用户，只显示已审核的资源）
 * 支持搜索参数：grade, subject, textbook_version, volume, chapter_keyword
 */
export const filter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 解构查询参数
  const { keyword, category, subject, grade, textbook, textbook_version, volume, chapter_keyword } = request.query;

  // 设置默认的过滤（只显示已审核的资源，且排除视频资源）
  let sql = 'resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
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

  // 按年级过滤（支持字符串格式，如"二年级"）
  if (grade) {
    sql += ' AND resource.grade LIKE ?';
    const gradePattern = `%${grade}%`;
    params.push(gradePattern);
  }

  // 按教材版本过滤（兼容 textbook 和 textbook_version）
  const version = textbook_version || textbook;
  if (version) {
    sql += ' AND resource.textbook = ?';
    params.push(version);
  }

  // 按册次过滤（volume）
  if (volume) {
    sql += ' AND resource.grade LIKE ?';
    const volumePattern = `%${volume}%`;
    params.push(volumePattern);
  }

  // 按章节关键词过滤（搜索 chapter_info 或 auto_meta_result.structure.title）
  // 注意：由于 auto_meta_result 是 JSON 字段，需要使用 JSON 函数进行搜索
  if (chapter_keyword) {
    const chapterPattern = `%${chapter_keyword}%`;
    // 搜索 chapter_info 字段
    sql += ' AND (resource.chapter_info LIKE ?';
    params.push(chapterPattern);
    // 搜索 auto_meta_result JSON 字段中的 structure（使用 JSON_SEARCH 更可靠）
    sql += ' OR JSON_SEARCH(resource.auto_meta_result, "one", ?, NULL, "$.structure[*].title") IS NOT NULL';
    params.push(chapterPattern);
    sql += ' OR JSON_SEARCH(resource.auto_meta_result, "one", ?, NULL, "$.structure[*].unit") IS NOT NULL';
    params.push(chapterPattern);
    sql += ' OR JSON_SEARCH(resource.auto_meta_result, "one", ?, NULL, "$.structure[*]") IS NOT NULL)';
    params.push(chapterPattern);
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
 * 过滤列表（管理员用，显示所有状态的资源）
 */
export const adminFilter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 解构查询参数
  const { keyword, category, subject, grade, textbook, status } = request.query;

  // 设置默认的过滤（显示所有状态，或按status过滤）
  let sql = '1 = 1'; // 不过滤status
  const params: Array<any> = [];

  // 如果指定了status，则按status过滤
  if (status) {
    sql += ' AND resource.status = ?';
    params.push(status);
  }

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
    name: 'admin',
    sql: sql,
    params: params,
  };

  // 下一步
  next();
};

/**
 * 过滤列表（当前用户的所有资源，不区分status）
 */
export const myResourcesFilter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取当前用户ID（开发期可以使用 mock user_id=1）
  const userId = request.user?.id || 1;
  
  // 设置过滤条件：只返回该用户的资源
  let sql = `resource.user_id = ?`;
  const params: Array<any> = [userId];

  // 可选：支持其他查询参数（如 keyword）
  const { keyword } = request.query;
  if (keyword) {
    sql += ' AND (resource.title LIKE ? OR resource.description LIKE ?)';
    const keywordPattern = `%${keyword}%`;
    params.push(keywordPattern, keywordPattern);
  }

  // 设置请求中的过滤
  request.filter = {
    name: 'myResources',
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
