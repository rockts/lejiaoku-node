-- 资源表添加审核字段（可选）
-- 用于记录审核人和审核时间

-- 添加 reviewed_by 字段（审核人ID）
ALTER TABLE resource 
ADD COLUMN reviewed_by INT NULL COMMENT '审核人ID' AFTER status;

-- 添加 reviewed_at 字段（审核时间）
ALTER TABLE resource 
ADD COLUMN reviewed_at TIMESTAMP NULL COMMENT '审核时间' AFTER reviewed_by;

-- 添加外键约束（可选，如果需要）
-- ALTER TABLE resource 
-- ADD CONSTRAINT fk_resource_reviewed_by 
-- FOREIGN KEY (reviewed_by) REFERENCES user(id);

