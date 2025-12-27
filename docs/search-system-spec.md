# 搜索系统规范

## 📋 概述

本文档定义了乐教库项目中「搜索与排序系统」的硬约束和系统级规范，确保搜索行为的稳定性和可维护性。

**核心原则**：
- **搜索 ≠ 教材结构**
- **Catalog / Unit 是强结构**
- **Keyword 只是"补充检索手段"**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. 搜索模式升级

#### 1.1 关键词搜索范围

**规则**：
- 关键词搜索**严格限定**在以下字段：
  - `resource.title`
  - `resource.description`
  - `resource.tags`（如果存在）

**禁止**：
- ❌ 关键词搜索参与任何教材语义判断
- ❌ 关键词搜索影响 catalog / unit 筛选
- ❌ 关键词 LIKE chapter / unit 的情况

**代码位置**：
- `src/resource/resource.middleware.ts` - `filter()`, `adminFilter()`
- `src/resource/resource.service.ts` - `getResourceList()`

---

#### 1.2 Catalog / Unit 结构化参数

**规则**：
- `catalog` / `unit` **永远只通过结构化参数生效**
- 结构化参数包括：
  - `catalog_id`（直接指定教材目录 ID）
  - `subject` + `grade` + `volume` + `textbook_version`（组合指定教材目录）
  - `unit`（指定单元）

**禁止**：
- ❌ 任何基于关键词推断 catalog / unit 的逻辑
- ❌ 任何基于 `chapter_info` / `auto_meta_result.structure` 的推断

---

### 2. 搜索优先级规则（严格按以下顺序，不可调整）

当同时存在以下参数时，优先级必须严格如下：

```
优先级 1: catalog_id + unit（最高优先级）
优先级 2: catalog_id（通过 subject/grade/volume/textbook_version 组合）
优先级 3: keyword（仅搜索 title/description）
优先级 4: 普通资源列表（无任何条件）
```

**禁止出现**：
- ❌ `keyword` 影响 `catalog` / `unit` 的情况
- ❌ `keyword LIKE chapter` / `unit` 的情况

**实现逻辑**：
```typescript
// 优先级判定流程
if (hasCatalogFilter && hasUnit) {
  // 优先级 1: catalog_id + unit
  searchMode = 'catalog_unit';
} else if (hasCatalogFilter) {
  // 优先级 2: catalog_id
  searchMode = 'catalog';
} else if (keyword) {
  // 优先级 3: keyword
  searchMode = 'keyword';
} else {
  // 优先级 4: 普通列表
  searchMode = 'default';
}
```

**代码位置**：
- `src/resource/resource.middleware.ts` - `filter()` 函数

---

### 3. 排序规则标准化

实现统一排序策略，按搜索模式使用不同的 `ORDER BY`：

#### 3.1 Catalog + Unit 场景

**排序规则**：
```sql
ORDER BY unit_index ASC, created_at DESC
```

**使用场景**：
- 同时传了 `catalog_id`（或组合参数）和 `unit`

---

#### 3.2 Catalog 场景

**排序规则**：
```sql
ORDER BY unit_index ASC, created_at DESC
```

**使用场景**：
- 只传了 `catalog_id`（或组合参数），没有 `unit`

---

#### 3.3 Keyword 场景

**排序规则**：
```sql
ORDER BY relevance DESC, created_at DESC
```

**relevance 计算**（简单 LIKE 命中数模拟）：
```sql
(
  CASE 
    WHEN resource.title LIKE ? THEN 2
    WHEN resource.description LIKE ? THEN 1
    ELSE 0
  END
) as relevance
```

**权重规则**：
- `title` 命中：权重 2
- `description` 命中：权重 1
- 未命中：权重 0

**注意**：
- 不允许引入全文索引或外部搜索引擎
- 使用简单 LIKE 命中数模拟 relevance

---

#### 3.4 普通列表场景

**排序规则**：
```sql
ORDER BY created_at DESC
```

**使用场景**：
- 无任何筛选条件

---

### 4. 冻结旧搜索入口（必须）

#### 4.1 已废弃的搜索路径

以下搜索路径已被**永久废弃**，禁止使用：

1. **`chapter_keyword`**
   - 状态：已废弃
   - 原因：违反"搜索 ≠ 教材结构"原则
   - 替代方案：使用 `unit` 结构化参数

2. **`chapter_info LIKE`**
   - 状态：已废弃
   - 原因：违反"搜索 ≠ 教材结构"原则
   - 替代方案：使用 `unit` 结构化参数

3. **`auto_meta_result.structure` 搜索**
   - 状态：已废弃
   - 原因：违反"搜索 ≠ 教材结构"原则
   - 替代方案：使用 `unit` 结构化参数

#### 4.2 代码标注

在代码中明确标注这些路径为"历史废弃路径（DO NOT USE）"：

```typescript
/**
 * 【历史废弃路径（DO NOT USE）】：
 * - chapter_keyword - 已废弃，禁止使用
 * - chapter_info LIKE - 已废弃，禁止使用
 * - auto_meta_result.structure 搜索 - 已废弃，禁止使用
 */
```

**代码位置**：
- `src/resource/resource.middleware.ts` - `filter()` 函数注释

---

## 📊 核心 SQL（完整可执行）

### 1. Catalog + Unit 场景 SQL

```sql
SELECT DISTINCT
  r.id,
  r.title,
  r.description,
  r.category,
  r.subject,
  r.grade,
  r.textbook,
  r.chapter_info,
  r.unit,
  r.unit_index,
  r.file_format,
  r.file_url,
  r.cover_url,
  r.download_count,
  r.status,
  r.user_id,
  r.auto_meta_status,
  r.auto_meta_result,
  r.created_at,
  r.updated_at
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE 
  r.status = "approved"
  AND r.file_format NOT IN ("视频", "VIDEO")
  AND r.category NOT IN ("视频")
  AND c.id = ?  -- catalog_id
  AND r.unit = ?  -- unit
ORDER BY r.unit_index ASC, r.created_at DESC
LIMIT ? OFFSET ?
```

---

### 2. Catalog 场景 SQL

```sql
SELECT DISTINCT
  r.id,
  r.title,
  r.description,
  r.category,
  r.subject,
  r.grade,
  r.textbook,
  r.chapter_info,
  r.unit,
  r.unit_index,
  r.file_format,
  r.file_url,
  r.cover_url,
  r.download_count,
  r.status,
  r.user_id,
  r.auto_meta_status,
  r.auto_meta_result,
  r.created_at,
  r.updated_at
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE 
  r.status = "approved"
  AND r.file_format NOT IN ("视频", "VIDEO")
  AND r.category NOT IN ("视频")
  AND c.subject = ?
  AND c.grade = ?
  AND c.volume = ?
  AND c.textbook_version = ?
ORDER BY r.unit_index ASC, r.created_at DESC
LIMIT ? OFFSET ?
```

---

### 3. Keyword 场景 SQL

```sql
SELECT
  resource.id,
  resource.title,
  resource.description,
  resource.category,
  resource.subject,
  resource.grade,
  resource.textbook,
  resource.chapter_info,
  resource.unit,
  resource.unit_index,
  resource.file_format,
  resource.file_url,
  resource.cover_url,
  resource.download_count,
  resource.status,
  resource.user_id,
  resource.auto_meta_status,
  resource.auto_meta_result,
  resource.created_at,
  resource.updated_at,
  (
    CASE 
      WHEN resource.title LIKE ? THEN 2
      WHEN resource.description LIKE ? THEN 1
      ELSE 0
    END
  ) as relevance
FROM resource
WHERE 
  resource.status = "approved"
  AND resource.file_format NOT IN ("视频", "VIDEO")
  AND resource.category NOT IN ("视频")
  AND (resource.title LIKE ? OR resource.description LIKE ?)
ORDER BY relevance DESC, resource.created_at DESC
LIMIT ? OFFSET ?
```

---

### 4. 普通列表场景 SQL

```sql
SELECT
  resource.id,
  resource.title,
  resource.description,
  resource.category,
  resource.subject,
  resource.grade,
  resource.textbook,
  resource.chapter_info,
  resource.unit,
  resource.unit_index,
  resource.file_format,
  resource.file_url,
  resource.cover_url,
  resource.download_count,
  resource.status,
  resource.user_id,
  resource.auto_meta_status,
  resource.auto_meta_result,
  resource.created_at,
  resource.updated_at
FROM resource
WHERE 
  resource.status = "approved"
  AND resource.file_format NOT IN ("视频", "VIDEO")
  AND resource.category NOT IN ("视频")
ORDER BY resource.created_at DESC
LIMIT ? OFFSET ?
```

---

## 🔍 搜索优先级判定流程

### 文字描述

1. **检测 catalog 筛选参数**
   - 检查是否存在 `catalog_id` 或组合参数（`subject` + `grade` + `volume` + `textbook_version`）
   - 如果存在，标记为 `hasCatalogFilter = true`

2. **检测 unit 参数**
   - 检查是否存在 `unit` 参数
   - 如果存在，标记为 `hasUnit = true`

3. **检测 keyword 参数**
   - 检查是否存在 `keyword` 参数
   - 如果存在，标记为 `hasKeyword = true`

4. **优先级判定**
   - 如果 `hasCatalogFilter && hasUnit` → 优先级 1（catalog + unit）
   - 否则如果 `hasCatalogFilter` → 优先级 2（catalog）
   - 否则如果 `hasKeyword` → 优先级 3（keyword）
   - 否则 → 优先级 4（普通列表）

5. **应用筛选和排序**
   - 根据优先级应用对应的 SQL 筛选条件
   - 根据搜索模式应用对应的排序规则

### 代码注释

```typescript
/**
 * 【搜索系统规范】搜索优先级判定
 * 优先级 1: catalog_id + unit（最高优先级）
 * 优先级 2: catalog_id（通过 subject/grade/volume/textbook_version 组合）
 * 优先级 3: keyword（仅搜索 title/description）
 * 优先级 4: 普通资源列表（无任何条件）
 * 
 * 禁止出现：
 * - keyword 影响 catalog / unit 的情况
 * - keyword LIKE chapter / unit 的情况
 */
```

---

## ✅ 完成标准验证

### 必须全部满足

1. **关键词搜索严格限定在 title/description**
   - ✅ 已实现：只搜索 `resource.title` 和 `resource.description`
   - ✅ 已禁止：关键词搜索参与教材语义判断

2. **搜索优先级规则严格按顺序执行**
   - ✅ 已实现：catalog_id + unit > catalog_id > keyword > 普通列表
   - ✅ 已禁止：keyword 影响 catalog / unit

3. **排序规则标准化**
   - ✅ 已实现：按搜索模式使用不同的 ORDER BY
   - ✅ 已实现：relevance 用简单 LIKE 命中数模拟

4. **旧搜索入口已冻结**
   - ✅ 已标注：chapter_keyword, chapter_info LIKE, auto_meta_result.structure 为"历史废弃路径（DO NOT USE）"

5. **文档已创建**
   - ✅ 已创建：`docs/search-system-spec.md`

---

## 📝 修改文件清单

1. **修改文件**：
   - `src/resource/resource.middleware.ts` - 实现搜索优先级规则
   - `src/resource/resource.service.ts` - 实现排序规则标准化

2. **新增文件**：
   - `docs/search-system-spec.md` - 搜索系统规范文档

---

## 🎯 总结

**核心成果**：
1. ✅ 搜索模式已升级：关键词搜索严格限定在 title/description
2. ✅ 搜索优先级规则已实现：catalog_id + unit > catalog_id > keyword > 普通列表
3. ✅ 排序规则已标准化：按搜索模式使用不同的 ORDER BY
4. ✅ 旧搜索入口已冻结：标注为"历史废弃路径（DO NOT USE）"
5. ✅ 文档已创建：`docs/search-system-spec.md`

**核心原则**：
- **搜索 ≠ 教材结构**
- **Catalog / Unit 是强结构**
- **Keyword 只是"补充检索手段"**

