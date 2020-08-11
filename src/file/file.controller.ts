import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import { createFile, findFileById, findResourcesTypeId } from './file.service';

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
  const { resources: resourcesId } = request.query;

  // 所属分类
  const { type: typeId } = request.query;

  // 文件信息
  const fileInfo = _.pick(request.file, [
    'originalname',
    'mimetype',
    'filename',
    'size',
  ]);

  const type = findResourcesTypeId(parseInt(typeId, 10));

  try {
    // 保存文件信息
    const data = await createFile({
      ...fileInfo,
      userId,
      resourcesId
    });

    console.log(typeId);


    // 做出响应
    response.status(201).send(data);
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
    let root = 'uploads';
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
    const data = _.pick(file, ['id', 'size', 'metadata']);

    // 做出响应
    response.send(data);
  } catch (error) {
    next(error);
  }
};
