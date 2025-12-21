import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { createFile, deleteFile, findFileById } from './file.service';

/**
 * 上传文件
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
  const fileInfo = _.pick(request.file, [
    'originalname',
    'mimetype',
    'filename',
    'size',
  ]);


  try {
    // 保存文件信息
    const data = await createFile({
      ...fileInfo,
      userId,
      postId
    });

    // 做出响应
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除文件
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取文件 ID
  const { fileId } = request.params;

  // 删除封面
  try {
    const data = await deleteFile(parseInt(fileId, 10));
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 文件服务
 */
export const serve = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 从地址参数里得到文件 ID
  const { fileId } = request.params;

  try {
    // 查找文件信息
    const file = await findFileById(parseInt(fileId, 10));

    // 文件名与目录
    let filename = file.filename;
    let root = 'uploads/files';
    let resized = 'resized';


    // 做出响应
    response.sendFile(filename, {
      root,
      headers: {
        'Content-Type': file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 文件信息
 */
export const metadata = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 文件 ID
  const { fileId } = request.params;

  try {
    // 查询文件数据
    const file = await findFileById(parseInt(fileId, 10));

    // 准备响应数据
    const data = _.pick(file, ['id', 'filename', 'size', 'mimetype', 'postId', 'userId']);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
