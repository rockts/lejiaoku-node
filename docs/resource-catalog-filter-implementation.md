# 资源搜索/筛选改为基于 catalog（教材目录）实现总结

## 实现概述

将资源搜索/筛选彻底改为以 `catalog_info`（教材目录）为唯一权威来源，禁止使用 `resource` 原始字段或 `auto_meta_result` 作为筛选条件。

---

## 修改的文件

### 1. `src/resource/resource.middleware.ts`
- **修改函数**: `filter()` 和 `adminFilter()`
- **改动**: 
  - 检测是否有教材筛选参数（`subject`, `grade`, `volume`, `textbook_version`）
  - 如果有，标记为 `catalogFilter` 类型，将筛选条件传递给 service 层
  - 移除所有基于 `resource.subject`, `resource.grade`, `resource.textbook` 的筛选逻辑

### 2. `src/resource/resource.service.ts`
- **修改函数**: `getResourceList()` 和 `getResourceTotalCount()`
- **改动**:
  - 检测 `filter.name === 'catalogFilter'` 时，使用 JOIN 结构
  - 基于 `textbook_catalog` 表构建筛选条件
  - 未绑定 catalog 的资源自动被排除（INNER JOIN 特性）

---

## 核心 SQL 结构

### 教材筛选 SQL（使用 JOIN）

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
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?
```

### 筛选条件映射规则

| 前端参数 | 数据库字段 | 表 |
|---------|-----------|-----|
| `subject` | `c.subject` | `textbook_catalog` |
| `grade` | `c.grade` | `textbook_catalog` |
| `volume` | `c.volume` | `textbook_catalog` |
| `textbook_version` | `c.textbook_version` | `textbook_catalog` |

---

## 行为约束

### ✅ 已实现

1. **只要前端传了任何教材筛选参数**：
   - 未绑定 catalog 的资源 **必须被排除**
   - 返回 0 条是合法结果，不是错误

2. **不允许做任何兜底**：
   - ❌ catalog 查不到 → 用 resource（已禁止）
   - ❌ catalog 查不到 → 用 auto_meta_result（已禁止）

3. **SQL 中不再出现**：
   - ❌ `resource.grade`
   - ❌ `resource.subject`
   - ❌ `resource.textbook`
   - ✅ 只使用 `c.subject`, `c.grade`, `c.volume`, `c.textbook_version`

---

## 接口影响范围

### 已修改的接口

- ✅ `GET /api/resources` - 资源列表（支持教材筛选）
- ✅ `GET /api/admin/resources` - 管理员资源列表（支持教材筛选）

### 筛选参数

当传递以下任一参数时，将使用 catalog JOIN：
- `subject` - 学科
- `grade` - 年级
- `volume` - 册别
- `textbook_version` - 教材版本

---

## curl 示例

### 示例 1: 按学科和年级筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=数学&grade=2" \
  -H "Content-Type: application/json"
```

**SQL 执行**:
```sql
SELECT DISTINCT r.*
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE 
  r.status = "approved"
  AND r.file_format NOT IN ("视频", "VIDEO")
  AND r.category NOT IN ("视频")
  AND c.subject = "数学"
  AND c.grade = "2"
ORDER BY r.created_at DESC
LIMIT 30 OFFSET 0
```

### 示例 2: 完整教材筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=语文&grade=1&volume=下册&textbook_version=人教版" \
  -H "Content-Type: application/json"
```

**SQL 执行**:
```sql
SELECT DISTINCT r.*
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE 
  r.status = "approved"
  AND r.file_format NOT IN ("视频", "VIDEO")
  AND r.category NOT IN ("视频")
  AND c.subject = "语文"
  AND c.grade = "1"
  AND c.volume = "下册"
  AND c.textbook_version = "人教版"
ORDER BY r.created_at DESC
LIMIT 30 OFFSET 0
```

### 示例 3: 无教材筛选参数（普通查询）

```bash
curl -X GET "http://localhost:3333/api/resources?keyword=函数" \
  -H "Content-Type: application/json"
```

**SQL 执行**:
```sql
SELECT r.*
FROM resource
WHERE 
  r.status = "approved"
  AND r.file_format NOT IN ("视频", "VIDEO")
  AND r.category NOT IN ("视频")
  AND (r.title LIKE "%函数%" OR r.description LIKE "%函数%")
ORDER BY r.created_at DESC
LIMIT 30 OFFSET 0
```

**注意**: 无教材筛选参数时，不使用 JOIN，所有资源（包括未绑定 catalog 的）都可能被返回。

---

## 完成标准验证

### ✅ 已满足

1. **用 catalog 筛选，结果稳定、可复现**
   - ✅ 筛选条件基于 `textbook_catalog` 表
   - ✅ 使用参数化查询，防止 SQL 注入

2. **catalog 已绑定资源全部可查**
   - ✅ 使用 INNER JOIN，已绑定 catalog 的资源可以正常查询

3. **未绑定 catalog 的资源在筛选时完全不可见**
   - ✅ INNER JOIN 特性：未绑定 catalog 的资源自动被排除

4. **SQL 中不再出现 resource.grade / resource.subject**
   - ✅ 教材筛选条件全部基于 `c.subject`, `c.grade`, `c.volume`, `c.textbook_version`

5. **为后续教材目录页提供稳定数据基础**
   - ✅ 统一的 JOIN 结构，便于扩展教材目录页功能

---

## 关键代码片段

### filter 中间件（检测教材筛选参数）

```typescript
// 教材筛选：只基于 catalog（教材目录），禁止使用 resource 原始字段
const hasCatalogFilter = !!(subject || grade || volume || textbook_version || textbook);

if (hasCatalogFilter) {
  // 标记需要 JOIN catalog 表
  request.filter = {
    name: 'catalogFilter',
    sql: sql, // 基础条件（status, category, keyword 等）
    params: params,
    catalogFilters: {
      subject: subject as string | undefined,
      grade: grade as string | undefined,
      volume: volume as string | undefined,
      textbook_version: (textbook_version || textbook) as string | undefined,
    },
  };
}
```

### service 层（构建 JOIN SQL）

```typescript
if (useCatalogJoin) {
  // 构建 catalog 筛选条件
  if (catalogFilters.subject) {
    catalogConditions.push('c.subject = ?');
    catalogParams.push(catalogFilters.subject);
  }
  // ... 其他条件

  statement = `
    SELECT DISTINCT r.*
    FROM resource r
    INNER JOIN resource_textbook_map m ON m.resource_id = r.id
    INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;
}
```

---

## 禁止事项（已遵守）

- ✅ 不新增功能
- ✅ 不改前端
- ✅ 不引入 auto_meta_result 参与筛选
- ✅ 不做"临时兼容方案"

---

## 总结

**核心改动**：将教材筛选 SQL 定死在 catalog 上，使用统一的 JOIN 结构，确保：
- 筛选条件只来自 `textbook_catalog` 表
- 未绑定 catalog 的资源在筛选时完全不可见
- 为后续教材目录页提供稳定数据基础

**修改文件**：
1. `src/resource/resource.middleware.ts` - 检测教材筛选参数
2. `src/resource/resource.service.ts` - 构建 JOIN SQL

**核心 SQL**：使用 `INNER JOIN` 结构，基于 `textbook_catalog` 表筛选

