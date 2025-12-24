-- 教材目录表
CREATE TABLE IF NOT EXISTS textbook_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  education_level VARCHAR(20) NOT NULL COMMENT '学段：elementary(小学) / middle(初中)',
  grade VARCHAR(20) NOT NULL COMMENT '年级：1-9',
  subject VARCHAR(50) NOT NULL COMMENT '学科',
  textbook_version VARCHAR(50) NOT NULL COMMENT '教材版本',
  volume VARCHAR(20) NOT NULL COMMENT '册别：上册 / 下册',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_catalog (education_level, grade, subject, textbook_version, volume),
  INDEX idx_education_level (education_level),
  INDEX idx_grade (grade),
  INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材目录骨架表';


