import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';


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
  'image/jpg',
  'image/jpeg',
  'application / vnd.openxmlformats - officedocument.spreadsheetml.sheet',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

}