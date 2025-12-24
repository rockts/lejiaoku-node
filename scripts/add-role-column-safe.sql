-- 安全地为 user 表添加 role 字段
-- 使用存储过程检查列是否存在，避免重复添加

-- 如果 role 列不存在，则添加
SET @dbname = DATABASE();
SET @tablename = 'user';
SET @columnname = 'role';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',  -- 列已存在，不做任何操作
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) DEFAULT ''user'' COMMENT ''用户角色：user(普通用户) / admin(管理员)'' AFTER email')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 更新现有用户，将 NULL 的 role 设置为 'user'
UPDATE user SET role = 'user' WHERE role IS NULL OR role = '';

