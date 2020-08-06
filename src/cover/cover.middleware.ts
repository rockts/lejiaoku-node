import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import Jimp from 'jimp';
import { imageResizer } from './cover.service';

/**
 * 文件过滤器
 */
export const coverFilter = (coverTypes: Array<string>) => {
  return (
    request: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    // 测试文件类型
    const allowed = coverTypes.some(type => type === file.mimetype);

    if (allowed) {
      // 允许上传
      callback(null, true);
    } else {
      // 拒绝上传
      callback(new Error('COVER_TYPE_NOT_ACCEPT'));
    }
  };
};

const coverUploadFilter = coverFilter(['image/png', 'image/jpg', 'image/jpeg']);

/**
 * 创建一个 Multer
 */
const coverUpload = multer({
  dest: 'uploads/cover',
  fileFilter: coverUploadFilter,
});

/**
 * 文件拦截器
 */
export const coverInterceptor = coverUpload.single('file');

/**
 * 文件处理器
 */
export const coverProcessor = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 文件路径
  const { path } = request.file;

  let image: Jimp;

  try {
    // 读取图像文件
    image = await Jimp.read(path);
  } catch (error) {
    return next(error);
  }

  // 准备文件数据
  const { width, height } = image['bitmap'];

  // 在请求中添加文件数据
  request.fileMetaData = {
    width: width,
    height: height,
  };

  // 调整图像尺寸
  imageResizer(image, request.file);

  // 下一步
  next();
};
