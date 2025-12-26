# Catalog Info 和第一条教材搜索 SQL 规范

## 📋 概述

本文档定义了乐教库项目中「catalog_info」的最小可用语义和第一条被"定死"的教材搜索 SQL。

**核心原则**：
- **catalog_info 不允许存表，只允许由查询 + 统计派生**
- **catalog_info = 用于前端"教材目录页"的只读信息**
- **所有字段必须能用现有数据直接查出**
- **不引入"未来扩展字段"**
- **不做搜索 DSL，不做通用搜索**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. catalog_info 不允许存表

**规则**：
- catalog_info 必须由查询 + 统计派生
- 不允许在数据库中存储 catalog_info
- 所有字段必须能用现有数据直接查出

**原因**：
- catalog_info 是动态的，随着资源增加而变化
- 存表会导致 catalog_info 与实际数据不一致
- 派生计算保证 catalog_info 始终反映真实情况

**实现**：
- catalog_info 在每次请求时实时计算
- 不新增数据库表存储 catalog_info
- catalog_info 计算函数：`getCatalogInfo()`

**代码位置**：
- `src/textbook/catalog-info.service.ts` - `getCatalogInfo()`

---

### 2. catalog_info = 用于前端"教材目录页"的只读信息

**规则**：
- catalog_info 是只读的，不允许修改
- catalog_info 专门用于前端"教材目录页"渲染
- 不返回 resource 明细

**内容至少包含**：
- `catalog_id` - Catalog ID
- `subject` - 学科
- `grade` - 年级
- `volume` - 册别
- `textbook_version` - 教材版本
- `education_level` - 教育阶段
- `unit_total` - 单元总数
- `resource_total` - 资源总数
- `quality_state` - 质量状态
- `action_type` - 行动类型

---

### 3. 第一条被"定死"的教材搜索 SQL

**规则**：
- 场景：用户在"教材目录页"点击某个 unit
- 搜索条件固定为：
  - `subject`
  - `grade`
  - `textbook_version`
  - `unit`
  - `status = approved`
- 不做搜索 DSL，不做通用搜索
- SQL 必须基于：`resource`, `resource_textbook_map`, `textbook_catalog`

**实现**：
- 搜索函数：`searchResourcesByCatalogUnit()`
- 统计函数：`countResourcesByCatalogUnit()`

**代码位置**：
- `src/textbook/catalog-unit-search.service.ts` - `searchResourcesByCatalogUnit()`

---

## 📊 API 接口规范

### 1. 获取 Catalog 基本信息（用于教材目录页）

**接口**：`GET /api/catalogs/:catalogId/info`

**权限**：公开（无需登录）

**返回结构**：
```json
{
  "success": true,
  "data": {
    "catalog_id": 1,
    "subject": "数学",
    "grade": "2",
    "volume": "上册",
    "textbook_version": "人教版",
    "education_level": "elementary",
    "unit_total": 5,
    "resource_total": 15,
    "quality_state": "healthy",
    "action_type": "no_action"
  },
  "message": "成功获取 catalog 1 的信息"
}
```

**字段说明**：
- `catalog_id` - Catalog ID（必须）
- `subject` - 学科（必须）
- `grade` - 年级（必须）
- `volume` - 册别（必须）
- `textbook_version` - 教材版本（必须）
- `education_level` - 教育阶段（必须）
- `unit_total` - 单元总数（必须，只统计已审核资源）
- `resource_total` - 资源总数（必须，只统计已审核资源）
- `quality_state` - 质量状态（必须）：`healthy` | `needs_content` | `needs_organization` | `empty`
- `action_type` - 行动类型（必须）：`organize_units` | `add_resources` | `prioritize_upload` | `no_action`

---

### 2. 获取 Catalog 下的 Unit 列表（用于教材目录页）

**接口**：`GET /api/catalogs/:catalogId/units`

**权限**：公开（无需登录）

**返回结构**：
```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 3
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 2
    },
    {
      "unit": "第三单元",
      "unit_index": 3,
      "resource_count": 4
    }
  ],
  "catalog_id": 1,
  "count": 3,
  "message": "成功获取 catalog 1 下 3 个 unit"
}
```

**字段说明**：
- `unit` - Unit 名称（必须）
- `unit_index` - Unit 序号（可选，用于排序）
- `resource_count` - 该 unit 下的资源数量（必须，只统计已审核资源）

**排序规则**：
- 优先按 `unit_index` 升序排序
- `unit_index` 为 NULL 的排在最后
- 相同 `unit_index` 的按 `unit` 名称排序

---

### 3. 搜索指定 catalog + unit 的资源（第一条被"定死"的教材搜索 SQL）

**接口**：`GET /api/catalogs/:catalogId/units/:unit/resources`

**权限**：公开（无需登录）

**查询参数**：
- `page` - 页码（可选，默认 1）
- `limit` - 每页数量（可选，默认 30）

**返回结构**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "第一单元课件",
      "description": "第一单元的教学课件",
      "category": "课件",
      "subject": "数学",
      "grade": "2",
      "textbook": "人教版",
      "chapter_info": null,
      "unit": "第一单元",
      "unit_index": 1,
      "file_format": "PPT",
      "file_url": "http://localhost:3333/api/files/xxx",
      "cover_url": "http://localhost:3333/api/covers/xxx",
      "download_count": 10,
      "status": "approved",
      "user_id": 1,
      "auto_meta_status": "done",
      "auto_meta_result": {...},
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "catalog_id": 1,
  "unit": "第一单元",
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 3,
    "total_pages": 1
  },
  "message": "成功获取 catalog 1 的 unit \"第一单元\" 下 3 条资源"
}
```

**响应头**：
- `X-Total-Count` - 资源总数（用于分页）

---

## 💻 第一条被"定死"的教材搜索 SQL

### 完整 SQL（可直接复制执行）

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
  c.id = ?                    -- catalog_id
  AND r.unit = ?              -- unit
  AND r.status = 'approved'   -- 只返回已审核资源
  AND r.file_format NOT IN ('视频', 'VIDEO')
  AND r.category NOT IN ('视频')
ORDER BY 
  CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
  r.unit_index ASC,
  r.created_at DESC
LIMIT ? OFFSET ?
```

### SQL 说明

**表结构**：
- `resource` - 资源表
- `resource_textbook_map` - 资源与教材目录的关联表
- `textbook_catalog` - 教材目录表

**JOIN 结构**：
- `resource` ← `resource_textbook_map` ← `textbook_catalog`

**WHERE 条件**：
- `c.id = ?` - Catalog ID（必须）
- `r.unit = ?` - Unit 名称（必须）
- `r.status = 'approved'` - 只返回已审核资源（固定）
- `r.file_format NOT IN ('视频', 'VIDEO')` - 排除视频资源（固定）
- `r.category NOT IN ('视频')` - 排除视频分类（固定）

**排序规则**：
- 优先按 `unit_index` 升序排序
- `unit_index` 为 NULL 的排在最后
- 相同 `unit_index` 的按 `created_at` 降序排序

**分页**：
- `LIMIT ?` - 每页数量
- `OFFSET ?` - 偏移量

---

## 📊 示例 JSON

### 1. catalog_info 示例 JSON

```json
{
  "success": true,
  "data": {
    "catalog_id": 1,
    "subject": "数学",
    "grade": "2",
    "volume": "上册",
    "textbook_version": "人教版",
    "education_level": "elementary",
    "unit_total": 5,
    "resource_total": 15,
    "quality_state": "healthy",
    "action_type": "no_action"
  },
  "message": "成功获取 catalog 1 的信息"
}
```

---

### 2. units 列表示例 JSON

```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 3
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 2
    },
    {
      "unit": "第三单元",
      "unit_index": 3,
      "resource_count": 4
    },
    {
      "unit": "第四单元",
      "unit_index": 4,
      "resource_count": 3
    },
    {
      "unit": "第五单元",
      "unit_index": 5,
      "resource_count": 3
    }
  ],
  "catalog_id": 1,
  "count": 5,
  "message": "成功获取 catalog 1 下 5 个 unit"
}
```

---

### 3. unit 搜索结果示例 JSON

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "第一单元课件",
      "description": "第一单元的教学课件",
      "category": "课件",
      "subject": "数学",
      "grade": "2",
      "textbook": "人教版",
      "chapter_info": null,
      "unit": "第一单元",
      "unit_index": 1,
      "file_format": "PPT",
      "file_url": "http://localhost:3333/api/files/xxx",
      "cover_url": "http://localhost:3333/api/covers/xxx",
      "download_count": 10,
      "status": "approved",
      "user_id": 1,
      "auto_meta_status": "done",
      "auto_meta_result": {
        "education_level": "elementary",
        "subject": "数学",
        "grade": "二年级",
        "grade_number": 2,
        "volume": "上册",
        "textbook_version": "人教版",
        "structure": [
          {
            "unit": "第一单元",
            "title": "认识数字"
          }
        ]
      },
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "title": "第一单元练习题",
      "description": "第一单元的练习题",
      "category": "练习",
      "subject": "数学",
      "grade": "2",
      "textbook": "人教版",
      "chapter_info": null,
      "unit": "第一单元",
      "unit_index": 1,
      "file_format": "PDF",
      "file_url": "http://localhost:3333/api/files/yyy",
      "cover_url": null,
      "download_count": 5,
      "status": "approved",
      "user_id": 2,
      "auto_meta_status": "done",
      "auto_meta_result": {
        "education_level": "elementary",
        "subject": "数学",
        "grade": "二年级",
        "grade_number": 2,
        "volume": "上册",
        "textbook_version": "人教版",
        "structure": [
          {
            "unit": "第一单元",
            "title": "认识数字"
          }
        ]
      },
      "created_at": "2024-01-14T09:20:00.000Z",
      "updated_at": "2024-01-14T09:20:00.000Z"
    }
  ],
  "catalog_id": 1,
  "unit": "第一单元",
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 2,
    "total_pages": 1
  },
  "message": "成功获取 catalog 1 的 unit \"第一单元\" 下 2 条资源"
}
```

---

## 🔍 curl 示例

### 1. 获取 Catalog 基本信息

```bash
curl -X GET "http://localhost:3333/api/catalogs/1/info" \
  -H "Content-Type: application/json"
```

**预期返回**：
- HTTP 200 OK
- JSON 格式，包含 catalog 基本信息、统计信息、质量状态和行动类型

---

### 2. 获取 Catalog 下的 Unit 列表

```bash
curl -X GET "http://localhost:3333/api/catalogs/1/units" \
  -H "Content-Type: application/json"
```

**预期返回**：
- HTTP 200 OK
- JSON 格式，包含该 catalog 下所有 unit 的列表

---

### 3. 搜索指定 catalog + unit 的资源

```bash
curl -X GET "http://localhost:3333/api/catalogs/1/units/第一单元/resources?page=1&limit=30" \
  -H "Content-Type: application/json"
```

**预期返回**：
- HTTP 200 OK
- JSON 格式，包含该 catalog + unit 下的所有资源
- 响应头包含 `X-Total-Count`（资源总数）

---

## ✅ 完成标准验证

### 必须全部满足

1. **catalog_info 不允许存表** ✅
   - ✅ 已实现：catalog_info 在每次请求时实时计算
   - ✅ 已禁止：不新增数据库表存储 catalog_info

2. **catalog_info = 用于前端"教材目录页"的只读信息** ✅
   - ✅ 已实现：catalog_info 是只读的，专门用于前端渲染
   - ✅ 已实现：不返回 resource 明细

3. **所有字段必须能用现有数据直接查出** ✅
   - ✅ 已实现：所有字段都基于现有表（textbook_catalog, resource, resource_textbook_map）
   - ✅ 已实现：所有字段都是实时计算的

4. **第一条被"定死"的教材搜索 SQL** ✅
   - ✅ 已实现：搜索条件固定为 subject, grade, textbook_version, unit, status = approved
   - ✅ 已实现：不做搜索 DSL，不做通用搜索
   - ✅ 已实现：SQL 基于 resource, resource_textbook_map, textbook_catalog

---

## 📝 修改文件清单

### 新增文件

1. **`src/textbook/catalog-info.service.ts`**
   - `getCatalogInfo()` - 获取 Catalog 基本信息
   - `getCatalogUnits()` - 获取 Catalog 下的 Unit 列表

2. **`src/textbook/catalog-info.controller.ts`**
   - `getCatalogInfo()` - 获取 Catalog 基本信息控制器
   - `getCatalogUnits()` - 获取 Catalog 下的 Unit 列表控制器

3. **`src/textbook/catalog-unit-search.service.ts`**
   - `searchResourcesByCatalogUnit()` - 第一条被"定死"的教材搜索 SQL
   - `countResourcesByCatalogUnit()` - 统计指定 catalog + unit 的资源总数

4. **`src/textbook/catalog-unit-search.controller.ts`**
   - `searchResourcesByCatalogUnit()` - 搜索指定 catalog + unit 的资源控制器

5. **`docs/catalog-info-and-first-search.md`**
   - Catalog Info 和第一条教材搜索 SQL 规范文档（本文档）

### 修改文件

1. **`src/textbook/textbook.router.ts`**
   - 新增 `GET /api/catalogs/:catalogId/info` 路由
   - 新增 `GET /api/catalogs/:catalogId/units` 路由
   - 新增 `GET /api/catalogs/:catalogId/units/:unit/resources` 路由

---

## 🎯 总结

**核心成果**：
1. ✅ 定义了 catalog_info 的最小可用语义
2. ✅ 实现了教材目录页专用接口 `GET /api/catalogs/:catalogId/info`
3. ✅ 实现了 Catalog 下的 Unit 列表接口 `GET /api/catalogs/:catalogId/units`
4. ✅ 定义了第一条被"定死"的教材搜索 SQL
5. ✅ 创建了系统级说明文档

**核心原则**：
- **catalog_info 不允许存表，只允许由查询 + 统计派生**
- **catalog_info = 用于前端"教材目录页"的只读信息**
- **所有字段必须能用现有数据直接查出**
- **不做搜索 DSL，不做通用搜索**

**系统状态**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 所有规则已写入代码注释和文档
- ✅ catalog_info 可重复计算，不依赖数据库存储

---

## 📚 相关文档

- [Catalog 行动系统规范](./catalog-action-system.md) - Catalog 行动系统规范
- [Catalog 质量系统规范](./catalog-quality-system.md) - Catalog 质量系统规范
- [Catalog 统计系统规范](./catalog-statistics-spec.md) - Catalog 统计系统规范
- [搜索系统规范](./search-system-spec.md) - 搜索系统规范

