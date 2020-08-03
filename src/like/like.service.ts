import { connection } from '../app/database/mysql';

/**
 * 保存用户点赞内容
 */
export const createUserLikeResources = async (
  userId: number,
  resourcesId: number,
) => {
  // 准备查询
  const statement = `
    INSERT INTO
      user_like_resources (userId, resourcesId)
    VALUES (?, ?)
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [userId, resourcesId]);

  // 提供数据
  return data;
};

/**
 * 取消用户点赞内容
 */
export const deleteUserLikeResources = async (
  userId: number,
  resourcesId: number,
) => {
  // 准备查询
  const statement = `
    DELETE FROM user_like_resources
    WHERE userId = ? AND resourcesId = ?
  `;

  // 执行查询
  const [data] = await connection
    .promise()
    .query(statement, [userId, resourcesId]);

  // 提供数据
  return data;
};
