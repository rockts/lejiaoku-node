# 教材目录骨架生成脚本使用说明

## 概述

本脚本用于生成教材目录的"空骨架"，不包含具体课文内容。生成的骨架作为资源挂载锚点，后续可通过 AI 或人工补充具体内容。

## 文件说明

1. **create-textbook-catalog-table.sql** - 创建教材目录表的 SQL 脚本
2. **generate-textbook-catalog-skeleton.js** - 生成骨架数据的 Node.js 脚本

## 数据结构

### 表结构：textbook_catalog

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| education_level | VARCHAR(20) | 学段：elementary(小学) / middle(初中) |
| grade | VARCHAR(20) | 年级：1-9 |
| subject | VARCHAR(50) | 学科 |
| textbook_version | VARCHAR(50) | 教材版本 |
| volume | VARCHAR(20) | 册别：上册 / 下册 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**唯一约束**：`(education_level, grade, subject, textbook_version, volume)`

## 生成规则

### 学段和年级

- **小学（elementary）**：1-6 年级
- **初中（middle）**：7-9 年级

### 学科

基础学科（所有学段）：
- 语文
- 数学
- 英语
- 道德与法治
- 音乐
- 美术
- 体育

学段特定学科：
- **小学**：科学
- **初中**：物理、化学、生物、历史、地理

### 教材版本（主流版本）

- 人教版
- 苏教版
- 北师大版
- 外研版
- 沪教版
- 冀教版
- 浙教版
- 湘教版

### 册别

- 上册
- 下册

## 使用方法

### 1. 创建表结构

```bash
# 方式1：使用 MySQL 客户端
mysql -u用户名 -p数据库名 < scripts/create-textbook-catalog-table.sql

# 方式2：使用 Node.js（脚本会自动执行）
node -e "
const mysql = require('mysql2');
const fs = require('fs');
const sql = fs.readFileSync('scripts/create-textbook-catalog-table.sql', 'utf8');
// ... 连接数据库并执行
"
```

### 2. 生成骨架数据

```bash
node scripts/generate-textbook-catalog-skeleton.js
```

### 3. 验证数据

脚本会输出：
- 当前已存在的记录数
- 生成的组合总数
- 成功插入的新记录数
- 最终数据总数

## 特性

1. **可重复执行**：使用 `INSERT IGNORE` 避免重复插入
2. **智能过滤**：根据学科所属学段自动过滤组合
3. **完整组合**：生成所有可能的组合（学段 × 年级 × 学科 × 版本 × 册别）

## 示例输出

```
🚀 开始生成教材目录骨架...

📊 当前已存在 0 条记录

📝 生成组合数据...
   共生成 1248 个组合

📋 组合示例（前5条）：
   1. 小学 1年级 语文 人教版 上册
   2. 小学 1年级 语文 人教版 下册
   3. 小学 1年级 语文 苏教版 上册
   4. 小学 1年级 语文 苏教版 下册
   5. 小学 1年级 语文 北师大版 上册

💾 插入数据...
   ✅ 成功插入 1248 条新记录
   ℹ️  跳过 0 条已存在的记录

📊 最终数据总数: 1248 条

✅ 教材目录骨架生成完成！
```

## 后续扩展

- 可以在此基础上添加 `unit`（单元）和 `lesson`（课文）层级
- 可以添加更多教材版本
- 可以添加更多学科
- 可以为每个目录项添加描述、封面等字段


