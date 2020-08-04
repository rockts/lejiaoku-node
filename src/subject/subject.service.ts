import { connection } from '../app/database/mysql';
import { SubjectModel } from './subject.model';

/**
 * 获取分类列表
 */
export const getSubject = async () => {
  const statement = `
    SELECT
      id, name
    FROM subject
    ORDER BY id ASC
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 创建分类
 */
export const createSubject = async (subject: SubjectModel) => {
  // 准备查询
  const statement = `
    INSERT INTO subject
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, subject);

  // 提供数据
  return data as any;
};

/**
 * 按名字查找分类
 */
export const getSubjectByName = async (subjectName: string) => {
  // 准备查询
  const statement = `
    SELECT id, name FROM subject
    WHERE name = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, subjectName);

  // 提供数据
  return data[0];
};

/**
 * 更新分类
 */
export const updateSubject = async (
  subjectId: number,
  subject: SubjectModel,
) => {
  // 准备数据
  const statement = `
    UPDATE subject
    SET ?
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection
    .promise()
    .query(statement, [subject, subjectId]);

  // 提供数据
  return data;
};

/**
 * 删除分类
 */
export const deleteSubject = async (subjectId: number) => {
  // 准备数据
  const statement = `
    DELETE FROM subject
    WHERE id = ?
  `;

  // 执行
  const [data] = await connection.promise().query(statement, subjectId);

  // 提供数据
  return data;
};

/**
 * 统计内容数量
 */
export const getSubjectTotalCount = async () => {
  // 准备查询
  const statement = `
    SELECT
      COUNT(DISTINCT subject.id) AS total
    FROM subject
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement);

  // 提供结果
  return data[0].total;
};
