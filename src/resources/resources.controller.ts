import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import {
  getResources,
  createResources,
  updateResources,
  deleteResources,
  createResourcesTag,
  resourcesHasTag,
  deleteResourcesTag,
  getResourcesTotalCount,
  getResourcesById,
} from './resources.service';
import { TagModel } from '../tag/tag.model';
import { getTagByName, createTag } from '../tag/tag.service';
/**
 * 资源列表
 */
export const index = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    // 统计内容数量
    const totalCount = await getResourcesTotalCount({
      filter: request.filter,
    });

    // 设置响应头部
    response.header('X-Total-Count', totalCount);
  } catch (error) {
    next(error);
  }

  try {
    const resources = await getResources({
      sort: request.sort,
      filter: request.filter,
      pagination: request.pagination,
    });
    response.send(resources);
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
  const { title, description } = request.body;
  const { id: userId } = request.user;

  // 创建内容
  try {
    const data = await createResources({ title, description, userId });
    response.status(201).send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新资源
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取内容 ID
  const { resourcesId } = request.params;

  // 准备数据
  const resources = _.pick(request.body, ['title', 'description']);

  // 更新
  try {
    const data = await updateResources(parseInt(resourcesId, 10), resources);
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除资源
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 获取资源 ID
  const { resourcesId } = request.params;

  // 删除资源
  try {
    const data = await deleteResources(parseInt(resourcesId, 10));
    response.send(data);
  } catch (error) {
    next(error);
  }
};

/**
 * 添加内容标签
 */
export const storeResourcesTag = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { resourcesId } = request.params;
  const { name } = request.body;

  let tag: TagModel;

  // 查找标签
  try {
    tag = await getTagByName(name);
  } catch (error) {
    return next(error);
  }

  // 找到标签，验证内容标签
  if (tag) {
    try {
      const resourcesTag = await resourcesHasTag(
        parseInt(resourcesId, 10),
        tag.id,
      );
      if (resourcesTag) return next(new Error('POST_ALREADY_HAS_THIS_TAG'));
    } catch (error) {
      return next(error);
    }
  }

  // 没找到标签，创建这个标签
  if (!tag) {
    try {
      const data = await createTag({ name });
      tag = { id: data.insertId };
    } catch (error) {
      return next(error);
    }
  }

  // 给内容打上标签
  try {
    await createResourcesTag(parseInt(resourcesId, 10), tag.id);
    response.sendStatus(201);
  } catch (error) {
    return next(error);
  }
};

/**
 * 移除内容标签
 */
export const destroyResourcesTag = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { resourcesId } = request.params;
  const { tagId } = request.body;

  // 移除内容标签
  try {
    await deleteResourcesTag(parseInt(resourcesId, 10), tagId);
    response.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

/**
 * 单个内容
 */
export const show = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 准备数据
  const { resourcesId } = request.params;

  // 调取内容
  try {
    const resources = await getResourcesById(parseInt(resourcesId, 10));

    // 做出响应
    response.send(resources);
  } catch (error) {
    next(error);
  }
};
