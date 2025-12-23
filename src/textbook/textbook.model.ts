/**
 * 教材目录模型
 */
export class TextbookCatalogModel {
  id?: number;
  education_level?: string; // elementary(小学) / middle(初中)
  grade?: string; // 1-9
  subject?: string; // 学科
  textbook_version?: string; // 教材版本
  volume?: string; // 上册 / 下册
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 资源与教材关联模型
 */
export class ResourceTextbookMapModel {
  id?: number;
  resource_id?: number;
  textbook_catalog_id?: number;
  source?: 'manual' | 'ai'; // 绑定来源：manual(手动) / ai(AI)
  confidence?: number | null; // 置信度（AI 推断时使用）
  created_at?: Date;
}

