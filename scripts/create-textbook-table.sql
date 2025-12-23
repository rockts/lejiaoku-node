-- 教材表（统一抽象结构）
CREATE TABLE IF NOT EXISTS textbook (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基本信息
  title VARCHAR(500) NOT NULL COMMENT '教材名称',
  cover_url VARCHAR(500) NULL COMMENT '封面URL',
  description TEXT NULL COMMENT '教材简介',
  
  -- 结构化字段（统一抽象）
  education_level VARCHAR(20) NOT NULL COMMENT '学段：小学/初中',
  subject VARCHAR(50) NOT NULL COMMENT '学科：语文/数学/英语/道德与法治/科学/物理/化学/生物',
  textbook_version VARCHAR(50) NULL COMMENT '教材版本：人教版/苏教版/北师大版（可为空）',
  volume VARCHAR(20) NOT NULL COMMENT '册次：上册/下册/全一册',
  
  -- 关联资源
  resource_id INT NULL COMMENT '关联的resource.id（教材文件资源）',
  
  -- 元数据
  source_type VARCHAR(20) NOT NULL DEFAULT 'official' COMMENT '来源类型：official(平台)/user(用户)',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/approved/rejected',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_education_level (education_level),
  INDEX idx_subject (subject),
  INDEX idx_textbook_version (textbook_version),
  INDEX idx_volume (volume),
  INDEX idx_resource_id (resource_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材表（统一抽象结构）';

