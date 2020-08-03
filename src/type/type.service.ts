import { connection } from '../app/database/mysql';
import { TypeModel } from './type.model';

/**
 * 创建分类
 */
export const createType = async (type: TypeModel) => {
  // 准备查询
  const statement = `
    INSERT INTO type
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, type);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找分类
 */
export const getTypeByName = async (typeName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name FROM type
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, typeName);

  // 提供数据
  return data[0];
};
