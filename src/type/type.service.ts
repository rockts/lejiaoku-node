import { connection } from '../app/database/mysql';
import { TypeModel } from './type.model';

/**
 * 获取分类列表
 */
export const getType = async () => {
  const statement = `
    SELECT
      id, name
    FROM type
    ORDER BY id ASC
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

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

/**
 * 更新分类
 */
export const updateType = async (typeId: number, type: TypeModel) => {
  // 准备数据
  const statement = `
    UPDATE type
    SET ?
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, [type, typeId]);

  // 提供数据
  return data;
};

/**
 * 删除分类
 */
export const deleteType = async (typeId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM type
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, typeId);

  // 提供数据
  return data;
};

/**
 * 统计内容数量
 */
export const getTypeTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT type.id) AS total
    FROM type
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
