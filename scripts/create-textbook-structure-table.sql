-- 教材章节结构表（统一层级结构）
CREATE TABLE IF NOT EXISTS textbook_structure (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 关联教材
  textbook_id INT NOT NULL COMMENT '关联textbook.id',
  
  -- 层级结构（统一抽象）
  level INT NOT NULL COMMENT '层级：1=单元(Unit), 2=课/章节(Lesson/Chapter), 3=子目(可选)',
  parent_id INT NULL COMMENT '父节点ID（NULL表示顶级节点）',
  order_index INT NOT NULL DEFAULT 0 COMMENT '同级排序索引',
  
  -- 内容
  title VARCHAR(500) NOT NULL COMMENT '节点标题（如"第一单元"、"第1课 春天来了"）',
  description TEXT NULL COMMENT '节点描述（可选）',
  
  -- 扩展字段（存储原始目录文本，用于调试）
  raw_text TEXT NULL COMMENT '原始目录文本（用于调试和验证）',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 外键
  FOREIGN KEY (textbook_id) REFERENCES textbook(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES textbook_structure(id) ON DELETE CASCADE,
  
  -- 索引
  INDEX idx_textbook_id (textbook_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_level (level),
  INDEX idx_order_index (order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教材章节结构表（统一层级结构）';


