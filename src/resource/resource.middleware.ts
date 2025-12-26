import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import Jimp from 'jimp';

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
  // 调试日志：检查请求类型和 Content-Type
  console.log('📤 [resourceWithCoverInterceptor] 接收到请求:');
  console.log('  method:', req.method);
  console.log('  path:', req.path);
  console.log('  Content-Type:', req.headers['content-type']);
  
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

  // 添加错误处理和调试日志
  upload(req, res, (err: any) => {
    if (err) {
      console.error('❌ [resourceWithCoverInterceptor] Multer 错误:', err);
      return next(err);
    }
    
    // 调试日志：检查文件上传结果
    console.log('✅ [resourceWithCoverInterceptor] 文件上传完成:');
    console.log('  req.files:', req.files);
    console.log('  req.file:', req.file);
    
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      Object.keys(files).forEach(fieldname => {
        console.log(`  ${fieldname}:`, files[fieldname].map(f => ({ filename: f.filename, size: f.size })));
      });
    }
    
    next();
  });
};

/**
 * 封面图片尺寸调整处理器
 * 为 Resource 模块上传的封面生成多种尺寸
 */
export const resourceCoverProcessor = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 检查是否有封面上传
  const coverFile = request.files && (request.files as any).cover?.[0];
  
  if (!coverFile) {
    // 没有封面上传，直接下一步
    return next();
  }

  try {
    // 准备文件路径
    const filePath = path.join(coverFile.destination, 'resized', coverFile.filename);

    // 确保 resized 目录存在
    const resizedDir = path.join(coverFile.destination, 'resized');
    if (!fs.existsSync(resizedDir)) {
      fs.mkdirSync(resizedDir, { recursive: true });
    }

    // 读取图片
    const image = await Jimp.read(coverFile.path);
    const { width, height } = image['bitmap'];

    // 生成大尺寸（1280px宽度）
    if (width > 1280) {
      image
        .clone()
        .resize(1280, Jimp.AUTO)
        .quality(85)
        .write(`${filePath}-large`);
    }

    // 生成中等尺寸（640px宽度）
    if (width > 640) {
      image
        .clone()
        .resize(640, Jimp.AUTO)
        .quality(85)
        .write(`${filePath}-medium`);
    }

    // 生成缩略图（320px宽度）
    if (width > 320) {
      image
        .clone()
        .resize(320, Jimp.AUTO)
        .quality(85)
        .write(`${filePath}-thumbnail`);
    }

    console.log('🌄 封面图片尺寸调整完成');
  } catch (error) {
    // 如果图片处理失败，记录错误但不中断流程
    console.error('⚠️ 封面图片尺寸调整失败:', error);
    // 继续执行，使用原始封面
  }

  // 下一步
  next();
};

/**
 * 【搜索系统规范】过滤列表（根据用户角色和权限显示不同状态的资源）
 * 
 * 搜索优先级规则（严格按以下顺序，不可调整）：
 * 1. catalog_id + unit（最高优先级）
 * 2. catalog_id（通过 subject/grade/volume/textbook_version 组合）
 * 3. keyword（仅搜索 title/description，禁止参与教材语义判断）
 * 4. 普通资源列表（无任何条件）
 * 
 * 权限规则：
 * - 管理员（admin/editor）：可查看所有状态的资源（通过、拒绝、未审核）
 * - 发布者：可查看自己发布的资源（所有状态）
 * - 其他用户：只能查看已通过审核的资源
 * 
 * 【历史废弃路径（DO NOT USE）】：
 * - chapter_keyword - 已废弃，禁止使用
 * - chapter_info LIKE - 已废弃，禁止使用
 * - auto_meta_result.structure 搜索 - 已废弃，禁止使用
 */
export const filter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 解构查询参数
  const { keyword, category, subject, grade, textbook, textbook_version, volume, unit, catalog_id } = request.query;

  // 获取当前用户信息
  const userId = request.user?.id;
  const userRole = (request.user as any)?.role || 'user';

  // 根据用户角色和权限构建状态过滤条件
  // 规则：
  // 1. 管理员/编辑：可查看所有状态的资源
  // 2. 普通用户（包括 contributor）：只能查看已审核的资源（approved）
  //    注意：资源列表统一只显示已审核的资源，确保所有人看到的列表一致
  //    用户可以通过 /api/my/resources 查看自己发布的所有资源
  let statusCondition = '';
  if (userRole === 'admin' || userRole === 'editor') {
    // 管理员和编辑：可查看所有状态的资源
    statusCondition = '';
  } else {
    // 所有其他用户（包括 contributor、user、未登录）：只能查看已审核的资源
    // 这样确保资源列表和详情接口的一致性：列表显示的资源，详情也可以访问
    statusCondition = 'resource.status = "approved"';
  }

  // 设置默认的过滤（根据权限显示不同状态的资源，且排除视频资源）
  let sql = '';
  const params: Array<any> = [];

  if (statusCondition) {
    if (statusCondition.includes('?')) {
      // 如果包含占位符，需要添加 userId 参数
      sql = `${statusCondition} AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
      params.push(userId);
    } else {
      sql = `${statusCondition} AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    }
  } else {
    // 管理员/编辑：不限制状态
    sql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  }

  // 【搜索系统规范】关键词搜索
  // 规则：关键词搜索严格限定在 resource.title 和 resource.description
  // 【历史废弃路径（DO NOT USE）】：
  //   - chapter_keyword - 已废弃，禁止使用
  //   - chapter_info LIKE - 已废弃，禁止使用
  //   - auto_meta_result.structure 搜索 - 已废弃，禁止使用
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

  // 【搜索系统规范】搜索优先级判定
  // 优先级 1: catalog_id + unit（最高优先级）
  // 优先级 2: catalog_id（通过 subject/grade/volume/textbook_version 组合）
  // 优先级 3: keyword（仅搜索 title/description）
  // 优先级 4: 普通资源列表（无任何条件）
  
  // 检测是否有 catalog 筛选参数
  const hasCatalogFilter = !!(subject || grade || volume || textbook_version || textbook || catalog_id);
  const hasUnit = !!unit;
  
  // 按单元筛选（只使用 resource.unit 字段，禁止使用 chapter_info 或 auto_meta_result）
  // 【历史废弃路径（DO NOT USE）】：chapter_info LIKE, auto_meta_result.structure 搜索已废弃
  if (hasUnit) {
    sql += ' AND resource.unit = ?';
    params.push(unit);
  }

  // 设置请求中的过滤
  if (hasCatalogFilter) {
    // 优先级 1 或 2: 有 catalog 筛选，标记需要 JOIN catalog 表
    // 筛选条件将在 service 层基于 catalog 表构建
    request.filter = {
      name: 'catalogFilter',
      sql: sql, // 基础条件（status, category, keyword, unit 等）
      params: params,
      catalogFilters: {
        subject: subject as string | undefined,
        grade: grade as string | undefined,
        volume: volume as string | undefined,
        textbook_version: (textbook_version || textbook) as string | undefined,
        catalog_id: catalog_id as string | undefined,
      },
      unit: unit as string | undefined, // 单元筛选参数
      keyword: keyword as string | undefined, // 关键词（如果存在，在 catalog 筛选下会被忽略）
      searchMode: hasUnit ? 'catalog_unit' : 'catalog', // 搜索模式标识
    };
  } else if (keyword) {
    // 优先级 3: 只有 keyword，没有 catalog 筛选
    request.filter = {
      name: 'keyword',
      sql: sql,
      params: params,
      keyword: keyword as string | undefined,
      searchMode: 'keyword',
    };
  } else {
    // 优先级 4: 普通资源列表（无任何条件）
    request.filter = {
      name: 'default',
      sql: sql,
      params: params,
      searchMode: 'default',
    };
  }

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
  const { keyword, category, subject, grade, textbook, textbook_version, volume, unit, status } = request.query;

  // 设置默认的过滤（显示所有状态，或按status过滤）
  let sql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  const params: Array<any> = [];

  // 如果指定了status，则按status过滤
  if (status) {
    sql += ' AND resource.status = ?';
    params.push(status);
  }

  // 【搜索系统规范】关键词搜索
  // 规则：关键词搜索严格限定在 resource.title 和 resource.description
  // 【历史废弃路径（DO NOT USE）】：
  //   - chapter_keyword - 已废弃，禁止使用
  //   - chapter_info LIKE - 已废弃，禁止使用
  //   - auto_meta_result.structure 搜索 - 已废弃，禁止使用
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

  // 按单元筛选（只使用 resource.unit 字段）
  if (unit) {
    sql += ' AND resource.unit = ?';
    params.push(unit);
  }

  // 教材筛选：只基于 catalog（教材目录），禁止使用 resource 原始字段
  // 如果传了任何教材筛选参数，必须使用 JOIN 结构，未绑定 catalog 的资源将被排除
  const hasCatalogFilter = !!(subject || grade || volume || textbook_version || textbook);

  // 设置请求中的过滤
  if (hasCatalogFilter) {
    // 标记需要 JOIN catalog 表，筛选条件将在 service 层基于 catalog 表构建
    request.filter = {
      name: 'catalogFilter',
      sql: sql, // 基础条件（status, category, keyword, unit 等）
      params: params,
      catalogFilters: {
        subject: subject as string | undefined,
        grade: grade as string | undefined,
        volume: volume as string | undefined,
        textbook_version: (textbook_version || textbook) as string | undefined,
      },
      unit: unit as string | undefined, // 单元筛选参数
    };
  } else {
    // 没有教材筛选参数，使用普通查询
    request.filter = {
      name: 'adminFilter',
      sql: sql,
      params: params,
      unit: unit as string | undefined, // 单元筛选参数
    };
  }

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
