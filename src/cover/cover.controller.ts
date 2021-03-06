import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { createCover, deleteCover, findCoverById } from './cover.service';

/**
 * 上传封面
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 当前用户
  const { id: userId } = request.user;

  // 所属内容
  const { post: postId } = request.query;

  // 文件信息
  const coverInfo = _.pick(request.file, [
    'originalname',
    'mimetype',
    'filename',
    'size',
  ]);

  try {
    // 保存文件信息
    const data = await createCover({
      ...coverInfo,
      userId,
      postId,
      ...request.fileMetaData,
    });
    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除封面
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取封面 ID
  const { coverId } = request.params;

  // 删除封面
  try {
    const data = await deleteCover(parseInt(coverId, 10));
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 封面服务
 */
export const serve = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 从地址参数里得到封面 ID
  const { coverId } = request.params;

  try {
    // 查找文件信息
    const cover = await findCoverById(parseInt(coverId, 10));

    // 要提供的图像尺寸;
    const { size } = request.query;

    // 文件名与目录;
    let filename = cover.filename;
    let root = 'uploads/cover';
    let resized = 'resized';

    if (size) {
      // 可用的图像尺寸
      const imageSizes = ['large', 'medium', 'thumbnail'];

      // 检查文件尺寸是否可用
      if (!imageSizes.some(item => item == size)) {
        throw new Error('COVER_NOT_FOUND');
      }

      // 检查文件是否存在
      const coverExist = fs.existsSync(
        path.join(root, resized, `${filename}-${size}`),
      );

      // 设置文件名与目录
      if (coverExist) {
        filename = `${filename}-${size}`;
        root = path.join(root, resized);
      }
    }

    // 做出响应
    response.sendFile(filename, {
      root,
      headers: {
        'Content-Type': cover.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 封面信息
 */
export const metadata = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 封面 ID
  const { coverId } = request.params;

  try {
    // 查询封面数据
    const cover = await findCoverById(parseInt(coverId, 10));

    // 准备响应数据
    const data = _.pick(cover, ['id', 'filename', 'mimetype', 'size', 'width', 'height']);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
