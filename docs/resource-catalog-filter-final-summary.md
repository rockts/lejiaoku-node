# 资源搜索/筛选改为基于 catalog 最终总结

## ✅ 确认完成

### 修改的文件列表

1. **`src/resource/resource.middleware.ts`**
   - ✅ 修改 `filter()` 函数：检测教材筛选参数，标记为 `catalogFilter`
   - ✅ 修改 `adminFilter()` 函数：同样支持 catalog 筛选
   - ✅ **已移除**所有基于 `resource.subject`, `resource.grade`, `resource.textbook` 的筛选逻辑

2. **`src/resource/resource.service.ts`**
   - ✅ 修改 `getResourceList()` 函数：支持 catalog JOIN 查询
   - ✅ 修改 `getResourceTotalCount()` 函数：支持 catalog JOIN 计数

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
  AND c.subject = ?
  AND c.grade = ?
  AND c.volume = ?
  AND c.textbook_version = ?
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?
```

### 筛选条件映射

| 前端参数 | 数据库字段 | 表 | 说明 |
|---------|-----------|-----|------|
| `subject` | `c.subject` | `textbook_catalog` | 学科 |
| `grade` | `c.grade` | `textbook_catalog` | 年级（数字格式：1-9） |
| `volume` | `c.volume` | `textbook_catalog` | 册别（上册/下册） |
| `textbook_version` | `c.textbook_version` | `textbook_catalog` | 教材版本 |

---

## curl 示例（教材筛选）

### 示例 1: 按学科筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=数学" \
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
ORDER BY r.created_at DESC
LIMIT 30 OFFSET 0
```

**结果**: 只返回已绑定 catalog 且 `catalog.subject = "数学"` 的资源，未绑定 catalog 的资源被排除

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

**结果**: 只返回完全匹配所有筛选条件的已绑定 catalog 的资源

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

**结果**: 不使用 JOIN，所有资源（包括未绑定 catalog 的）都可能被返回

---

## 完成标准验证

### ✅ 已满足

1. **用 catalog 筛选，结果稳定、可复现**
   - ✅ 筛选条件全部基于 `textbook_catalog` 表
   - ✅ 使用参数化查询，防止 SQL 注入

2. **catalog 已绑定资源全部可查**
   - ✅ 使用 `INNER JOIN`，已绑定 catalog 的资源可以正常查询

3. **未绑定 catalog 的资源在筛选时完全不可见**
   - ✅ `INNER JOIN` 特性：未绑定 catalog 的资源自动被排除
   - ✅ 返回 0 条是合法结果，不是错误

4. **SQL 中不再出现 resource.grade / resource.subject（作为筛选条件）**
   - ✅ 教材筛选条件全部基于 `c.subject`, `c.grade`, `c.volume`, `c.textbook_version`
   - ✅ 注意：`resource.subject`, `resource.grade`, `resource.textbook` 仍在 SELECT 中返回（用于显示），但不作为筛选条件

5. **为后续教材目录页提供稳定数据基础**
   - ✅ 统一的 JOIN 结构
   - ✅ 稳定的筛选结果

---

## 关键实现细节

### 1. 筛选参数检测

```typescript
// 检测是否有教材筛选参数
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

### 2. JOIN SQL 构建

```typescript
if (useCatalogJoin) {
  // 构建 catalog 筛选条件
  const catalogConditions: string[] = [];
  const catalogParams: Array<any> = [];

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

**核心改动**：将教材筛选 SQL 定死在 catalog 上，使用统一的 JOIN 结构。

**修改文件**：
1. `src/resource/resource.middleware.ts` - 检测教材筛选参数
2. `src/resource/resource.service.ts` - 构建 JOIN SQL

**核心 SQL**：使用 `INNER JOIN` 结构，基于 `textbook_catalog` 表筛选

**验证结果**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 筛选条件全部基于 catalog 表
- ✅ 未绑定 catalog 的资源在筛选时被排除

