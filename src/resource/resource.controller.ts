import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import {
  getResourceList,
  getResourceTotalCount,
  getResourceById,
  createResource,
} from './resource.service';
import { APP_PORT } from '../app/app.config';

/**
 * 将相对路径转换为完整URL
 */
const getFullUrl = (request: Request, path: string): string => {
  if (!path) return path;
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 获取协议和主机
  const protocol = request.protocol || 'http';
  const host = request.get('host') || `localhost:${APP_PORT}`;
  // 确保路径以 / 开头
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}://${host}${fullPath}`;
};

/**
 * 资源列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计资源数量
    const totalCount = await getResourceTotalCount({
      filter: request.filter,
    });

    // 设置响应头部
    response.header('X-Total-Count', totalCount.toString());
  } catch (error) {
    next(error);
  }

  try {
    const resources: any = await getResourceList({
      filter: request.filter,
      pagination: request.pagination,
    });
    // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
    // 注意：列表接口可能不返回 file_url，所以需要检查
    if (Array.isArray(resources)) {
      const resourcesWithFullUrl = resources.map((resource: any) => {
        if (resource.file_url && resource.file_url.startsWith('/')) {
          resource.file_url = getFullUrl(request, resource.file_url);
        }
        if (resource.cover_url && resource.cover_url.startsWith('/')) {
          resource.cover_url = getFullUrl(request, resource.cover_url);
        }
        return resource;
      });
      response.send(resourcesWithFullUrl);
    } else {
      response.send(resources);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 单个资源详情
 */
export const show = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { id } = request.params;

  // 获取资源
  try {
    const resource: any = await getResourceById(parseInt(id, 10));
    // 将 file_url 转换为完整 URL（如果需要）
    if (resource && resource.file_url && resource.file_url.startsWith('/')) {
      resource.file_url = getFullUrl(request, resource.file_url);
    }
    // 将 cover_url 转换为完整 URL（如果需要）
    if (resource && resource.cover_url && resource.cover_url.startsWith('/')) {
      resource.cover_url = getFullUrl(request, resource.cover_url);
    }
    response.send(resource);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建资源
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  // 兼容前端可能发送的 version 字段（映射到 textbook）
  const { title, description, category, subject, grade, textbook, version, cover_url } = request.body;
  // 如果前端发送了 version 但没有 textbook，使用 version
  const textbookValue = textbook || version;
  
  // 临时测试方案：如果没有用户ID，使用默认测试用户ID 1
  // TODO: 在生产环境中应移除此逻辑，确保必须通过 authGuard
  const userId = request.user?.id || 1;

  // 验证必填字段
  if (!title) return next(new Error('TITLE_IS_REQUIRED'));
  if (!category) return next(new Error('CATEGORY_IS_REQUIRED'));

  // 文件处理：支持文件上传或 file_url
  let file_url: string | undefined;
  let file_format: string | undefined;

  if (request.file) {
    // 有文件上传：使用上传的文件
    const filename = request.file.filename;
    file_url = `/uploads/resources/${filename}`;
    
    // 根据 mimetype 推断文件格式
    const mimeToFormat: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOC',
      'application/msword': 'DOC',
      'image/png': '图片',
      'image/jpeg': '图片',
      'image/jpg': '图片',
      'video/mp4': '视频',
      'video/quicktime': '视频',
    };
    file_format = mimeToFormat[request.file.mimetype] || '其他';
  } else {
    // 没有文件上传：检查是否有 file_url（兼容之前的接口）
    if (!request.body.file_url) {
      return next(new Error('FILE_IS_REQUIRED'));
    }
    file_url = request.body.file_url;
    file_format = request.body.file_format || '其他';
  }

  if (!file_format) return next(new Error('FILE_FORMAT_IS_REQUIRED'));

  // 开发环境下自动批准，生产环境为 pending
  const status = process.env.NODE_ENV === 'development' ? 'approved' : 'pending';

  // 准备资源数据
  // 处理 grade：如果 grade 是字符串且包含数字，尝试提取数字；否则设为 null
  let gradeValue: number | null = null;
  if (grade) {
    if (typeof grade === 'number') {
      gradeValue = grade;
    } else if (typeof grade === 'string') {
      // 尝试从字符串中提取数字（如 "四年级下册" -> null，因为无法确定具体数字）
      // 如果字符串是纯数字，则转换
      const parsed = parseInt(grade, 10);
      gradeValue = isNaN(parsed) ? null : parsed;
    }
  }

  const resource = {
    title,
    description,
    category,
    subject,
    grade: gradeValue,
    textbook: textbookValue,
    file_format,
    file_url,
    cover_url,
    user_id: userId,
    status: status,
    download_count: 0,
  };

  // 创建资源
  try {
    const data: any = await createResource(resource);
    response.status(201).send({
      id: data.insertId,
      status: status,
    });
  } catch (error) {
    console.error('❌ 创建资源失败:', error);
    next(error);
  }
};

/**
 * 下载资源文件（强制下载，不预览）
 */
export const download = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { id } = request.params;

  try {
    // 获取资源信息
    const resource: any = await getResourceById(parseInt(id, 10));

    // 检查 file_url 是否存在
    if (!resource.file_url) {
      return next(new Error('FILE_NOT_FOUND'));
    }

    // 从 file_url 中提取文件路径
    // file_url 可能是完整URL (http://localhost:3333/uploads/resources/xxx.pdf)
    // 或者相对路径 (/uploads/resources/xxx.pdf)
    let filePath = resource.file_url;
    
    // 如果是完整URL，提取路径部分
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const urlObj = new URL(filePath);
      filePath = urlObj.pathname;
    }

    // 确保是相对路径，转换为绝对路径
    const absolutePath = path.join(process.cwd(), filePath);

    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      return next(new Error('FILE_NOT_FOUND'));
    }

    // 生成下载文件名（使用资源的标题 + 原始文件扩展名）
    const ext = path.extname(absolutePath);
    const downloadFilename = `${resource.title || 'resource'}${ext}`;

    // 使用 res.download() 强制下载
    // res.download() 会自动设置 Content-Disposition: attachment
    response.download(absolutePath, downloadFilename, (err) => {
      if (err) {
        // 如果下载过程中出错（比如客户端取消），不抛出错误
        if (!response.headersSent) {
          next(err);
        }
      }
      // 下载成功可以在这里增加下载计数（可选）
      // TODO: 增加下载计数逻辑
    });
  } catch (error) {
    next(error);
  }
};

