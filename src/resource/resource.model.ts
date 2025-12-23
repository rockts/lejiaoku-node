export class ResourceModel {
  id?: number;
  title?: string;
  description?: string;
  category?: string;
  subject?: string;
  grade?: number | string; // 支持数字（1-6）或字符串（如 "四年级下册"）
  textbook?: string;
  file_format?: string;
  file_url?: string;
  cover_url?: string;
  chapter_info?: string | null; // 章节信息（非结构化文本）
  auto_meta_status?: 'pending' | 'done' | 'failed'; // AI元数据识别状态：pending(待识别)/done(已完成)/failed(失败)
  auto_meta_result?: any; // AI识别结果（JSON格式，未来用于存储封面/章节/简介等）
  download_count?: number;
  status?: string;
  source_type?: 'official' | 'user'; // 资源来源类型：'official' 平台资源，'user' 用户贡献资源
  user_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

