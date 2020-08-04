import { connection } from '../app/database/mysql';
import { VersionModel } from './versiont.model';

/**
 * 获取分类列表
 */
export const getVersion = async () => {
  const statement = `
    SELECT
      id, name
    FROM version
    ORDER BY id ASC
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建分类
 */
export const createVersion = async (version: VersionModel) => {
  // 准备查询
  const statement = `
    INSERT INTO version
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, version);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找分类
 */
export const getVersionByName = async (versionName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name FROM version
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, versionName);

  // 提供数据
  return data[0];
};

/**
 * 更新分类
 */
export const updateVersion = async (
  versionId: number,
  version: VersionModel,
) => {
  // 准备数据
  const statement = `
    UPDATE version
    SET ?
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection
    .promise()
    .query(statement, [version, versionId]);

  // 提供数据
  return data;
};

/**
 * 删除分类
 */
export const deleteVersion = async (versionId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM version
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, versionId);

  // 提供数据
  return data;
};

/**
 * 统计内容数量
 */
export const getVersionTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT version.id) AS total
    FROM version
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
