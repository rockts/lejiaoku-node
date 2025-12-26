# 教材目录页行为规范

## 📋 概述

本文档定义了乐教库项目中「教材目录页」的行为态系统，让教材目录页成为一个"可驱动行动的页面"，而不是信息展示页。

**核心原则**：
- **所有状态均为派生，不存表**
- **不引入复杂规则**
- **不为"未来可能"设计**
- **前端可直接使用 view_state 和 unit_state**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. 所有状态均为派生

**规则**：
- `view_state` 必须由 `action_type` 派生
- `unit_state` 必须由 `resource_count` 派生
- 不允许在数据库中存储这些状态
- 所有状态必须可重复计算

**原因**：
- 状态是动态的，随着资源增加而变化
- 存表会导致状态与实际数据不一致
- 派生计算保证状态始终反映真实情况

**实现**：
- `view_state` 在每次请求时实时计算
- `unit_state` 在每次请求时实时计算
- 不新增数据库表存储状态

**代码位置**：
- `src/textbook/catalog-info.service.ts` - `convertActionTypeToViewState()`, `calculateUnitState()`

---

### 2. 前端只关心三种状态

**规则**：
- `view_state` 只包含三种状态：`add_resources`, `organize_units`, `no_action`
- `prioritize_upload` 会被映射为 `add_resources`
- 前端无需关心 `action_type` 的细节

**映射规则**：
- `add_resources` → `add_resources`
- `prioritize_upload` → `add_resources`
- `organize_units` → `organize_units`
- `no_action` → `no_action`

---

### 3. Unit 级别的健康度

**规则**：
- `unit_state` 定义 Unit 级别的健康度：`empty` | `sparse` | `healthy`
- 不新增字段到数据库
- 基于 `resource_count` 实时计算

**判定规则**：
- `empty`: `resource_count = 0`
- `sparse`: `resource_count = 1`
- `healthy`: `resource_count >= 2`

---

## 📊 教材目录页行为态（View State）

### View State 定义

```typescript
type CatalogViewState = 'add_resources' | 'organize_units' | 'no_action';
```

### View State 映射规则

| action_type | view_state | 说明 |
|-------------|------------|------|
| `add_resources` | `add_resources` | 需要补充资源 |
| `prioritize_upload` | `add_resources` | 优先上传（映射为 add_resources） |
| `organize_units` | `organize_units` | 需要整理单元 |
| `no_action` | `no_action` | 无需行动 |

### Action Hint（行为提示）

**规则**：
- `action_hint` 提供一句话行为提示
- 基于 `view_state` 和统计数据生成

**提示内容**：
- `add_resources` (resource_total = 0): "该教材暂无资源，建议优先补充内容"
- `add_resources` (resource_total > 0): "该教材资源密度不足，建议补充更多资源"
- `organize_units`: "该教材有资源但缺少单元信息，建议整理单元"
- `no_action`: "该教材内容充足，无需行动"

---

## 📊 Unit 级别的健康度（Unit State）

### Unit State 定义

```typescript
type UnitState = 'empty' | 'sparse' | 'healthy';
```

### Unit State 判定规则

| resource_count | unit_state | 说明 |
|----------------|------------|------|
| 0 | `empty` | 该单元没有资源 |
| 1 | `sparse` | 该单元只有 1 个资源 |
| >= 2 | `healthy` | 该单元有 2 个或更多资源 |

### "可点的下一步"

**规则**：
- 当 `unit_state = empty` 时，前端可以直接展示"为该单元上传资源"
- 当 `unit_state = sparse` 时，前端可以展示"该单元资源较少，建议补充"
- 当 `unit_state = healthy` 时，前端可以展示"该单元内容充足"

---

## 📊 API 接口规范

### 1. 获取 Catalog 基本信息（扩展后）

**接口**：`GET /api/catalogs/:catalogId/info`

**新增字段**：
- `view_state` - 教材目录页行为态（前端可直接使用）
- `action_hint` - 行为提示（一句话）

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
    "action_type": "no_action",
    "view_state": "no_action",
    "action_hint": "该教材内容充足，无需行动"
  },
  "message": "成功获取 catalog 1 的信息"
}
```

---

### 2. 获取 Catalog 下的 Unit 列表（扩展后）

**接口**：`GET /api/catalogs/:catalogId/units`

**新增字段**：
- `unit_state` - Unit 健康度（empty | sparse | healthy）

**返回结构**：
```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 3,
      "unit_state": "healthy"
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 1,
      "unit_state": "sparse"
    },
    {
      "unit": "第三单元",
      "unit_index": 3,
      "resource_count": 0,
      "unit_state": "empty"
    }
  ],
  "catalog_id": 1,
  "count": 3,
  "message": "成功获取 catalog 1 下 3 个 unit"
}
```

---

## 📊 示例 JSON

### 1. catalog_info 示例 JSON（扩展后）

#### 示例 1：需要补充资源

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
    "unit_total": 0,
    "resource_total": 0,
    "quality_state": "empty",
    "action_type": "add_resources",
    "view_state": "add_resources",
    "action_hint": "该教材暂无资源，建议优先补充内容"
  },
  "message": "成功获取 catalog 1 的信息"
}
```

#### 示例 2：需要整理单元

```json
{
  "success": true,
  "data": {
    "catalog_id": 2,
    "subject": "语文",
    "grade": "2",
    "volume": "上册",
    "textbook_version": "人教版",
    "education_level": "elementary",
    "unit_total": 3,
    "resource_total": 10,
    "quality_state": "needs_organization",
    "action_type": "organize_units",
    "view_state": "organize_units",
    "action_hint": "该教材有资源但缺少单元信息，建议整理单元"
  },
  "message": "成功获取 catalog 2 的信息"
}
```

#### 示例 3：无需行动

```json
{
  "success": true,
  "data": {
    "catalog_id": 3,
    "subject": "英语",
    "grade": "2",
    "volume": "上册",
    "textbook_version": "人教版",
    "education_level": "elementary",
    "unit_total": 5,
    "resource_total": 20,
    "quality_state": "healthy",
    "action_type": "no_action",
    "view_state": "no_action",
    "action_hint": "该教材内容充足，无需行动"
  },
  "message": "成功获取 catalog 3 的信息"
}
```

---

### 2. units 列表示例 JSON（扩展后）

```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 3,
      "unit_state": "healthy"
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 1,
      "unit_state": "sparse"
    },
    {
      "unit": "第三单元",
      "unit_index": 3,
      "resource_count": 0,
      "unit_state": "empty"
    },
    {
      "unit": "第四单元",
      "unit_index": 4,
      "resource_count": 2,
      "unit_state": "healthy"
    },
    {
      "unit": "第五单元",
      "unit_index": 5,
      "resource_count": 1,
      "unit_state": "sparse"
    }
  ],
  "catalog_id": 1,
  "count": 5,
  "message": "成功获取 catalog 1 下 5 个 unit"
}
```

---

## 🎯 前端使用指南

### 1. 根据 view_state 展示不同的 UI

**add_resources**：
- 显示"补充资源"按钮
- 显示 `action_hint` 提示
- 可以引导用户上传资源

**organize_units**：
- 显示"整理单元"按钮（仅管理员可见）
- 显示 `action_hint` 提示
- 可以引导管理员整理单元

**no_action**：
- 显示"内容充足"标识
- 显示 `action_hint` 提示
- 无需额外操作

---

### 2. 根据 unit_state 展示不同的 UI

**empty**：
- 显示"为该单元上传资源"按钮
- 可以引导用户上传资源
- 突出显示该单元需要内容

**sparse**：
- 显示"该单元资源较少，建议补充"提示
- 可以引导用户补充资源
- 弱化显示该单元

**healthy**：
- 显示"该单元内容充足"标识
- 正常显示该单元
- 无需额外操作

---

### 3. "可点的下一步"示例

**场景 1：unit_state = empty**

```html
<div class="unit-item unit-empty">
  <h3>第一单元</h3>
  <p>该单元暂无资源</p>
  <button>为该单元上传资源</button>
</div>
```

**场景 2：unit_state = sparse**

```html
<div class="unit-item unit-sparse">
  <h3>第二单元</h3>
  <p>该单元资源较少，建议补充</p>
  <button>补充资源</button>
</div>
```

**场景 3：unit_state = healthy**

```html
<div class="unit-item unit-healthy">
  <h3>第三单元</h3>
  <p>该单元内容充足</p>
  <span class="resource-count">3 个资源</span>
</div>
```

---

## 🔍 curl 示例

### 1. 获取 Catalog 基本信息（包含 view_state 和 action_hint）

```bash
curl -X GET "http://localhost:3333/api/catalogs/1/info" \
  -H "Content-Type: application/json"
```

**预期返回**：
- HTTP 200 OK
- JSON 格式，包含 `view_state` 和 `action_hint` 字段

---

### 2. 获取 Catalog 下的 Unit 列表（包含 unit_state）

```bash
curl -X GET "http://localhost:3333/api/catalogs/1/units" \
  -H "Content-Type: application/json"
```

**预期返回**：
- HTTP 200 OK
- JSON 格式，每个 unit 包含 `unit_state` 字段

---

## ✅ 完成标准验证

### 必须全部满足

1. **所有状态均为派生** ✅
   - ✅ 已实现：`view_state` 和 `unit_state` 在每次请求时实时计算
   - ✅ 已禁止：不新增数据库表存储状态

2. **前端只关心三种状态** ✅
   - ✅ 已实现：`view_state` 只包含三种状态：`add_resources`, `organize_units`, `no_action`
   - ✅ 已实现：`prioritize_upload` 映射为 `add_resources`

3. **Unit 级别的健康度** ✅
   - ✅ 已实现：`unit_state` 定义 Unit 级别的健康度：`empty` | `sparse` | `healthy`
   - ✅ 已实现：基于 `resource_count` 实时计算

4. **"可点的下一步"** ✅
   - ✅ 已实现：当 `unit_state = empty` 时，前端可以直接展示"为该单元上传资源"

---

## 📝 修改文件清单

### 修改文件

1. **`src/textbook/catalog-info.service.ts`**
   - 新增 `CatalogViewState` 类型定义
   - 新增 `UnitState` 类型定义
   - 新增 `convertActionTypeToViewState()` 函数
   - 新增 `generateActionHint()` 函数
   - 新增 `calculateUnitState()` 函数
   - 修改 `getCatalogInfo()` 函数，添加 `view_state` 和 `action_hint` 字段
   - 修改 `getCatalogUnits()` 函数，添加 `unit_state` 字段

### 新增文件

1. **`docs/catalog-page-behavior.md`**
   - 教材目录页行为规范文档（本文档）

---

## 🎯 总结

**核心成果**：
1. ✅ 定义了教材目录页的行为态（View State）
2. ✅ 为 catalog_info 增加了行为提示字段（view_state, action_hint）
3. ✅ 定义了 Unit 级别的健康度（unit_state）
4. ✅ 明确了"可点的下一步"（unit_state = empty 时展示上传按钮）
5. ✅ 创建了系统级说明文档

**核心原则**：
- **所有状态均为派生，不存表**
- **不引入复杂规则**
- **不为"未来可能"设计**
- **前端可直接使用 view_state 和 unit_state**

**系统状态**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 所有规则已写入代码注释和文档
- ✅ 状态可重复计算，不依赖数据库存储

---

## 📚 相关文档

- [Catalog Info 和第一条教材搜索 SQL 规范](./catalog-info-and-first-search.md) - Catalog Info 和第一条教材搜索 SQL 规范
- [Catalog 行动系统规范](./catalog-action-system.md) - Catalog 行动系统规范
- [Catalog 质量系统规范](./catalog-quality-system.md) - Catalog 质量系统规范

