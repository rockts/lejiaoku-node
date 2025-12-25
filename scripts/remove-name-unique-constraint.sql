-- 移除 name 字段的唯一约束
-- name 字段将作为真实姓名，不需要唯一

-- 1. 删除 name 字段的唯一索引
ALTER TABLE user DROP INDEX name;

-- 2. 验证约束已移除
-- SHOW INDEX FROM user WHERE Column_name = 'name';

