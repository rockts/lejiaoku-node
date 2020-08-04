import { connection } from '../app/database/mysql';
import { GradeModel } from './grade.model';

/**
 * 获取分类列表
 */
export const getGrade = async () => {
  const statement = `
    SELECT
      id, name
    FROM grade
    ORDER BY id ASC
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建分类
 */
export const createGrade = async (grade: GradeModel) => {
  // 准备查询
  const statement = `
    INSERT INTO grade
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, grade);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找分类
 */
export const getGradeByName = async (gradeName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name FROM grade
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, gradeName);

  // 提供数据
  return data[0];
};

/**
 * 更新分类
 */
export const updateGrade = async (gradeId: number, grade: GradeModel) => {
  // 准备数据
  const statement = `
    UPDATE grade
    SET ?
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, [grade, gradeId]);

  // 提供数据
  return data;
};

/**
 * 删除分类
 */
export const deleteGrade = async (gradeId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM grade
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, gradeId);

  // 提供数据
  return data;
};

/**
 * 统计内容数量
 */
export const getGradeTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT grade.id) AS total
    FROM grade
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
