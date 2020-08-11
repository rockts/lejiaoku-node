import { connection } from '../app/database/mysql';
import { CategoryModel } from './category.model';

/**
 * 获取分类列表
 */
export const getCategory = async () => {
  const statement = `
    SELECT
      id, name, alias
    FROM category
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建分类
 */
export const createCategory = async (category: CategoryModel) => {
  // 准备查询
  const statement = `
    INSERT INTO category
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, category);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找类别
 */
export const getCategoryByName = async (categoryName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name, alias
    FROM category
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, categoryName);

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
