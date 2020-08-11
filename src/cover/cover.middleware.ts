import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import Jimp from 'jimp';
import fs from 'fs';
import { imageResizer, findCoverById } from './cover.service';

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
 * 封面拦截器
 */
export const coverInterceptor = coverUpload.single('file');

/**
 * 封面处理器
 */
export const coverProcessor = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 封面路径
  const { path } = request.file;
  let image: Jimp;

  try {
    // 读取图像文件
    image = await Jimp.read(path)
  } catch (error) {
    return next(error)
  };

  // 准备封面数据
  const { width, height } = image['bitmap'];

  // 在请求中添加封面数据
  request.fileMetaData = {
    width: width,
    height: height,
  };

  // 调整图像尺寸
  imageResizer(image, request.file);

  console.log('🌄 图片上传成功');

  // 下一步
  next();
};

/**
 * 删除资源封面
 */
export const deleteResourcesCover = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取封面 ID
  const { coverId } = request.params;
  const cover = await findCoverById(parseInt(coverId, 10));

  if (!cover) {
    next(new Error('COVER_NOT_FOUND'))
  } else {
    // 删除文件
    fs.unlink(`uploads/cover/${cover.filename}`, error => {
      if (error) throw error;
      console.log(`${cover.filename}`, '文件已被删除');
    });

    fs.unlink(`uploads/cover/resized/${cover.filename}-thumbnail`, error => {
      if (error) throw error;
      console.log(`${cover.filename}-thumbnail`, '文件已被删除');
    });

    fs.unlink(`uploads/cover/resized/${cover.filename}-medium`, error => {
      if (error) throw error;
      console.log(`${cover.filename}-medium`, '文件已被删除');
    });

    fs.unlink(`uploads/cover/resized/${cover.filename}-large`, error => {
      if (error) throw error;
      console.log(`${cover.filename}-large`, '文件已被删除');
    });
  }

  // 下一步
  next();
};
