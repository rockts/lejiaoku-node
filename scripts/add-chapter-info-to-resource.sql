-- 为 resource 表添加 chapter_info 字段（章节信息，非结构化文本）
-- 此字段允许自由表达章节信息，不强制层级结构
-- 注意：MySQL 不支持 IF NOT EXISTS，需要先检查字段是否存在

ALTER TABLE resource 
ADD COLUMN chapter_info TEXT NULL COMMENT '章节信息（非结构化文本，如：第一单元 春天来了 / 第3章 函数 / Unit 1 Hello等）' 
AFTER textbook;
