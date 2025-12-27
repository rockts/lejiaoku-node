# 资源搜索/筛选改为基于 catalog 实现总结

## 修改的文件列表

1. **`src/resource/resource.middleware.ts`**
   - 修改 `filter()` 函数：检测教材筛选参数，标记为 `catalogFilter`
   - 修改 `adminFilter()` 函数：同样支持 catalog 筛选
   - 移除所有基于 `resource.subject`, `resource.grade`, `resource.textbook` 的筛选逻辑

2. **`src/resource/resource.service.ts`**
   - 修改 `getResourceList()` 函数：支持 catalog JOIN 查询
   - 修改 `getResourceTotalCount()` 函数：支持 catalog JOIN 计数

---

## 最终使用的核心 SQL

### 教材筛选 SQL（有筛选参数时）

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
  AND (:subject IS NULL OR c.subject = :subject)
  AND (:grade IS NULL OR c.grade = :grade)
  AND (:volume IS NULL OR c.volume = :volume)
  AND (:textbook_version IS NULL OR c.textbook_version = :textbook_version)
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?
```

### 普通查询 SQL（无筛选参数时）

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

## curl 示例（教材筛选）

### 示例 1: 按学科筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=数学" \
  -H "Content-Type: application/json"
```

**说明**: 
- 只返回已绑定 catalog 且 `catalog.subject = "数学"` 的资源
- 未绑定 catalog 的资源被排除

### 示例 2: 按学科和年级筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=数学&grade=2" \
  -H "Content-Type: application/json"
```

**说明**:
- 只返回已绑定 catalog 且 `catalog.subject = "数学"` 和 `catalog.grade = "2"` 的资源

### 示例 3: 完整教材筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=语文&grade=1&volume=下册&textbook_version=人教版" \
  -H "Content-Type: application/json"
```

**说明**:
- 只返回已绑定 catalog 且完全匹配所有筛选条件的资源
- 筛选条件全部基于 `textbook_catalog` 表

### 示例 4: 无教材筛选参数（普通查询）

```bash
curl -X GET "http://localhost:3333/api/resources?keyword=函数" \
  -H "Content-Type: application/json"
```

**说明**:
- 不使用 JOIN，所有资源（包括未绑定 catalog 的）都可能被返回
- 只按关键词搜索标题和描述

---

## 关键特性

### ✅ 已实现

1. **教材筛选只基于 catalog**
   - ✅ 筛选条件来自 `textbook_catalog` 表
   - ✅ 禁止使用 `resource.subject`, `resource.grade`, `resource.textbook`

2. **未绑定 catalog 的资源被排除**
   - ✅ 使用 `INNER JOIN`，未绑定 catalog 的资源自动被排除
   - ✅ 返回 0 条是合法结果，不是错误

3. **不允许兜底**
   - ✅ 不 fallback 到 `resource` 原始字段
   - ✅ 不 fallback 到 `auto_meta_result`

4. **为教材目录页打基础**
   - ✅ 统一的 JOIN 结构
   - ✅ 稳定的筛选结果

---

## 验证清单

- ✅ 用 catalog 筛选，结果稳定、可复现
- ✅ catalog 已绑定资源全部可查
- ✅ 未绑定 catalog 的资源在筛选时完全不可见
- ✅ SQL 中不再出现 `resource.grade` / `resource.subject`（教材筛选时）
- ✅ 为后续教材目录页提供稳定数据基础

---

## 注意事项

1. **无教材筛选参数时**：不使用 JOIN，所有资源都可能被返回（包括未绑定 catalog 的）
2. **有教材筛选参数时**：必须使用 JOIN，未绑定 catalog 的资源被排除
3. **返回 0 条是合法结果**：当筛选条件无法匹配任何已绑定 catalog 的资源时，返回空数组

