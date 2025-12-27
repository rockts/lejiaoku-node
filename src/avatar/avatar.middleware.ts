import path from 'path';
import Jimp from 'jimp';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { coverFilter } from '../cover/cover.middleware';
import { findAvatarById } from './avatar.service';
import fs from 'fs';

/**
 * 文件过滤器
 */
const avatarUploadFilter = coverFilter([
  'image/png',
  'image/jpg',
  'image/jpeg',
]);

/**
 * 创建一个 Multer
 */
const avatarUpload = multer({
  dest: 'uploads/avatar',
  fileFilter: avatarUploadFilter,
});

/**
 * 文件拦截器
 */
export const avatarInterceptor = avatarUpload.single('avatar');

/**
 * 头像处理器
 */
export const avatarProcessor = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 检查是否有文件上传
  if (!request.file) {
    return next(new Error('AVATAR_FILE_REQUIRED'));
  }

  // 准备文件信息
  const { file } = request;

  // 确保 resized 目录存在
  const resizedDir = path.join(file.destination, 'resized');
  if (!fs.existsSync(resizedDir)) {
    fs.mkdirSync(resizedDir, { recursive: true });
  }

  // 准备文件路径
  const filePath = path.join(resizedDir, file.filename);

  // 处理头像文件
  try {
    // 读取文件
    const image = await Jimp.read(file.path);

    // 调整尺寸并保存
    await Promise.all([
      image.clone().cover(256, 256).quality(85).write(`${filePath}-large`),
      image.clone().cover(128, 128).quality(85).write(`${filePath}-medium`),
      image.clone().cover(64, 64).quality(85).write(`${filePath}-small`),
    ]);

    console.log('👤 头像上传成功，已生成不同尺寸');
  } catch (error) {
    console.error('头像处理失败:', error);
    next(error);
    return;
  }

  // 下一步
  next();
};

/**
 * 删除头像文件
 */
export const deleteUserAvatar = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取头像 ID
  const { avatarId } = request.params;
  const avatar = await findAvatarById(parseInt(avatarId, 10));

  if (!avatar) {
    next(new Error('AVARAR_NOT_FOUND'))
  } else {
    // 删除文件
    fs.unlink(`uploads/avatar/${avatar.filename}`, error => {
      if (error) throw error;
      console.log(`${avatar.filename}`, '头像已被删除');
    });

    fs.unlink(`uploads/avatar/resized/${avatar.filename}-small`, error => {
      if (error) throw error;
      console.log(`${avatar.filename}-small`, '头像已被删除');
    });

    fs.unlink(`uploads/avatar/resized/${avatar.filename}-medium`, error => {
      if (error) throw error;
      console.log(`${avatar.filename}-medium`, '头像已被删除');
    });

    fs.unlink(`uploads/avatar/resized/${avatar.filename}-large`, error => {
      if (error) throw error;
      console.log(`${avatar.filename}-large`, '头像已被删除');
    });
  }

  // 下一步
  next();
};
