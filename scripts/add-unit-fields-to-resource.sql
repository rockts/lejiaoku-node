-- 为 resource 表添加 unit 和 unit_index 字段
-- 用于显式存储资源所属单元

ALTER TABLE resource
ADD COLUMN IF NOT EXISTS unit VARCHAR(32) NULL COMMENT '资源所属单元（如：第一单元）',
ADD COLUMN IF NOT EXISTS unit_index INT NULL COMMENT '单元序号（如：1）';

-- 添加索引以便筛选
ALTER TABLE resource
ADD INDEX IF NOT EXISTS idx_unit (unit),
ADD INDEX IF NOT EXISTS idx_unit_index (unit_index);

