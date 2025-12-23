import { connection } from '../app/database/mysql';
import { ResourceModel } from './resource.model';

/**
 * 获取资源列表
 */
export const getResourceList = async (options: {
  filter?: { name: string; sql: string; params: Array<any> };
  pagination: { limit: number; offset: number };
}) => {
  const { filter, pagination } = options;

  // 设置默认的过滤（只显示已审核的资源，且排除视频资源）
  let sql = 'resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  const params: Array<any> = [];

  if (filter && filter.name === 'adminFilter') {
    // 管理员过滤器，显示所有状态的资源，但仍排除视频
    sql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
    params.push(...filter.params);
  } else if (filter && filter.name === 'myResourcesFilter') {
    // 我的资源过滤器，显示用户所有资源，不区分状态，但仍排除视频
    sql = `resource.user_id = ? AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    params.push(...filter.params);
  } else if (filter && filter.sql) {
    // 其他自定义过滤器
    sql = `${filter.sql} AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    params.push(...filter.params);
  }

  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.chapter_info,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.status,
      resource.auto_meta_status,
      resource.auto_meta_result,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE ${sql}
    ORDER BY resource.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  const [data] = await connection
    .promise()
    .query(statement, [...params, pagination.limit, pagination.offset]);

  return data;
};

/**
 * 获取资源总数
 */
export const getResourceTotalCount = async (options: {
  filter?: { name: string; sql: string; params: Array<any> };
}) => {
  const { filter } = options;

  // 设置默认的过滤（只显示已审核的资源，且排除视频资源）
  let sql = 'resource.status = "approved" AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
  const params: Array<any> = [];

  if (filter && filter.name === 'adminFilter') {
    // 管理员过滤器，显示所有状态的资源，但仍排除视频
    sql = 'resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")';
    params.push(...filter.params);
  } else if (filter && filter.name === 'myResourcesFilter') {
    // 我的资源过滤器，显示用户所有资源，不区分状态，但仍排除视频
    sql = `resource.user_id = ? AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    params.push(...filter.params);
  } else if (filter && filter.sql) {
    // 其他自定义过滤器
    sql = `${filter.sql} AND resource.file_format NOT IN ("视频", "VIDEO") AND resource.category NOT IN ("视频")`;
    params.push(...filter.params);
  }

  const statement = `
    SELECT COUNT(*) as total
    FROM resource
    WHERE ${sql}
  `;

  const [data] = await connection.promise().query(statement, params);

  return (data as any)[0].total;
};

/**
 * 根据 ID 获取资源（仅已审核）
 */
export const getResourceById = async (resourceId: number) => {
  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.chapter_info,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.auto_meta_status,
      resource.auto_meta_result,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE resource.id = ? AND resource.status = "approved"
  `;
  const [data] = await connection.promise().query(statement, resourceId);
  if (!data || !data[0] || !data[0].id) {
    throw new Error('NOT_FOUND');
  }
  return data[0];
};

/**
 * 根据 ID 获取资源（管理员，不限制状态）
 */
export const getResourceByIdForAdmin = async (resourceId: number) => {
  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.chapter_info,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.status,
      resource.auto_meta_status,
      resource.auto_meta_result,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE resource.id = ?
  `;
  const [data] = await connection.promise().query(statement, resourceId);
  if (!data || !data[0] || !data[0].id) {
    throw new Error('NOT_FOUND');
  }
  return data[0];
};

/**
 * 创建资源
 */
export const createResource = async (resource: ResourceModel) => {
  const statement = `
    INSERT INTO resource
    SET ?
  `;

  const [data] = await connection.promise().query(statement, resource);
  return data as any;
};

/**
 * 更新资源状态
 */
export const updateResourceStatus = async (
  resourceId: number,
  status: string,
) => {
  const statement = `
    UPDATE resource
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await connection.promise().query(statement, [status, resourceId]);
};

/**
 * 更新资源的自动解析结果
 */
export const updateResourceAutoParse = async (
  resourceId: number,
  autoMetaResult: object,
  chapterInfo: string,
) => {
  const statement = `
    UPDATE resource
    SET 
      auto_meta_result = ?,
      chapter_info = ?,
      auto_meta_status = 'done',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await connection.promise().query(statement, [
    JSON.stringify(autoMetaResult),
    chapterInfo,
    resourceId,
  ]);
};
