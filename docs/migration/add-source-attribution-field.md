# 添加资源出处字段迁移指南

## 概述

为 `resource` 表添加 `source_attribution` 字段，用于标注资源的原始来源（如"xx教育"、"某某出版社"等）。

## 执行方式

### 方式 1：使用 MySQL 客户端（推荐）

```bash
mysql -u用户名 -p数据库名 < scripts/add-source-attribution-to-resource.sql
```

或者直接在 MySQL 客户端中执行：

```sql
-- 为 resource 表添加 source_attribution 字段（资源出处/来源标注）
-- 用于标注资源的原始来源，如"xx教育"、"某某出版社"等

-- 检查字段是否存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'resource';
SET @columnname = 'source_attribution';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(100) NULL COMMENT ''资源出处/来源标注（如：xx教育、某某出版社等）'' AFTER description')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
```

### 方式 2：使用 Node.js 脚本

```bash
node scripts/add-source-attribution-field.js
```

**注意**：需要确保 `.env` 文件中的数据库配置正确。

## 字段信息

- **字段名**：`source_attribution`
- **类型**：`VARCHAR(100)`
- **是否可空**：`NULL`（可选字段）
- **位置**：在 `description` 字段之后
- **说明**：资源出处/来源标注（如：xx教育、某某出版社等）

## 验证

执行后，可以通过以下 SQL 验证字段是否添加成功：

```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'resource' 
  AND COLUMN_NAME = 'source_attribution';
```

## 回滚（如果需要）

如果需要删除该字段：

```sql
ALTER TABLE resource DROP COLUMN source_attribution;
```

**注意**：删除字段会丢失所有已保存的出处信息，请谨慎操作。

