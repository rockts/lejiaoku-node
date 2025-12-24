import { connection } from '../app/database/mysql';
import { UserModel } from './user.model';

/**
 * 创建用户
 */
export const createUser = async (user: UserModel) => {
  // 准备查询
  const statement = `
    INSERT INTO user
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, user);

  // 提供数据
  return data;
};

/**
 * 获取用户列表
 */
export const getUserList = async () => {
  const statement = `
    SELECT
      user.id, 
      user.name,
      user.email,
      user.role,
      user.created_at,
      user.updated_at,
      IF (
        COUNT(avatar.id), 1, NULL
      ) AS avatar
    FROM 
      user
    LEFT JOIN avatar
       ON avatar.userId = user.id

    GROUP BY user.id
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取用户
 */
interface GetUserOptions {
  password?: boolean;
  email?: string;
  name?: string;
}

export const getUser = (condition: string) => {
  return async (param: string | number, options: GetUserOptions = {}) => {
    // 准备选项
    const { password, name, email } = options;

    // 准备查询（注意：如果 password 选项为 true，需要单独查询以避免 GROUP BY 冲突）
    let statement: string;
    if (password) {
      // 需要查询 password 时，不 LEFT JOIN avatar（避免 GROUP BY 问题）
      statement = `
        SELECT 
          user.id,
          user.name,
          user.email,
          user.role,
          user.password,
          user.created_at,
          user.updated_at
        FROM
          user
        WHERE 
          ${condition} = ?
      `;
    } else {
      // 不需要 password 时，可以使用 LEFT JOIN avatar
      statement = `
        SELECT 
          user.id,
          user.name,
          user.email,
          user.role,
          user.created_at,
          user.updated_at,
          IF (
            COUNT(avatar.id), 1, NULL
          ) AS avatar
        FROM
          user
        LEFT JOIN avatar
          ON avatar.userId = user.id
        WHERE 
          ${condition} = ?
        GROUP BY user.id
      `;
    }

    // 执行查询
    const [data] = await connection.promise().query(statement, param);

    // 提供数据
    return data[0] && data[0].id ? data[0] : null;
  };
};

/**
 * 按用户名获取用户
 */
export const getUserByName = getUser('user.name');

/**
 * 按用户 ID 获取用户
 */
export const getUserById = getUser('user.id');

/**
 * 按 email 获取用户
 */
export const getUserByEmail = getUser('user.email');

/**
 * 更新用户
 */
export const updateUser = async (userId: number, userData: UserModel) => {
  // 准备查询
  const statement = `
    UPDATE user
    SET ?
    WHERE user.id = ?
  `;

  // SQL 参数
  const params = [userData, userId];

  // 执行查询
  const [data] = await connection.promise().query(statement, params);

  // 提供数据
  return data;
};

/**
 * 删除用户
 */
export const deleteUser = async (userId: number) => {
  // 准备查询
  const statement = `
    DELETE FROM user
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, userId);

  // 提供数据
  return data;
};

/**
 * 统计用户数量
 */
export const getUserTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(user.id) AS total
      FROM user
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供数据
  return data[0].total;
};
