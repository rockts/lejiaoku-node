# Catalog 统计系统规范

## 📋 概述

本文档定义了乐教库项目中「Catalog 驱动的资源统计 & 可视化数据源」的硬约束和系统级规范，为运营和后续推荐做准备。

**核心原则**：
- **统计必须以 catalog + unit 为维度**
- **禁止"按学科/年级字符串统计"**
- **Catalog 统计 ≠ 搜索**
- **Catalog 统计是"系统真实内容密度"的唯一来源**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. 统计必须以 catalog + unit 为维度

**规则**：
- 所有资源统计必须基于 `textbook_catalog` 表
- 统计维度：`catalog_id` + `unit`
- 禁止基于 `resource.subject` / `resource.grade` 等原始字段统计

**原因**：
- `textbook_catalog` 是标准化的教材目录结构
- `resource.subject` / `resource.grade` 可能存在格式不一致（如"二年级" vs "2"）
- 只有基于 `catalog` 的统计才能反映"系统真实内容密度"

**代码位置**：
- `src/textbook/catalog-statistics.service.ts` - `getCatalogStatistics()`, `getCatalogUnitStatistics()`

---

### 2. 禁止"按学科/年级字符串统计"

**规则**：
- ❌ 禁止使用 `SELECT COUNT(*) FROM resource WHERE subject = '数学'` 这样的统计
- ❌ 禁止使用 `resource.grade`, `resource.subject` 等原始字段进行聚合统计
- ✅ 必须通过 `resource_textbook_map` 关联到 `textbook_catalog` 进行统计

**原因**：
- 原始字段格式不统一，统计结果不可靠
- 只有通过 `catalog` 关联的统计才能保证数据一致性

**示例（错误）**：
```sql
-- ❌ 错误：直接统计 resource.subject
SELECT subject, COUNT(*) as count
FROM resource
WHERE status = 'approved'
GROUP BY subject
```

**示例（正确）**：
```sql
-- ✅ 正确：通过 catalog 统计
SELECT c.subject, COUNT(DISTINCT r.id) as count
FROM textbook_catalog c
INNER JOIN resource_textbook_map m ON m.textbook_catalog_id = c.id
INNER JOIN resource r ON r.id = m.resource_id
WHERE r.status = 'approved'
GROUP BY c.subject
```

---

### 3. Catalog 统计 ≠ 搜索

**规则**：
- Catalog 统计是**只读聚合查询**，不影响现有搜索/筛选逻辑
- 统计接口与搜索接口完全独立
- 统计结果用于运营分析和可视化，不参与资源筛选

**区别**：
- **搜索**：用户输入条件，返回资源列表
- **统计**：系统聚合数据，返回统计信息

**代码位置**：
- `src/textbook/catalog-statistics.service.ts` - 独立的统计服务
- `src/textbook/catalog-statistics.controller.ts` - 独立的统计控制器

---

### 4. Catalog 统计是"系统真实内容密度"的唯一来源

**规则**：
- 只有通过 `catalog` 关联的统计才能反映"系统真实内容密度"
- 统计结果用于：
  - 运营分析（哪些教材内容最丰富）
  - 可视化展示（内容分布图表）
  - 后续推荐（基于内容密度推荐）

**统计字段**：
- `resource_total` - 该 catalog 下资源总数
- `unit_total` - 该 catalog 下 unit 数（distinct resource.unit）
- `resource_pending_unit` - 已绑定 catalog 但 unit = NULL 的资源数
- `last_resource_created_at` - 最后资源创建时间

---

## 📊 API 接口规范

### 1. 获取所有 catalog 的统计信息

**接口**：`GET /api/admin/catalogs/statistics`

**权限**：仅 admin

**返回结构**：
```json
{
  "success": true,
  "data": [
    {
      "catalog_id": 1,
      "subject": "数学",
      "grade": "2",
      "volume": "上册",
      "textbook_version": "人教版",
      "education_level": "elementary",
      "resource_total": 15,
      "unit_total": 5,
      "resource_pending_unit": 2,
      "last_resource_created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 10,
  "message": "成功获取 10 个 catalog 的统计信息"
}
```

**核心 SQL**：
```sql
SELECT 
  c.id as catalog_id,
  c.subject,
  c.grade,
  c.volume,
  c.textbook_version,
  c.education_level,
  COUNT(DISTINCT r.id) as resource_total,
  COUNT(DISTINCT r.unit) as unit_total,
  COUNT(DISTINCT CASE WHEN r.unit IS NULL OR r.unit = '' THEN r.id END) as resource_pending_unit,
  MAX(r.created_at) as last_resource_created_at
FROM textbook_catalog c
INNER JOIN resource_textbook_map m ON m.textbook_catalog_id = c.id
INNER JOIN resource r ON r.id = m.resource_id
WHERE r.status = 'approved'
GROUP BY c.id, c.subject, c.grade, c.volume, c.textbook_version, c.education_level
ORDER BY c.education_level, c.grade, c.subject, c.textbook_version, c.volume
```

**约束**：
- 只统计已审核（approved）资源
- 只统计已绑定 catalog 的资源
- SQL 必须基于：`resource`, `resource_textbook_map`, `textbook_catalog`
- 严禁任何 `auto_meta_result` / `chapter_info` 参与

---

### 2. 获取指定 catalog 下所有 unit 的统计信息

**接口**：`GET /api/admin/catalogs/:id/units/statistics`

**权限**：仅 admin

**返回结构**：
```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 5,
      "last_resource_created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 3,
      "last_resource_created_at": "2024-01-14T09:20:00.000Z"
    }
  ],
  "catalog_id": 1,
  "count": 2,
  "message": "成功获取 catalog 1 下 2 个 unit 的统计信息"
}
```

**核心 SQL**：
```sql
SELECT 
  r.unit,
  r.unit_index,
  COUNT(r.id) as resource_count,
  MAX(r.created_at) as last_resource_created_at
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
WHERE m.textbook_catalog_id = ?
  AND r.status = 'approved'
GROUP BY r.unit, r.unit_index
ORDER BY 
  CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
  r.unit_index ASC,
  r.unit ASC
```

**排序规则**：
- `unit_index ASC`（unit_index 为空的放最后，NULLS LAST）

**约束**：
- 只统计已审核（approved）资源
- 只统计已绑定 catalog 的资源
- SQL 必须基于：`resource`, `resource_textbook_map`, `textbook_catalog`
- 严禁任何 `auto_meta_result` / `chapter_info` 参与

---

## 🔍 统计字段说明

### Catalog 统计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `catalog_id` | number | 教材目录 ID |
| `subject` | string | 学科 |
| `grade` | string | 年级 |
| `volume` | string | 册别（上册/下册） |
| `textbook_version` | string | 教材版本 |
| `education_level` | string | 学段（elementary/middle） |
| `resource_total` | number | 该 catalog 下资源总数 |
| `unit_total` | number | 该 catalog 下 unit 数（distinct resource.unit） |
| `resource_pending_unit` | number | 已绑定 catalog 但 unit = NULL 的资源数 |
| `last_resource_created_at` | string | 最后资源创建时间 |

### Unit 统计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `unit` | string | 单元名称（如：第一单元） |
| `unit_index` | number | 单元序号（如：1） |
| `resource_count` | number | 该 unit 下资源数量 |
| `last_resource_created_at` | string | 最后资源创建时间 |

---

## ✅ 完成标准验证

### 必须全部满足

1. **统计必须以 catalog + unit 为维度** ✅
   - ✅ 已实现：所有统计基于 `textbook_catalog` 表
   - ✅ 已禁止：基于 `resource.subject` / `resource.grade` 的统计

2. **禁止"按学科/年级字符串统计"** ✅
   - ✅ 已实现：所有统计通过 `resource_textbook_map` 关联到 `textbook_catalog`
   - ✅ 已禁止：直接使用 `resource.subject` / `resource.grade` 进行聚合

3. **Catalog 统计 ≠ 搜索** ✅
   - ✅ 已实现：统计接口与搜索接口完全独立
   - ✅ 已实现：统计是只读聚合查询，不影响现有搜索/筛选逻辑

4. **Catalog 统计是"系统真实内容密度"的唯一来源** ✅
   - ✅ 已实现：统计结果包含 `resource_total`, `unit_total`, `resource_pending_unit`
   - ✅ 已实现：统计结果可用于运营分析和可视化

---

## 📝 修改文件清单

1. **新增文件**：
   - `src/textbook/catalog-statistics.service.ts` - Catalog 统计服务
   - `src/textbook/catalog-statistics.controller.ts` - Catalog 统计控制器
   - `docs/catalog-statistics-spec.md` - Catalog 统计系统规范文档（本文档）

2. **修改文件**：
   - `src/textbook/textbook.router.ts` - 添加统计接口路由

---

## 🎯 总结

**核心成果**：
1. ✅ 建立了 Catalog 驱动的资源统计系统
2. ✅ 实现了 catalog 维度统计接口
3. ✅ 实现了 unit 维度统计接口（Catalog 子视图）
4. ✅ 创建了系统级说明文档

**核心原则**：
- **统计必须以 catalog + unit 为维度**
- **禁止"按学科/年级字符串统计"**
- **Catalog 统计 ≠ 搜索**
- **Catalog 统计是"系统真实内容密度"的唯一来源**

**系统状态**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 所有规则已写入代码注释和文档

---

## 📚 相关文档

- [搜索系统规范](./search-system-spec.md) - 搜索系统规范
- [资源单元体系系统级不变量](./resource-unit-system-invariants.md) - 教材单元体系规则

