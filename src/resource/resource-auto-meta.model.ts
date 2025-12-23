/**
 * 资源AI自动解析元数据模型
 */
export class ResourceAutoMetaModel {
  id?: number;
  resource_id?: number;
  auto_title?: string | null;
  auto_subject?: string | null;
  auto_grade?: string | null;
  auto_volume?: string | null;
  auto_version?: string | null;
  auto_description?: string | null;
  auto_cover_url?: string | null;
  confidence?: number | null;
  status?: 'processing' | 'completed' | 'failed';
  created_at?: Date;
  updated_at?: Date;
}

/**
 * AI解析结果
 */
export interface AIParseResult {
  title?: string | null;
  subject?: string | null;
  grade?: string | null;
  volume?: string | null;
  textbook_version?: string | null;
  description?: string | null;
  confidence?: number;
}

