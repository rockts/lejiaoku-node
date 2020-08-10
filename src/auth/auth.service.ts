import jwt from 'jsonwebtoken';
import { PRIVATE_KEY } from '../app/app.config';
import { connection } from '../app/database/mysql';

/**
 * 签发令牌
 */
interface SignTokenOptions {
  payload?: any;
}

export const signToken = (options: SignTokenOptions) => {
  // 准备选项
  const { payload } = options;

  // 签发 JWT
  const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });

  // 提供 JWT
  return token;
};

/**
 * 检查用户是否拥有指定资源
 */
interface PossessOptions {
  libraryId: number;
  libraryType: string;
  userId: number;
}

export const possess = async (options: PossessOptions) => {
  // 准备选项
  const { libraryId, libraryType, userId } = options;

  // 准备查询
  const statement = `
    SELECT COUNT(${libraryType}.id) as count
    FROM ${libraryType}
    WHERE ${libraryType}.id = ? AND userId = ?
  `;

  // 检查拥有权
  const [data] = await connection
    .promise()
    .query(statement, [libraryId, userId]);

  // 提供检查结果
  return data[0].count ? true : false;
};
