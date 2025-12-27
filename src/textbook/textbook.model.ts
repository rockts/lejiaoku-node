/**
 * 教材模型（统一抽象结构）
 */
export class TextbookModel {
  id?: number;
  title?: string;
  cover_url?: string | null;
  description?: string | null;
  
  // 结构化字段（统一抽象）
  education_level?: '小学' | '初中'; // 学段
  subject?: string; // 学科：语文/数学/英语/道德与法治/科学/物理/化学/生物
  textbook_version?: string | null; // 教材版本：人教版/苏教版/北师大版（可为空）
  volume?: '上册' | '下册' | '全一册'; // 册次
  
  // 关联资源
  resource_id?: number | null; // 关联的resource.id
  
  // 元数据
  source_type?: 'official' | 'user';
  status?: 'pending' | 'approved' | 'rejected';
  
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 教材章节结构模型（统一层级结构）
 */
export class TextbookStructureModel {
  id?: number;
  textbook_id?: number;
  
  // 层级结构（统一抽象）
  level?: number; // 1=单元(Unit), 2=课/章节(Lesson/Chapter), 3=子目(可选)
  parent_id?: number | null; // 父节点ID
  order_index?: number; // 同级排序索引
  
  // 内容
  title?: string; // 节点标题
  description?: string | null; // 节点描述
  raw_text?: string | null; // 原始目录文本
  
  created_at?: Date;
  updated_at?: Date;
}

/**
 * 教材完整信息（包含结构树）
 */
export interface TextbookWithStructure {
  textbook: TextbookModel;
  structure: TextbookStructureNode[];
}

/**
 * 教材结构树节点
 */
export interface TextbookStructureNode {
  id: number;
  level: number;
  title: string;
  description?: string | null;
  children?: TextbookStructureNode[];
  order_index: number;
}
