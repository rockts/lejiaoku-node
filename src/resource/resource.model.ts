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
  download_count?: number;
  status?: string;
  source_type?: 'official' | 'user'; // 资源来源类型：'official' 平台资源，'user' 用户贡献资源
  user_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

