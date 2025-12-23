import { connection } from '../app/database/mysql';
import { ResourceModel } from './resource.model';

/**
 * 获取资源列表的过滤选项
 */
export interface GetResourceOptionsFilter {
  name: string;
  sql?: string;
  params?: Array<any>;
}

/**
 * 获取资源列表的分页选项
 */
export interface GetResourceOptionsPagination {
  limit: number;
  offset: number;
}

/**
 * 获取资源列表的选项
 */
interface GetResourceOptions {
  filter?: GetResourceOptionsFilter;
  pagination?: GetResourceOptionsPagination;
}

/**
 * 获取资源列表
 */
export const getResourceList = async (options: GetResourceOptions) => {
  const {
    filter,
    pagination: { limit, offset },
  } = options;

  // SQL 参数
  let params: Array<any> = [...(filter.params || []), limit, offset];

  // 准备查询
  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.file_format,
      resource.cover_url,
      resource.download_count,
      resource.created_at
    FROM resource
    WHERE ${filter.sql}
    ORDER BY resource.created_at DESC
    LIMIT ?
    OFFSET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, params);

  // 提供数据
  return data;
};

/**
 * 统计资源数量
 */
export const getResourceTotalCount = async (options: GetResourceOptions) => {
  const { filter } = options;

  // 准备查询
  const statement = `
    SELECT COUNT(*) AS total
    FROM resource
    WHERE ${filter.sql}
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, filter.params || []);

  // 提供结果
  return data[0].total;
};

/**
 * 按 ID 获取资源详情
 */
export const getResourceById = async (resourceId: number) => {
  // 准备查询
  const statement = `
    SELECT
      resource.id,
      resource.title,
      resource.description,
      resource.category,
      resource.subject,
      resource.grade,
      resource.textbook,
      resource.file_format,
      resource.file_url,
      resource.cover_url,
      resource.download_count,
      resource.created_at,
      resource.updated_at
    FROM resource
    WHERE resource.id = ? AND resource.status = "approved"
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, resourceId);

  // 没找到资源
  if (!data || !data[0] || !data[0].id) {
    throw new Error('NOT_FOUND');
  }

  // 提供数据
  return data[0];
};

/**
 * 创建资源
 */
export const createResource = async (resource: ResourceModel) => {
  // 准备查询
  const statement = `
    INSERT INTO resource
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, resource);

  // 提供数据
  return data as any;
};

