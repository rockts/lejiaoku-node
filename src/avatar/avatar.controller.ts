import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { createAvatar, deleteAvatar, findAvatarByUserId } from './avatar.service';

/**
 * 上传头像
 * POST /avatar
 * 权限：需要登录
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 检查是否有文件
    if (!request.file) {
      return response.status(400).json({
        error: 'avatar_file_required',
        message: 'Avatar file is required',
        success: false,
      });
    }

    // 当前用户 ID
    const { id: userId } = request.user;
    if (!userId) {
      return response.status(401).json({
        error: 'unauthorized',
        message: 'Unauthorized, please login first',
        success: false,
      });
    }

    // 查找用户的旧头像（如果有）
    const oldAvatar = await findAvatarByUserId(userId);
    
    // 如果有旧头像，删除旧头像文件（包括 resized 版本）
    if (oldAvatar) {
      try {
        const oldAvatarPath = path.join('uploads', 'avatar', oldAvatar.filename);
        
        // 删除原始头像文件
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlink(oldAvatarPath, (error) => {
            if (error) {
              console.error(`删除旧头像文件失败: ${oldAvatarPath}`, error);
            } else {
              console.log(`✅ 旧头像文件已删除: ${oldAvatarPath}`);
            }
          });
        }

        // 删除 resized 版本的旧头像文件
        const resizedDir = path.join('uploads', 'avatar', 'resized');
        const resizedSizes = ['small', 'medium', 'large'];
        
        resizedSizes.forEach((size) => {
          const resizedPath = path.join(resizedDir, `${oldAvatar.filename}-${size}`);
          if (fs.existsSync(resizedPath)) {
            fs.unlink(resizedPath, (error) => {
              if (error) {
                console.error(`删除旧头像 resized 文件失败: ${resizedPath}`, error);
              } else {
                console.log(`✅ 旧头像 resized 文件已删除: ${resizedPath}`);
              }
            });
          }
        });

        // 删除数据库中的旧头像记录
        await deleteAvatar(oldAvatar.id!);
        console.log(`✅ 旧头像数据库记录已删除: ID ${oldAvatar.id}`);
      } catch (error) {
        // 删除旧头像失败不影响新头向上传，只记录错误
        console.error('删除旧头像过程中发生错误:', error);
      }
    }

    // 头像文件信息
    const fileInfo = _.pick(request.file, ['mimetype', 'filename', 'size']);

    // 准备头像数据
    const avatar = {
      ...fileInfo,
      userId,
    };

    // 保存新头像数据
    const data = await createAvatar(avatar);

    // 做出响应
    response.status(201).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: data,
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    next(error);
  }
};

/**
 * 删除头像
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取用户 ID
  const { avatarId } = request.params;

  // 删除头像
  try {
    const data = await deleteAvatar(parseInt(avatarId, 10));
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 头像服务
 */
export const serve = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 用户 ID
  const { userId } = request.params;

  try {
    // 查找头像信息
    const avatar = await findAvatarByUserId(parseInt(userId, 10));

    if (!avatar) {
      throw new Error('FILE_NOT_FOUND');
    }

    // 要提供的头像尺寸
    const { size } = request.query;

    // 文件名与目录
    let filename = avatar.filename;
    let root = path.join('uploads', 'avatar');
    let resized = 'resized';

    if (size) {
      // 可用的头像尺寸
      const imageSizes = ['large', 'medium', 'small'];

      // 测试可用的头像尺寸
      if (!imageSizes.some(item => item == size)) {
        throw new Error('FILE_NOT_FOUND');
      }

      // 检查文件是否存在
      const fileExist = fs.existsSync(
        path.join(root, resized, `${filename}-${size}`),
      );

      if (!fileExist) {
        throw new Error('FILE_NOT_FOUND');
      }

      if (fileExist) {
        filename = `${filename}-${size}`;
        root = path.join(root, resized);
      }
    }

    // 做出响应
    response.sendFile(filename, {
      root,
      headers: {
        'Content-Type': avatar.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};
