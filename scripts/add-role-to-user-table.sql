-- 为 user 表添加 role 字段（如果不存在）
-- 如果 role 字段已存在，此脚本会报错但不会影响数据库

ALTER TABLE user 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' COMMENT '用户角色：user(普通用户) / admin(管理员)' AFTER email;

-- 如果 role 字段已存在，更新默认值
-- UPDATE user SET role = 'user' WHERE role IS NULL;

