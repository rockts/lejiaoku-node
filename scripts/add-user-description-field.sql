-- 用户表添加个人介绍字段
-- 添加 description 字段用于存储用户的个人介绍

-- 检查字段是否存在，如果不存在则添加
-- 注意：MySQL 不支持 IF NOT EXISTS，需要手动检查
-- 如果字段已存在，此语句会报错 "Duplicate column name 'description'"

-- 添加 description 字段（TEXT 类型，可存储较长的文本）
ALTER TABLE user 
ADD COLUMN description TEXT NULL COMMENT '个人介绍' AFTER avatar_url;

