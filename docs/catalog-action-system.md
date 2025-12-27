# Catalog 行动系统规范

## 📋 概述

本文档定义了乐教库项目中「Catalog 行动类型（Action Types）」的硬约束和系统级规范，将 Catalog 质量状态转化为"可执行行动任务"。

**核心原则**：
- **Action 是派生的而不是存储的**
- **Quality ≠ Action**
- **Action 是系统与人的接口**
- **系统不会"要求人做事"，只会"指出最有价值的地方"**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. Action 是派生的而不是存储的

**规则**：
- Action 必须可重复计算，不允许存表
- Action 基于质量状态和统计结果实时计算
- 不允许人工干预 Action

**原因**：
- Action 是动态的，随着资源增加而变化
- 存表会导致 Action 与实际数据不一致
- 派生计算保证 Action 始终反映真实情况

**实现**：
- Action 在每次统计时实时计算
- 不新增数据库表存储 Action
- Action 计算函数：`calculateCatalogAction()`

**代码位置**：
- `src/textbook/catalog-statistics.service.ts` - `calculateCatalogAction()`

---

### 2. Quality ≠ Action

**规则**：
- Quality（质量状态）反映 Catalog 的健康度
- Action（行动类型）反映需要执行的任务
- Quality 和 Action 是**不同的概念**

**区别**：
- **Quality**：系统状态的描述（empty, needs_organization, needs_content, healthy）
- **Action**：需要执行的任务（organize_units, add_resources, prioritize_upload, no_action）

**映射关系**：
- `empty` → `add_resources`
- `needs_organization` → `organize_units`
- `needs_content` → `add_resources`
- `healthy` → `no_action`

---

### 3. Action 是系统与人的接口

**规则**：
- Action 是系统与人的接口
- Action 告诉人"应该做什么"
- Action 不强制人执行，只是建议

**用途**：
- 后台运营（哪些 Catalog 需要处理）
- 贡献者任务派发（应该优先处理哪些 Catalog）
- 前端看板（显示待处理任务）

---

### 4. 系统不会"要求人做事"，只会"指出最有价值的地方"

**规则**：
- Action 不是命令，而是建议
- Action 指出"最有价值的地方"（优先级高的 Catalog）
- 系统不强制人执行 Action

**优先级规则**：
- `empty` > `needs_organization` > `needs_content`
- 优先级高的 Action 排在前面

---

## 📊 Catalog 行动类型枚举

### 行动类型定义（必须完全一致）

```typescript
type CatalogActionType = 
  | 'organize_units'      // 需要整理单元
  | 'add_resources'       // 需要补充资源
  | 'prioritize_upload'   // 优先上传
  | 'no_action';          // 无需行动
```

---

## 🔍 行动映射规则（严格）

### 映射表

| Quality State | Action Type | 原因 |
|---------------|-------------|------|
| `empty` | `add_resources` | 该教材完全没有内容 |
| `needs_organization` | `organize_units` | 已有资源但 unit 缺失 |
| `needs_content` | `add_resources` | unit 已有但资源密度不足 |
| `healthy` | `no_action` | 无需行动 |

---

### 映射规则详细说明

#### 1. empty → add_resources

**条件**：`resource_total = 0`

**Action**：`add_resources`

**原因**：该教材完全没有内容，需要补充资源

**示例**：
```json
{
  "quality_state": "empty",
  "action_type": "add_resources",
  "action_reason": ["该教材完全没有内容，需要补充资源"]
}
```

---

#### 2. needs_organization → organize_units

**条件**：`resource_total > 0 && resource_pending_unit > 0`

**Action**：`organize_units`

**原因**：已有资源但 unit 缺失，需要为资源设置 unit

**示例**：
```json
{
  "quality_state": "needs_organization",
  "action_type": "organize_units",
  "action_reason": ["3 资源缺少单元"]
}
```

---

#### 3. needs_content → add_resources

**条件**：`resource_total > 0 && resource_pending_unit = 0 && (unit_total = 0 或 大部分unit的resource_count <= 1)`

**Action**：`add_resources`

**原因**：unit 已有但资源密度不足，需要补充资源

**suggested_units**：资源不足的 unit 列表（最多 5 个）

**示例**：
```json
{
  "quality_state": "needs_content",
  "action_type": "add_resources",
  "action_reason": [
    "5 单元只有 1 个资源",
    "只有 1 单元有 2+ 资源"
  ],
  "suggested_units": ["第一单元", "第三单元", "第五单元"]
}
```

---

#### 4. healthy → no_action

**条件**：`resource_total > 0 && resource_pending_unit = 0 && unit_total > 0 && 大部分unit有资源(>= 2)`

**Action**：`no_action`

**原因**：该教材内容充足，无需行动

**示例**：
```json
{
  "quality_state": "healthy",
  "action_type": "no_action",
  "action_reason": ["该教材内容充足，无需行动"]
}
```

---

## 📊 API 接口规范

### 1. 扩展 Catalog 统计接口

**接口**：`GET /api/admin/catalogs/statistics`

**新增字段**：
- `action_type` - Catalog 行动类型
- `action_reason` - 行动原因（字符串数组）
- `suggested_units` - 建议的 unit 列表（可选，仅 needs_content 时存在）

**返回示例**：
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
      "last_resource_created_at": "2024-01-15T10:30:00.000Z",
      "quality_state": "needs_organization",
      "quality_reason": ["2 resources missing unit"],
      "action_type": "organize_units",
      "action_reason": ["2 资源缺少单元"],
      "suggested_units": null
    }
  ],
  "count": 1
}
```

---

### 2. 新增「待行动 Catalog 列表」接口

**接口**：`GET /api/admin/catalogs/actions`

**权限**：仅 admin

**返回**：
- 仅返回 `action_type != no_action` 的 catalog
- 按优先级排序：`empty` > `needs_organization` > `needs_content`

**返回示例**：
```json
{
  "success": true,
  "data": [
    {
      "catalog_id": 4,
      "subject": "科学",
      "grade": "2",
      "volume": "上册",
      "textbook_version": "人教版",
      "education_level": "elementary",
      "resource_total": 0,
      "unit_total": 0,
      "resource_pending_unit": 0,
      "last_resource_created_at": null,
      "quality_state": "empty",
      "quality_reason": ["No resources in this catalog"],
      "action_type": "add_resources",
      "action_reason": ["该教材完全没有内容，需要补充资源"],
      "suggested_units": null
    },
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
      "last_resource_created_at": "2024-01-15T10:30:00.000Z",
      "quality_state": "needs_organization",
      "quality_reason": ["2 resources missing unit"],
      "action_type": "organize_units",
      "action_reason": ["2 资源缺少单元"],
      "suggested_units": null
    },
    {
      "catalog_id": 3,
      "subject": "英语",
      "grade": "2",
      "volume": "上册",
      "textbook_version": "人教版",
      "education_level": "elementary",
      "resource_total": 5,
      "unit_total": 3,
      "resource_pending_unit": 0,
      "last_resource_created_at": "2024-01-14T09:20:00.000Z",
      "quality_state": "needs_content",
      "quality_reason": [
        "3 units with only 1 resource",
        "Only 0 units with 2+ resources"
      ],
      "action_type": "add_resources",
      "action_reason": [
        "3 单元只有 1 个资源",
        "只有 0 单元有 2+ 资源"
      ],
      "suggested_units": ["第一单元", "第二单元", "第三单元"]
    }
  ],
  "count": 3,
  "message": "成功获取 3 个待行动的 catalog"
}
```

**用途**：
- 后台运营（显示待处理任务）
- 贡献者任务派发（优先处理哪些 Catalog）
- 前端看板（显示待处理任务列表）

---

## 💻 行动计算伪代码

```typescript
function calculateCatalogAction(
  catalogId: number,
  qualityState: CatalogQualityState,
  qualityReasons: string[]
): { action_type: CatalogActionType; action_reason: string[]; suggested_units?: string[] } {
  // 1. empty → add_resources
  if (qualityState === 'empty') {
    return {
      action_type: 'add_resources',
      action_reason: ['该教材完全没有内容，需要补充资源'],
    };
  }

  // 2. needs_organization → organize_units
  if (qualityState === 'needs_organization') {
    return {
      action_type: 'organize_units',
      action_reason: qualityReasons.map(r => r.replace('resource', '资源').replace('missing unit', '缺少单元')),
    };
  }

  // 3. needs_content → add_resources
  if (qualityState === 'needs_content') {
    // 获取 unit 统计，找出资源不足的 unit
    const unitStats = getCatalogUnitStatistics(catalogId);
    const unitsNeedingResources = unitStats
      .filter(u => u.resource_count <= 1 && u.unit)
      .map(u => u.unit)
      .slice(0, 5); // 最多返回 5 个建议的 unit

    return {
      action_type: 'add_resources',
      action_reason: qualityReasons.map(r => r.replace('unit', '单元').replace('resource', '资源')),
      suggested_units: unitsNeedingResources.length > 0 ? unitsNeedingResources : undefined,
    };
  }

  // 4. healthy → no_action
  return {
    action_type: 'no_action',
    action_reason: ['该教材内容充足，无需行动'],
  };
}
```

**实际实现**：
- `src/textbook/catalog-statistics.service.ts` - `calculateCatalogAction()`

---

## ✅ 完成标准验证

### 必须全部满足

1. **Action 是派生的而不是存储的** ✅
   - ✅ 已实现：Action 在每次统计时实时计算
   - ✅ 已禁止：不新增数据库表存储 Action

2. **Quality ≠ Action** ✅
   - ✅ 已实现：Quality 和 Action 是不同概念
   - ✅ 已实现：明确的映射规则

3. **Action 是系统与人的接口** ✅
   - ✅ 已实现：Action 告诉人"应该做什么"
   - ✅ 已实现：Action 可用于后台运营和贡献者任务派发

4. **系统不会"要求人做事"，只会"指出最有价值的地方"** ✅
   - ✅ 已实现：Action 不是命令，而是建议
   - ✅ 已实现：按优先级排序（empty > needs_organization > needs_content）

---

## 📝 修改文件清单

1. **修改文件**：
   - `src/textbook/catalog-statistics.service.ts` - 添加行动计算逻辑
   - `src/textbook/catalog-statistics.controller.ts` - 添加待行动列表接口
   - `src/textbook/textbook.router.ts` - 添加待行动列表路由

2. **新增文件**：
   - `docs/catalog-action-system.md` - Catalog 行动系统规范文档（本文档）

---

## 🎯 总结

**核心成果**：
1. ✅ 定义了 Catalog 行动类型枚举
2. ✅ 实现了行动映射规则
3. ✅ 扩展了 Catalog 统计接口（新增行动字段）
4. ✅ 新增了待行动 Catalog 列表接口
5. ✅ 创建了系统级说明文档

**核心原则**：
- **Action 是派生的而不是存储的**
- **Quality ≠ Action**
- **Action 是系统与人的接口**
- **系统不会"要求人做事"，只会"指出最有价值的地方"**

**系统状态**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 所有规则已写入代码注释和文档

---

## 📚 相关文档

- [Catalog 质量系统规范](./catalog-quality-system.md) - Catalog 质量系统规范
- [Catalog 统计系统规范](./catalog-statistics-spec.md) - Catalog 统计系统规范
- [搜索系统规范](./search-system-spec.md) - 搜索系统规范

