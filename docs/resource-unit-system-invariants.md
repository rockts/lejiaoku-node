# 教材单元体系系统级不变量

## 📋 概述

本文档定义了乐教库项目中「教材单元」体系的硬约束和系统级不变量，确保系统的稳定性和可维护性。

---

## 🔒 系统级不变量（必须严格遵守）

### 1. 「教材单元」唯一合法来源：`resource.unit`

**规则**：
- `resource.unit` 是单元信息的**唯一合法来源**
- Unit 不是 Tag，不是文本推断结果
- 禁止任何基于 `chapter_info` / `auto_meta_result.structure` 的推断
- 禁止任何 LIKE / JSON 搜索推断单元

**代码位置**：
- `src/resource/resource.service.ts` - 筛选逻辑
- `src/resource/resource.middleware.ts` - 筛选中间件

**违反后果**：
- 筛选结果不稳定
- 数据不一致
- 系统维护困难

---

### 2. Catalog + Unit 是资源筛选的**最小稳定组合**

**规则**：
- 筛选时：Catalog → Unit → Resource 路径不依赖任何历史字段
- 如果同时传了 `catalog_id`（通过 subject/grade/volume）和 `unit`，必须同时满足
- 任一缺失 → 不返回数据（返回 0 条是合法结果）

**SQL 结构**：
```sql
SELECT DISTINCT r.*
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE 
  r.status = "approved"
  AND c.subject = ?
  AND c.grade = ?
  AND c.volume = ?
  AND r.unit = ?  -- 必须同时满足
```

**代码位置**：
- `src/resource/resource.service.ts` - `getResourceList()`, `getResourceTotalCount()`
- `src/resource/resource.middleware.ts` - `filter()`, `adminFilter()`

---

### 3. 教材单元完整性硬约束

**规则**：
- **凡是已绑定 catalog 的资源，`resource.unit` 必须非空**
- 在资源创建、编辑、绑定 catalog 时强制校验

**校验触发点**：

1. **资源创建** (`POST /api/resources`)
   - 如果创建时传了 `catalog_id`，则 `unit` 必须提供
   - 错误信息：`该资源已绑定教材，必须选择所属单元`

2. **资源编辑** (`PUT /api/resources/:id`)
   - 如果资源已绑定 catalog，且更新后 `unit` 为空，则拒绝
   - 错误信息：`该资源已绑定教材，必须选择所属单元`

3. **绑定 catalog** (`POST /api/admin/resources/:id/bind-catalog`)
   - 在绑定 catalog 前，检查资源是否有 `unit`
   - 如果 `unit` 为空，拒绝绑定
   - 错误信息：`该资源未设置所属单元，无法绑定教材。请先设置 unit 字段`

**代码位置**：
- `src/resource/resource.controller.ts` - `store()`
- `src/resource/resource.controller.update.ts` - `update()`
- `src/resource/resource-catalog-bind.controller.ts` - `bindCatalog()`

---

### 4. Catalog → Unit 结构稳定性保证

**规则**：
- Catalog 章节页展示的 Unit **只能来源于两处之一**：
  1. **catalog 自身结构**（优先）
  2. **已绑定资源的 `resource.unit`**（兜底）

**禁止**：
- ❌ 任何基于 `chapter_info` / `auto_meta_result.structure` 的前端或后端推断
- ❌ 任何 LIKE / JSON 搜索推断单元

**兜底策略**：
- 若 catalog 无结构、且无资源 unit，明确返回：`该教材暂无可用单元结构`

**实现建议**：
```typescript
// 伪代码示例
function getCatalogUnits(catalogId: number) {
  // 优先级 1: catalog 自身结构
  const catalogUnits = getCatalogStructureUnits(catalogId);
  if (catalogUnits && catalogUnits.length > 0) {
    return catalogUnits;
  }

  // 优先级 2: 已绑定资源的 resource.unit
  const resourceUnits = getDistinctResourceUnits(catalogId);
  if (resourceUnits && resourceUnits.length > 0) {
    return resourceUnits;
  }

  // 兜底：无可用单元结构
  return {
    message: '该教材暂无可用单元结构',
    units: []
  };
}
```

---

## 🛠️ 工具接口

### 1. 校验接口：获取未填写 unit 的资源列表

**接口**：`GET /api/admin/resources/missing-unit`

**权限**：仅 admin

**功能**：返回未填写 `unit` 的已审核资源列表

**用途**：用于后台修复历史遗留的「待整理」资源

---

### 2. 批量设置接口：批量为资源设置 unit

**接口**：`POST /api/admin/resources/batch-set-unit`

**权限**：仅 admin

**请求体**：
```json
{
  "resource_ids": [1, 2, 3],
  "unit": "第一单元",
  "unit_index": 1
}
```

**功能**：批量为资源设置 `unit` 和 `unit_index`

**用途**：快速修复历史遗留的「待整理」资源

**代码位置**：
- `src/resource/resource-unit-validation.service.ts` - `batchSetResourceUnit()`
- `src/resource/resource-unit-validation.controller.ts` - `batchSetUnit()`

---

## ✅ 完成标准

### 必须全部满足

1. **任意已绑定 catalog 的资源，不可能再出现 unit 为空但"正常可用"的状态**
   - ✅ 资源创建时校验
   - ✅ 资源编辑时校验
   - ✅ 绑定 catalog 时校验

2. **Admin 能 5 分钟内修复一批"待整理"资源**
   - ✅ 提供校验接口：`GET /api/admin/resources/missing-unit`
   - ✅ 提供批量设置接口：`POST /api/admin/resources/batch-set-unit`

3. **Catalog → Unit → Resource 路径不依赖任何历史字段**
   - ✅ 筛选逻辑只使用 `resource.unit`
   - ✅ 禁止使用 `chapter_info` / `auto_meta_result.structure`

4. **新人只看代码就能明白：Unit 是强业务字段，不是展示字段**
   - ✅ 系统级不变量注释已写入代码
   - ✅ 文档已创建

---

## 📝 代码注释规范

在相关代码文件中，必须包含以下注释：

```typescript
/**
 * 【系统级不变量】教材单元完整性硬约束
 * 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
 */
```

```typescript
/**
 * 【系统级不变量】资源所属单元（显式字段，唯一合法来源）
 * 禁止任何基于 chapter_info / auto_meta_result.structure 的推断
 */
unit: unit || null,
```

---

## 🔍 验证清单

- [x] 资源创建时校验 unit（如果传了 catalog_id）
- [x] 资源编辑时校验 unit（如果已绑定 catalog）
- [x] 绑定 catalog 时校验 unit
- [x] 筛选逻辑只使用 resource.unit
- [x] 批量设置 unit 接口已实现
- [x] 校验接口已实现
- [x] 系统级不变量注释已写入代码
- [x] 文档已创建

---

## 📚 相关文档

- [资源单元字段实现总结](./resource-unit-field-implementation.md)
- [资源筛选实现总结](./resource-catalog-filter-implementation.md)

