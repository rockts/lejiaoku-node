-- 删除 textbook_catalog_backup_utf8fix 备份表
-- 此表是 textbook_catalog 表的备份表，用于修复 UTF-8 编码问题
-- 备份已完成，数据已迁移到 textbook_catalog 表，可以安全删除

-- 删除前确认：
-- 1. textbook_catalog 表数据正常
-- 2. 无代码使用此备份表
-- 3. 已备份数据库（可选，但建议）

DROP TABLE IF EXISTS textbook_catalog_backup_utf8fix;

