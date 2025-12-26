/**
 * 资源教材目录绑定服务
 * 用于人工绑定资源到教材目录
 */

import { connection } from '../app/database/mysql';

/**
 * 获取待人工绑定的资源列表
 * 条件：
 * - resource.auto_meta_result IS NOT NULL
 * - 未绑定到任何教材目录（resource_textbook_map 中无记录）
 * - auto_meta_result 中 subject / grade_number / volume 存在
 */
export const getUnboundResources = async () => {
  const statement = `
    SELECT 
      r.id as resource_id,
      r.title,
      JSON_EXTRACT(r.auto_meta_result, '$.subject') as subject,
      JSON_EXTRACT(r.auto_meta_result, '$.grade') as grade,
      JSON_EXTRACT(r.auto_meta_result, '$.grade_number') as grade_number,
      JSON_EXTRACT(r.auto_meta_result, '$.volume') as volume,
      JSON_EXTRACT(r.auto_meta_result, '$.textbook_version') as textbook_version,
      JSON_EXTRACT(r.auto_meta_result, '$.education_level') as education_level
    FROM resource r
    WHERE r.auto_meta_result IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM resource_textbook_map rtm 
        WHERE rtm.resource_id = r.id
      )
      AND JSON_EXTRACT(r.auto_meta_result, '$.subject') IS NOT NULL
      AND JSON_EXTRACT(r.auto_meta_result, '$.grade_number') IS NOT NULL
      AND JSON_EXTRACT(r.auto_meta_result, '$.volume') IS NOT NULL
    ORDER BY r.created_at DESC
  `;

  const [resources] = await connection.promise().query(statement);

  // 处理结果，获取候选教材目录
  const result = await Promise.all(
    (resources as any[]).map(async (resource) => {
      // 解析 JSON 字段（去除引号）
      const subject = resource.subject ? resource.subject.replace(/^"|"$/g, '') : null;
      const grade = resource.grade ? resource.grade.replace(/^"|"$/g, '') : null;
      const gradeNumber = resource.grade_number ? parseInt(resource.grade_number, 10) : null;
      const volume = resource.volume ? resource.volume.replace(/^"|"$/g, '') : null;
      const textbookVersion = resource.textbook_version ? resource.textbook_version.replace(/^"|"$/g, '') : null;
      const educationLevel = resource.education_level ? resource.education_level.replace(/^"|"$/g, '') : null;

      // 查询候选教材目录
      const candidateCatalogs = await getCandidateCatalogs({
        education_level: educationLevel,
        subject,
        grade_number: gradeNumber,
        volume,
      });

      return {
        resource_id: resource.resource_id,
        title: resource.title,
        subject,
        grade,
        volume,
        textbook_version: textbookVersion,
        candidate_catalogs: candidateCatalogs,
      };
    })
  );

  return result;
};

/**
 * 获取候选教材目录
 * 根据 subject, grade_number, volume 匹配 textbook_catalog
 */
export const getCandidateCatalogs = async (params: {
  education_level: string | null;
  subject: string | null;
  grade_number: number | null;
  volume: string | null;
}) => {
  const { education_level, subject, grade_number, volume } = params;

  if (!subject || !grade_number || !volume) {
    return [];
  }

  let statement = `
    SELECT 
      id,
      education_level,
      grade,
      subject,
      textbook_version,
      volume
    FROM textbook_catalog
    WHERE subject = ?
      AND grade = ?
      AND volume = ?
  `;
  const queryParams: any[] = [subject, String(grade_number), volume];

  // 如果 education_level 存在，添加到查询条件
  if (education_level) {
    statement += ' AND education_level = ?';
    queryParams.push(education_level);
  }

  statement += ' ORDER BY textbook_version';

  const [catalogs] = await connection.promise().query(statement, queryParams);

  return (catalogs as any[]).map((catalog) => ({
    id: catalog.id,
    education_level: catalog.education_level,
    grade: catalog.grade,
    subject: catalog.subject,
    textbook_version: catalog.textbook_version,
    volume: catalog.volume,
  }));
};

/**
 * 绑定资源到教材目录
 * @param resourceId 资源ID
 * @param catalogId 教材目录ID
 * @param operatorId 操作人ID
 * @returns 是否绑定成功
 */
export const bindResourceToCatalog = async (
  resourceId: number,
  catalogId: number,
  operatorId: number,
): Promise<{ success: boolean; message: string }> => {
  // 1. 校验资源是否存在
  const [resourceCheck]: any = await connection.promise().query(
    'SELECT id FROM resource WHERE id = ?',
    [resourceId]
  );

  if (!resourceCheck || resourceCheck.length === 0) {
    return {
      success: false,
      message: '资源不存在',
    };
  }

  // 2. 校验教材目录是否存在
  const [catalogCheck]: any = await connection.promise().query(
    'SELECT id FROM textbook_catalog WHERE id = ?',
    [catalogId]
  );

  if (!catalogCheck || catalogCheck.length === 0) {
    return {
      success: false,
      message: '教材目录不存在',
    };
  }

  // 3. 检查是否已绑定（幂等性检查）
  const [existingBind]: any = await connection.promise().query(
    'SELECT id FROM resource_textbook_map WHERE resource_id = ?',
    [resourceId]
  );

  if (existingBind && existingBind.length > 0) {
    return {
      success: false,
      message: '资源已绑定到教材目录，禁止重复绑定',
    };
  }

  // 4. 写入绑定记录
  try {
    const statement = `
      INSERT INTO resource_textbook_map 
        (resource_id, textbook_catalog_id, source, created_at)
      VALUES (?, ?, 'manual', CURRENT_TIMESTAMP)
    `;

    await connection.promise().query(statement, [resourceId, catalogId]);

    return {
      success: true,
      message: '绑定成功',
    };
  } catch (error) {
    // 处理唯一约束冲突（如果表有唯一约束）
    const mysqlError = error as any;
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return {
        success: false,
        message: '资源已绑定到该教材目录',
      };
    }
    throw error;
  }
};

