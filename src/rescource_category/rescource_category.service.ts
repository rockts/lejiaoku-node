import { connection } from '../app/database/mysql';
import { AttributeTypeModel } from './attribute_type.model';

/**
 * 获取类型列表
 */
export const getAttributeType = async () => {
  const statement = `
    SELECT
      id, name, alias
    FROM attribute_type
    ORDER BY id ASC
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建类型
 */
export const createAttributeType = async (type: AttributeTypeModel) => {
  // 准备查询
  const statement = `
    INSERT INTO attribute_type
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
export const getAttributeTypeByName = async (typeName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name 
    FROM attribute_type
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
export const updateAttributeType = async (typeId: number, type: AttributeTypeModel) => {
  // 准备数据
  const statement = `
    UPDATE attribute_type
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
export const deleteAttributeType = async (typeId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM attribute_type
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, typeId);

  // 提供数据
  return data;
};

/**
 * 统计属性类型数量
 */
export const getAttributeTypeTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT attribute_type.id) AS total
    FROM attribute_type
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
