import { connection } from '../app/database/mysql';
import { ResourceAutoMetaModel, AIParseResult } from './resource-auto-meta.model';

/**
 * 创建或更新自动解析元数据
 */
export const createOrUpdateAutoMeta = async (meta: ResourceAutoMetaModel) => {
  const statement = `
    INSERT INTO resource_auto_meta
    (resource_id, auto_title, auto_subject, auto_grade, auto_volume, auto_version, auto_description, auto_cover_url, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      auto_title = VALUES(auto_title),
      auto_subject = VALUES(auto_subject),
      auto_grade = VALUES(auto_grade),
      auto_volume = VALUES(auto_volume),
      auto_version = VALUES(auto_version),
      auto_description = VALUES(auto_description),
      auto_cover_url = VALUES(auto_cover_url),
      confidence = VALUES(confidence),
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP
  `;

  const [data] = await connection.promise().query(statement, [
    meta.resource_id,
    meta.auto_title || null,
    meta.auto_subject || null,
    meta.auto_grade || null,
    meta.auto_volume || null,
    meta.auto_version || null,
    meta.auto_description || null,
    meta.auto_cover_url || null,
    meta.confidence || null,
    meta.status || 'processing',
  ]);

  return data;
};

/**
 * 获取资源的自动解析元数据
 */
export const getAutoMetaByResourceId = async (resourceId: number) => {
  const statement = `
    SELECT
      id,
      resource_id,
      auto_title,
      auto_subject,
      auto_grade,
      auto_volume,
      auto_version,
      auto_description,
      auto_cover_url,
      confidence,
      status,
      created_at,
      updated_at
    FROM resource_auto_meta
    WHERE resource_id = ?
  `;

  const [data] = await connection.promise().query(statement, resourceId);
  return (data as any)[0] || null;
};

