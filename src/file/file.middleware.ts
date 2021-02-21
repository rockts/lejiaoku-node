import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import { findFileById } from './file.service';


/**
 * 文件过滤器
 */
export const fileFilter = (fileTypes: Array<string>) => {
  return (
    request: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    // 测试文件类型
    const allowed = fileTypes.some(type => type === file.mimetype);

    if (allowed) {
      // 允许上传
      callback(null, true);
    } else {
      // 拒绝上传
      callback(new Error('FILE_TYPE_NOT_ACCEPT'));
    }
  };
};

const fileUploadFilter = fileFilter([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.ms-excel',
  'application/vnd.apple.page',
  'application/vnd.apple.numbers',
  'application/vnd.apple.page',
  'application/octet-stream'
]);

/**
 * 创建一个 Multer
 */
const fileUpload = multer({
  dest: 'uploads/files',
  fileFilter: fileUploadFilter,
});

/**
 * 文件拦截器
 */
export const fileInterceptor = fileUpload.single('file');

/**
 * 文件处理器
 */
export const fileProcessor = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 文件路径
  const { path } = request.file;

  console.log('📁 文件上传成功');

  // 下一步
  next();
};

/**
 * 删除资源文件
 */
export const deletePostFile = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取文件 ID
  const { fileId } = request.params;
  const file = await findFileById(parseInt(fileId, 10));

  if (!file) {
    next(new Error('FILE_NOT_FOUND'))
  } else {
    // 删除文件
    fs.unlink(`uploads/files/${file.filename}`, error => {
      console.log(`${file.filename}`, '文件已被删除');
    });
  }

  // 下一步
  next();
};

