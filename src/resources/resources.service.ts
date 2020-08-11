import { connection } from '../app/database/mysql';
import { ResourcesModel } from './resources.model';
import { sqlFragment } from './resources.provider';

/**
 * 获取内容列表
 */
export interface GetResourcesOptionsFilter {
  name: string;
  sql?: string;
  param?: string;
}

export interface GetResourcesOptionsPagination {
  limit: number;
  offset: number;
}

interface GetResourcesOptions {
  sort?: string;
  filter?: GetResourcesOptionsFilter;
  pagination?: GetResourcesOptionsPagination;
}

export const getResources = async (options: GetResourcesOptions) => {
  const {
    sort,
    filter,
    pagination: { limit, offset },
  } = options;

  // SQL 参数
  let params: Array<any> = [limit, offset];

  // 设置 SQL 参数
  if (filter.param) {
    params = [filter.param, ...params];
  }

  const statement = `
    SELECT
      resources.id,
      resources.title,
      resources.description,
      resources.grade,
      resources.subject,
      resources.version,
      resources.categoryId,
      ${sqlFragment.cover},
      ${sqlFragment.user},
      ${sqlFragment.totalComments},
      ${sqlFragment.file},
      ${sqlFragment.tags},
      ${sqlFragment.totalLikes},
    FROM resources
    ${sqlFragment.leftJoinUser}
    ${sqlFragment.leftJoinOneCover}
    ${sqlFragment.leftJoinOneFile}
    ${sqlFragment.leftJoinTag}
    ${filter.name == 'userLiked' ? sqlFragment.innerJoinUserLikeResources : ''}
    WHERE ${filter.sql}
    GROUP BY resources.id
    ORDER BY ${sort}
    LIMIT ?
    OFFSET ?
  `;

  const [data] = await connection.promise().query(statement, params);

  return data;
};

/**
 * 创建内容
 */
export const createResources = async (resources: ResourcesModel) => {
  // 准备查询
  const statement = `
    INSERT INTO resources
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, resources);

  // 提供数据
  return data;
};

/**
 * 更新资源
 */
export const updateResources = async (
  resourcesId: number,
  resources: ResourcesModel,
) => {
  // 准备查询
  const statement = `
    UPDATE resources
    SET ?
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [resources, resourcesId]);

  // 提供数据
  return data;
};

/**
 * 删除资源
 */
export const deleteResources = async (resourcesId: number) => {
  // 准备查询
  const statement = `
    DELETE FROM resources
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, resourcesId);

  // 提供数据
  return data;
};

/**
 * 保存内容标签
 */
export const createResourcesTag = async (
  resourcesId: number,
  tagId: number,
) => {
  // 准备查询
  const statement = `
    INSERT INTO resources_tag (resourcesId, tagId)
    VALUES(?, ?)
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [resourcesId, tagId]);

  // 提供数据
  return data;
};

/**
 * 检查内容标签
 */
export const resourcesHasTag = async (resourcesId: number, tagId: number) => {
  // 准备查询
  const statement = `
    SELECT * FROM resources_tag
    WHERE resourcesId=? AND tagId=?
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [resourcesId, tagId]);

  // 提供数据
  return data[0] ? true : false;
};

/**
 * 移除内容标签
 */
export const deleteResourcesTag = async (
  resourcesId: number,
  tagId: number,
) => {
  // 准备查询
  const statement = `
    DELETE FROM resources_tag
    WHERE resourcesId = ? AND tagId = ?
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [resourcesId, tagId]);

  // 提供数据
  return data;
};

/**
 * 统计内容数量
 */
export const getResourcesTotalCount = async (options: GetResourcesOptions) => {
  const { filter } = options;

  // SQL 参数
  let params = [filter.param];

  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT resources.id) AS total
    FROM resources
    ${sqlFragment.leftJoinUser}
    ${sqlFragment.leftJoinOneCover}
    ${sqlFragment.leftJoinOneFile}
    ${sqlFragment.leftJoinTag}
    ${filter.name == 'userLiked' ? sqlFragment.innerJoinUserLikeResources : ''}
    WHERE ${filter.sql}
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, params);

  // 提供结果
  return data[0].total;
};

/**
 * 按 ID 调取内容
 */
export const getResourcesById = async (resourcesId: number) => {
  // 准备查询
  const statement = `
    SELECT
      resources.id,
      resources.title,
      resources.description,
      resources.grade,
      resources.subject,
      resources.version,
      resources.categoryId,
      ${sqlFragment.cover},
      ${sqlFragment.user},
      ${sqlFragment.totalComments},
      ${sqlFragment.file},
      ${sqlFragment.tags},
      ${sqlFragment.totalLikes}
    FROM resources
    ${sqlFragment.leftJoinOneCover}
    ${sqlFragment.leftJoinUser}
    ${sqlFragment.leftJoinOneFile}
    ${sqlFragment.leftJoinTag}
    WHERE resources.id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, resourcesId);

  // 没找到内容
  if (!data[0].id) {
    throw new Error('NOT_FOUND');
  }

  // 提供数据
  return data[0];
};
