/**
 * @deprecated Classification Service 当前从 Post 表查询数据
 * 
 * 此服务当前从废弃的 post 表查询分类数据，需要迁移到 resource 表。
 * Resource 表包含以下字段：
 * - category (对应 post.category)
 * - subject (对应 post.subject)
 * - grade (对应 post.grade)
 * - textbook (对应 post.version)
 * 
 * TODO: 迁移到从 resource 表查询：
 * - getCategory() → SELECT DISTINCT(category) FROM resource
 * - getGrade() → SELECT DISTINCT(grade) FROM resource
 * - getVersion() → SELECT DISTINCT(textbook) FROM resource (注意字段名变化)
 * - getSubject() → SELECT DISTINCT(subject) FROM resource
 * 
 * 相关迁移计划请参考：docs/migration/post-to-resource-migration-plan.md
 */

import { connection } from '../app/database/mysql';

/**
 * 获取 category 列表
 * @deprecated 请迁移到从 resource 表查询
 */
export const getCategory = async () => {
  const statement = `
     SELECT
       DISTINCT(category)
     FROM post
   `;

  const [data] = await connection.promise().query(statement);
  return data;
};

/**
 * 获取 grade 列表
 * @deprecated 请迁移到从 resource 表查询
 */
export const getGrade = async () => {
  const statement =
    `
     SELECT
       DISTINCT(grade)
     FROM post
     ORDER BY FIELD(SUBSTRING(grade,1,1),'一','二','三','四','五','六','七','八','九');
   `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取 version 列表
 * @deprecated 请迁移到从 resource 表查询（注意：resource 表使用 textbook 字段）
 */
export const getVersion = async () => {
  const statement = `
     SELECT
       DISTINCT(version)
     FROM post
   `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取 subject 列表
 * @deprecated 请迁移到从 resource 表查询
 */
export const getSubject = async () => {
  const statement = `
     SELECT
       DISTINCT(subject)
     FROM post
   `;

  const [data] = await connection.promise().query(statement);

  return data;
};

