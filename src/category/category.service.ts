import { connection } from '../app/database/mysql';
import { CategoryModel } from './category.model';

/**
 * 获取资源类别列表
 */
export const getCategory = async () => {
  const statement = `
    SELECT
    attrId, attr_name, attr_alias,
    GROUP_CONCAT(name SEPARATOR ',') names
    FROM category
    GROUP BY attrId, attr_name, attr_alias
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取属性类型列表
 * @param attr 
 */
export const getAttr = async () => {
  const statement = `
    SELECT
    attrId, attr_name, attr_alias
    FROM category
    GROUP BY attrId, attr_name, attr_alias
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建属性类型
 */
export const createAttr = async (attr: CategoryModel) => {
  // 准备查询
  const statement = `
    INSERT INTO category
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, attr);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找类别
 */
export const getCategoryByName = async (categoryName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name 
    FROM category
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, categoryName);

  // 提供数据
  return data[0];
};

/**
 * 按名字查找属性类型
 * @param AttrName
 */
export const getAttrByName = async (attrName: string) => {
  // 准备查询
  const statement = `
    SELECT attrId, attr_name
    FROM category
    WHERE attr_name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, attrName);

  // 提供数据
  return data[0];
};


/**
 * 按 ID 查找 attr
 * @param categoryId 
 * @param category 
 */
export const findAttrById = async (AttrId: number) => {
  // 准备查询
  const statement = `
    SELECT * FROM category
    WHERE attId = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, AttrId);

  // 提供数据
  return data[0];
};

/**
 * 更新资源类别
 */
export const updateCategory = async (categoryId: number, category: CategoryModel) => {
  // 准备数据
  const statement = `
    UPDATE category
    SET ?
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, [category, categoryId]);

  // 提供数据
  return data;
};

/**
 * 删除分类
 */
export const deleteCategory = async (typeId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM category
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, typeId);

  // 提供数据
  return data;
};

/**
 * 统计资源类别数量
 */
export const getCategoryTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT category.id) AS total
    FROM category
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};

/**
 * 统计属性类型数据
 */
export const getAttrTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
     COUNT(DISTINCT category.attrId) AS total
    FROM category
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
