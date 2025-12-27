# 数据库未使用表分析报告

## 数据库表清单

当前数据库共有 **19 个表**：

### 正在使用的表（16个）

1. ✅ **avatar** - 用户头像表（使用中）
2. ✅ **catalog_tasks** - 教材目录任务表（使用中）
3. ✅ **comment** - 评论表（使用中）
4. ✅ **contributor_applications** - 贡献者申请表（使用中）
5. ✅ **cover** - 封面表（使用中）
6. ✅ **file** - 文件表（使用中）
7. ✅ **post** - 帖子表（使用中）
8. ✅ **post_tag** - 帖子标签关联表（使用中）
9. ✅ **resource** - 资源表（使用中，核心表）
10. ✅ **resource_auto_meta** - 资源AI元数据表（使用中）
11. ✅ **resource_textbook_map** - 资源与教材目录映射表（使用中，核心表）
12. ✅ **tag** - 标签表（使用中）
13. ✅ **textbook_catalog** - 教材目录表（使用中，核心表）
14. ✅ **user** - 用户表（使用中）
15. ✅ **user_like_post** - 用户点赞帖子表（使用中）
16. ✅ **user_save_post** - 用户收藏帖子表（使用中）

---

## 可能未使用或已废弃的表（3个）

### 1. ⚠️ **textbook** 表

**状态**：可能已废弃，但仍有少量数据和使用代码

**数据情况**：
- 记录数：5 条
- 最后更新时间：2025-12-25

**代码使用情况**：
- ✅ 有路由：`GET /api/textbooks/:id`、`GET /api/textbooks/by-resource/:resourceId`
- ✅ 有服务方法：`createTextbook`、`getTextbookById`、`getTextbookByResourceId`
- ✅ 有调用：`processTextbookUpload` 在 `resource.controller.ts` 中被调用

**问题分析**：
- 系统现在主要使用 `textbook_catalog` 表作为教材目录的标准表
- `textbook` 表的设计与 `textbook_catalog` 表功能重叠
- `textbook` 表关联 `resource_id`，而 `textbook_catalog` 通过 `resource_textbook_map` 关联资源
- 当前系统架构：`textbook_catalog` → `resource_textbook_map` → `resource`，不再需要 `textbook` 表

**建议**：
- 🔍 **需要确认**：`processTextbookUpload` 是否还在使用
- 🔍 **需要确认**：前端是否还在调用 `/api/textbooks/:id` 接口
- 💡 **如果确认废弃**：可以删除这5条记录和相关的代码

---

### 2. ⚠️ **textbook_structure** 表

**状态**：已废弃，表中无数据

**数据情况**：
- 记录数：0 条
- 表结构：用于存储教材的层级结构（单元、课、章节）

**代码使用情况**：
- ✅ 有服务方法：`createTextbookStructure`、`getTextbookStructures`、`getTextbookStructureTree`
- ✅ 有路由：`GET /api/textbooks/:id` 返回结构树
- ❌ 但表中无数据，说明这些方法可能从未被实际使用

**问题分析**：
- 系统现在使用 `resource.unit` 字段来存储单元信息
- 系统现在使用 `textbook_catalog` 表作为教材目录的标准表
- `textbook_structure` 表的设计与当前系统架构不符
- 当前系统架构：`textbook_catalog` → `resource.unit` → `resource`，不再需要 `textbook_structure` 表

**建议**：
- 💡 **可以删除**：表中无数据，代码可能从未被实际使用
- 💡 **如果保留**：需要确认是否有计划使用这个表

---

### 3. 🗑️ **textbook_catalog_backup_utf8fix** 表

**状态**：备份表，应该删除

**数据情况**：
- 记录数：1344 条
- 表名包含 `backup`，说明这是备份表

**代码使用情况**：
- ❌ 无任何代码使用此表
- ❌ 无任何路由使用此表

**问题分析**：
- 这是 `textbook_catalog` 表的备份表（用于修复 UTF-8 编码问题）
- 备份已完成，不再需要

**建议**：
- 🗑️ **可以删除**：这是临时备份表，修复完成后应该删除
- 💡 **删除前**：确认 `textbook_catalog` 表数据正常，无需恢复

---

## 总结

### 建议删除的表

1. **textbook_catalog_backup_utf8fix** - 备份表，1344条记录，无代码使用
2. **textbook_structure** - 0条记录，无实际使用，与当前架构不符

### 需要确认的表

1. **textbook** - 5条记录，有代码使用，但功能与 `textbook_catalog` 重叠
   - 需要确认：前端是否还在使用相关接口
   - 需要确认：`processTextbookUpload` 是否还在使用

---

## 删除建议

### 安全删除步骤

1. **备份数据库**（重要！）
   ```bash
   mysqldump -u用户名 -p数据库名 > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **删除备份表**（最安全）
   ```sql
   DROP TABLE IF EXISTS textbook_catalog_backup_utf8fix;
   ```

3. **删除 textbook_structure 表**（需确认无使用）
   ```sql
   DROP TABLE IF EXISTS textbook_structure;
   ```

4. **处理 textbook 表**（需确认）
   - 如果确认废弃：先删除数据，再删除表
   - 如果保留：暂时不动

### 代码清理（如果删除表）

如果删除 `textbook` 和 `textbook_structure` 表，需要清理以下代码：

1. **删除文件**：
   - `src/textbook/textbook.service.ts`（部分方法）
   - `src/textbook/textbook.model.ts`（部分模型）
   - `src/textbook/textbook-parser.service.ts`（如果不再使用）

2. **修改文件**：
   - `src/textbook/textbook.controller.ts`（删除相关方法）
   - `src/textbook/textbook.router.ts`（删除相关路由）
   - `src/resource/resource.controller.ts`（删除 `processTextbookUpload` 调用）

---

## 验证方法

### 检查 textbook 表是否还在使用

1. **检查前端代码**：
   ```bash
   # 在前端代码中搜索
   grep -r "/api/textbooks" frontend/
   ```

2. **检查日志**：
   ```bash
   # 查看是否有访问日志
   grep "textbooks" logs/
   ```

3. **检查数据库连接**：
   ```sql
   -- 查看是否有其他应用连接此表
   SHOW PROCESSLIST;
   ```

---

## 更新日期

2025-01-XX

## 备注

- 本分析基于当前代码库和数据库状态
- 建议在删除表之前，先确认前端和其他系统是否还在使用
- 建议在删除表之前，先备份数据库

