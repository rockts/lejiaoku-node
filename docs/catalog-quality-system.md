# Catalog 质量系统规范

## 📋 概述

本文档定义了乐教库项目中「Catalog 质量状态（Quality State）」的硬约束和系统级规范，为运营和系统可持续生长提供唯一可信信号。

**核心原则**：
- **质量状态必须派生而不是存表**
- **质量状态是"运营唯一可信信号"**
- **Catalog 质量 ≠ 内容好坏**
- **Catalog 质量 = 系统是否可持续生长**

---

## 🔒 系统级不变量（必须严格遵守）

### 1. 质量状态必须派生而不是存表

**规则**：
- 质量状态**必须可重复计算**，不允许存表
- 质量状态基于统计结果实时计算
- 不允许人工干预状态

**原因**：
- 质量状态是动态的，随着资源增加而变化
- 存表会导致状态与实际数据不一致
- 派生计算保证状态始终反映真实情况

**实现**：
- 质量状态在每次统计时实时计算
- 不新增数据库表存储质量状态
- 质量状态计算函数：`calculateCatalogQualityState()`

**代码位置**：
- `src/textbook/catalog-statistics.service.ts` - `calculateCatalogQualityState()`

---

### 2. 质量状态是"运营唯一可信信号"

**规则**：
- 质量状态是运营判断 Catalog 健康度的唯一可信信号
- 运营基于质量状态决定：
  - 哪些 Catalog 需要补充内容
  - 哪些 Catalog 需要整理（设置 unit）
  - 哪些 Catalog 已经健康可用

**用途**：
- 运营分析（哪些教材内容最丰富/最需要补充）
- 可视化展示（质量状态分布图表）
- 后续推荐（基于质量状态推荐）

---

### 3. Catalog 质量 ≠ 内容好坏

**规则**：
- Catalog 质量状态**不评价内容质量**
- 质量状态只反映：
  - 是否有资源
  - 资源是否已组织（有 unit）
  - 资源分布是否均匀

**区别**：
- **内容质量**：资源本身的质量（需要人工评价）
- **Catalog 质量**：系统组织结构的健康度（可自动计算）

**示例**：
- 一个 Catalog 可能有 100 个高质量资源，但如果都没有设置 unit，质量状态仍然是 `needs_organization`
- 一个 Catalog 可能只有 5 个资源，但如果都设置了 unit 且分布均匀，质量状态可能是 `healthy`

---

### 4. Catalog 质量 = 系统是否可持续生长

**规则**：
- Catalog 质量反映系统是否可持续生长
- 质量状态判断标准：
  - `empty`：没有资源，无法生长
  - `needs_organization`：有资源但未组织，无法有效利用
  - `needs_content`：已组织但内容不足，需要补充
  - `healthy`：已组织且内容充足，可以持续生长

**可持续生长指标**：
- 资源是否已组织（有 unit）
- 资源分布是否均匀（每个 unit 都有资源）
- 资源数量是否充足（每个 unit 至少有 2 个资源）

---

## 📊 Catalog 质量状态枚举

### 状态定义（必须完全一致）

```typescript
type CatalogQualityState = 
  | 'healthy'           // 健康：已组织且内容充足
  | 'needs_content'     // 需要内容：已组织但内容不足
  | 'needs_organization' // 需要整理：有资源但未组织
  | 'empty';            // 空：没有资源
```

---

## 🔍 状态判定规则（严格）

### 1. empty（空）

**条件**：
```
resource_total = 0
```

**说明**：
- 该 catalog 下没有任何已审核的资源
- 无法使用，需要补充资源

**示例**：
```json
{
  "quality_state": "empty",
  "quality_reason": ["No resources in this catalog"]
}
```

---

### 2. needs_organization（需要整理）

**条件**：
```
resource_total > 0
AND resource_pending_unit > 0
```

**说明**：
- 该 catalog 下有资源，但有资源未设置 unit
- 需要为这些资源设置 unit，才能有效利用

**示例**：
```json
{
  "quality_state": "needs_organization",
  "quality_reason": ["3 resources missing unit"]
}
```

---

### 3. needs_content（需要内容）

**条件**：
```
resource_total > 0
AND resource_pending_unit = 0
AND (
  unit_total = 0
  OR 大部分unit的resource_count <= 1
)
```

**说明**：
- 该 catalog 下有资源且都已设置 unit
- 但内容不足：要么没有 unit，要么大部分 unit 只有 1 个资源
- 需要补充更多资源

**判断标准**：
- 如果所有 unit 都只有 1 个资源 → `needs_content`
- 如果超过 50% 的 unit 只有 1 个资源 → `needs_content`

**示例**：
```json
{
  "quality_state": "needs_content",
  "quality_reason": [
    "5 units with only 1 resource",
    "Only 1 unit with 2+ resources"
  ]
}
```

---

### 4. healthy（健康）

**条件**：
```
resource_total > 0
AND resource_pending_unit = 0
AND unit_total > 0
AND 大部分unit有资源(>= 2)
```

**说明**：
- 该 catalog 下有资源且都已设置 unit
- 资源分布均匀，大部分 unit 至少有 2 个资源
- 可以持续生长，系统健康

**判断标准**：
- 大部分 unit 有 2 个或更多资源 → `healthy`

**示例**：
```json
{
  "quality_state": "healthy",
  "quality_reason": [
    "8 units with 2+ resources",
    "15 total resources across 8 units"
  ]
}
```

---

## 📊 API 接口规范

### 1. 扩展 Catalog 统计接口

**接口**：`GET /api/admin/catalogs/statistics`

**新增字段**：
- `quality_state` - Catalog 质量状态（`healthy` | `needs_content` | `needs_organization` | `empty`）
- `quality_reason` - 质量状态原因（字符串数组）

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
      "quality_reason": ["2 resources missing unit"]
    }
  ],
  "count": 1,
  "message": "成功获取 1 个 catalog 的统计信息"
}
```

---

### 2. 新增单 Catalog 质量诊断接口

**接口**：`GET /api/admin/catalogs/:id/quality`

**权限**：仅 admin

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
    "resource_total": 15,
    "unit_total": 5,
    "resource_pending_unit": 2,
    "last_resource_created_at": "2024-01-15T10:30:00.000Z",
    "quality_state": "needs_organization",
    "quality_reason": ["2 resources missing unit"],
    "unit_statistics": [
      {
        "unit": "第一单元",
        "unit_index": 1,
        "resource_count": 5,
        "last_resource_created_at": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "成功获取 catalog 1 的质量诊断信息"
}
```

---

## 💻 质量判定伪代码

```typescript
function calculateCatalogQualityState(
  catalogId: number,
  resourceTotal: number,
  unitTotal: number,
  resourcePendingUnit: number
): { state: CatalogQualityState; reasons: string[] } {
  // 1. empty: resource_total = 0
  if (resourceTotal === 0) {
    return {
      state: 'empty',
      reasons: ['No resources in this catalog'],
    };
  }

  // 2. needs_organization: resource_total > 0 && resource_pending_unit > 0
  if (resourcePendingUnit > 0) {
    return {
      state: 'needs_organization',
      reasons: [`${resourcePendingUnit} resources missing unit`],
    };
  }

  // 3. needs_content: unit_total = 0 或 大部分unit的resource_count <= 1
  if (unitTotal === 0) {
    return {
      state: 'needs_content',
      reasons: ['No units with resources'],
    };
  }

  // 获取每个 unit 的资源数量
  const unitStats = getCatalogUnitStatistics(catalogId);
  const unitsWithMultipleResources = unitStats.filter(u => u.resource_count >= 2).length;
  const unitsWithSingleResource = unitStats.filter(u => u.resource_count === 1).length;

  // 如果大部分 unit 只有 1 个资源，则认为是 needs_content
  if (unitsWithMultipleResources === 0 || unitsWithSingleResource > unitsWithMultipleResources) {
    return {
      state: 'needs_content',
      reasons: [
        `${unitsWithSingleResource} units with only 1 resource`,
        `Only ${unitsWithMultipleResources} units with 2+ resources`,
      ],
    };
  }

  // 4. healthy: 大部分 unit 有资源(>= 2)
  return {
    state: 'healthy',
    reasons: [
      `${unitsWithMultipleResources} units with 2+ resources`,
      `${resourceTotal} total resources across ${unitTotal} units`,
    ],
  };
}
```

---

## ✅ 完成标准验证

### 必须全部满足

1. **质量状态必须派生而不是存表** ✅
   - ✅ 已实现：质量状态在每次统计时实时计算
   - ✅ 已禁止：不新增数据库表存储质量状态

2. **质量状态是"运营唯一可信信号"** ✅
   - ✅ 已实现：质量状态反映 Catalog 健康度
   - ✅ 已实现：质量状态可用于运营分析和可视化

3. **Catalog 质量 ≠ 内容好坏** ✅
   - ✅ 已实现：质量状态只反映系统组织结构健康度
   - ✅ 已禁止：质量状态不评价内容质量

4. **Catalog 质量 = 系统是否可持续生长** ✅
   - ✅ 已实现：质量状态反映系统可持续生长能力
   - ✅ 已实现：质量状态判断标准基于资源组织和分布

---

## 📝 修改文件清单

1. **修改文件**：
   - `src/textbook/catalog-statistics.service.ts` - 添加质量状态计算逻辑
   - `src/textbook/catalog-statistics.controller.ts` - 添加质量诊断接口
   - `src/textbook/textbook.router.ts` - 添加质量诊断路由

2. **新增文件**：
   - `docs/catalog-quality-system.md` - Catalog 质量系统规范文档（本文档）

---

## 🎯 总结

**核心成果**：
1. ✅ 定义了 Catalog 质量状态枚举
2. ✅ 实现了质量状态判定规则
3. ✅ 扩展了 Catalog 统计接口（新增质量状态字段）
4. ✅ 新增了单 Catalog 质量诊断接口
5. ✅ 创建了系统级说明文档

**核心原则**：
- **质量状态必须派生而不是存表**
- **质量状态是"运营唯一可信信号"**
- **Catalog 质量 ≠ 内容好坏**
- **Catalog 质量 = 系统是否可持续生长**

**系统状态**：
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误
- ✅ 所有规则已写入代码注释和文档

---

## 📚 相关文档

- [Catalog 统计系统规范](./catalog-statistics-spec.md) - Catalog 统计系统规范
- [搜索系统规范](./search-system-spec.md) - 搜索系统规范
- [资源单元体系系统级不变量](./resource-unit-system-invariants.md) - 教材单元体系规则

