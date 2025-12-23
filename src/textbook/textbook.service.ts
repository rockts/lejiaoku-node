import { connection } from '../app/database/mysql';
import { TextbookCatalogModel, ResourceTextbookMapModel } from './textbook.model';

/**
 * 获取所有教材骨架
 */
export const getTextbookCatalogList = async () => {
  const statement = `
    SELECT
      id,
      education_level,
      grade,
      subject,
      textbook_version,
      volume,
      created_at,
      updated_at
    FROM textbook_catalog
    ORDER BY education_level, grade, subject, textbook_version, volume
  `;

  const [data] = await connection.promise().query(statement);
  return data;
};

/**
 * 根据 ID 获取教材骨架
 */
export const getTextbookCatalogById = async (id: number) => {
  const statement = `
    SELECT
      id,
      education_level,
      grade,
      subject,
      textbook_version,
      volume,
      created_at,
      updated_at
    FROM textbook_catalog
    WHERE id = ?
  `;

  const [data] = await connection.promise().query(statement, id);
  return (data as any)[0] || null;
};

/**
 * 获取资源关联的教材列表
 */
export const getResourceTextbookList = async (resourceId: number) => {
  const statement = `
    SELECT
      rtm.id,
      rtm.resource_id,
      rtm.textbook_catalog_id,
      rtm.source,
      rtm.confidence,
      rtm.created_at,
      tc.id AS textbook_id,
      tc.education_level,
      tc.grade,
      tc.subject,
      tc.textbook_version,
      tc.volume
    FROM resource_textbook_map rtm
    INNER JOIN textbook_catalog tc ON rtm.textbook_catalog_id = tc.id
    WHERE rtm.resource_id = ?
    ORDER BY rtm.created_at DESC
  `;

  const [data] = await connection.promise().query(statement, resourceId);
  return data;
};

/**
 * 创建资源与教材的关联
 */
export const createResourceTextbookMap = async (
  map: ResourceTextbookMapModel,
) => {
  const statement = `
    INSERT IGNORE INTO resource_textbook_map
    (resource_id, textbook_catalog_id, source, confidence)
    VALUES (?, ?, ?, ?)
  `;

  const [data] = await connection.promise().query(statement, [
    map.resource_id,
    map.textbook_catalog_id,
    map.source || 'manual',
    map.confidence || null,
  ]);

  return data;
};

/**
 * 检查资源是否存在
 */
export const checkResourceExists = async (resourceId: number): Promise<boolean> => {
  const statement = `SELECT id FROM resource WHERE id = ?`;
  const [data] = await connection.promise().query(statement, resourceId);
  return Array.isArray(data) && data.length > 0;
};

