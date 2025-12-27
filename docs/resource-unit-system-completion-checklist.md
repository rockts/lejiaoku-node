# 教材单元体系收口完成清单

## ✅ 任务完成情况

### 任务 1：建立「教材单元完整性」硬约束 ✅

#### 1.1 资源创建时校验 ✅

**文件**：`src/resource/resource.controller.ts`

**位置**：`store()` 函数

**实现**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
// 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
// 如果创建时传了 catalog_id，则 unit 必须提供
if (catalog_id && (!unit || unit.trim() === '')) {
    return response.status(400).json({
        success: false,
        message: '该资源已绑定教材，必须选择所属单元',
        error: 'UNIT_REQUIRED_FOR_CATALOG',
    });
}
```

**校验点**：`POST /api/resources`（资源创建）

---

#### 1.2 资源编辑时校验 ✅

**文件**：`src/resource/resource.controller.update.ts`

**位置**：`update()` 函数

**实现**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
// 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
const isBoundToCatalog = await resourceUnitValidationService.isResourceBoundToCatalog(resourceId);

// 如果资源已绑定 catalog，且更新后 unit 为空，则拒绝
if (isBoundToCatalog) {
  const newUnit = unit !== undefined ? unit : existingResource.unit;
  if (!newUnit || (typeof newUnit === 'string' && newUnit.trim() === '')) {
    return response.status(400).json({
      success: false,
      message: '该资源已绑定教材，必须选择所属单元',
      error: 'UNIT_REQUIRED_FOR_CATALOG',
    });
  }
}
```

**校验点**：`PUT /api/resources/:id`（资源编辑）

---

#### 1.3 绑定 catalog 时校验 ✅

**文件**：`src/resource/resource-catalog-bind.controller.ts`

**位置**：`bindCatalog()` 函数

**实现**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
// 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
// 在绑定 catalog 前，检查资源是否有 unit
const resource = await getResourceByIdForAdmin(resourceId);
if (!resource.unit || (typeof resource.unit === 'string' && resource.unit.trim() === '')) {
  return response.status(400).json({
    success: false,
    message: '该资源未设置所属单元，无法绑定教材。请先设置 unit 字段',
    error: 'UNIT_REQUIRED_FOR_CATALOG',
  });
}
```

**校验点**：`POST /api/admin/resources/:id/bind-catalog`（绑定 catalog）

---

### 任务 2：后台补齐工具（面向 admin）✅

#### 2.1 批量设置 unit 接口 ✅

**接口**：`POST /api/admin/resources/batch-set-unit`

**权限**：仅 admin

**文件**：
- `src/resource/resource-unit-validation.service.ts` - `batchSetResourceUnit()`
- `src/resource/resource-unit-validation.controller.ts` - `batchSetUnit()`
- `src/resource/resource.router.ts` - 路由注册

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

---

#### 2.2 校验接口 ✅

**接口**：`GET /api/admin/resources/missing-unit`

**权限**：仅 admin

**文件**：
- `src/resource/resource-unit-validation.service.ts` - `getResourcesMissingUnit()`
- `src/resource/resource-unit-validation.controller.ts` - `getResourcesMissingUnit()`
- `src/resource/resource.router.ts` - 路由注册

**功能**：返回未填写 `unit` 的已审核资源列表

**用途**：用于后台修复历史遗留的「待整理」资源

---

### 任务 3：Catalog → Unit 结构稳定性保证 ✅

#### 3.1 规则确认 ✅

**规则**：
- Catalog 章节页展示的 Unit **只能来源于两处之一**：
  1. **catalog 自身结构**（优先）
  2. **已绑定资源的 `resource.unit`**（兜底）

**禁止**：
- ❌ 任何基于 `chapter_info` / `auto_meta_result.structure` 的前端或后端推断
- ❌ 任何 LIKE / JSON 搜索推断单元

**文档位置**：`docs/resource-unit-system-invariants.md`

---

#### 3.2 代码实现 ✅

**筛选逻辑**：
- `src/resource/resource.middleware.ts` - 已移除 `chapter_info LIKE` 和 `auto_meta_result.structure` 搜索
- `src/resource/resource.service.ts` - 筛选只使用 `resource.unit = ?`

**关键代码**：
```typescript
// 按单元筛选（只使用 resource.unit 字段）
if (unit) {
  sql += ' AND resource.unit = ?';
  params.push(unit);
}
```

---

### 任务 4：写入系统级不变量 ✅

#### 4.1 代码注释 ✅

**文件**：`src/resource/resource.service.ts`

**位置**：文件顶部

**内容**：
```typescript
/**
 * 【系统级不变量】教材单元体系规则
 * 
 * 1. 「教材单元」唯一合法来源：resource.unit
 *    - Unit 不是 Tag，不是文本推断结果
 *    - 禁止任何基于 chapter_info / auto_meta_result.structure 的推断
 *    - 禁止任何 LIKE / JSON 搜索推断单元
 * 
 * 2. Catalog + Unit 是资源筛选的**最小稳定组合**
 *    - 筛选时：Catalog → Unit → Resource 路径不依赖任何历史字段
 *    - 如果同时传了 catalog_id 和 unit，必须同时满足，任一缺失 → 不返回数据
 * 
 * 3. 教材单元完整性硬约束
 *    - 凡是已绑定 catalog 的资源，resource.unit 必须非空
 *    - 在资源创建、编辑、绑定 catalog 时强制校验
 * 
 * 4. Catalog → Unit 结构稳定性保证
 *    - Catalog 章节页展示的 Unit 只能来源于两处之一：
 *      a. catalog 自身结构（优先）
 *      b. 已绑定资源的 resource.unit（兜底）
 *    - 禁止任何基于 chapter_info / auto_meta_result.structure 的前端或后端推断
 *    - 若 catalog 无结构、且无资源 unit，明确返回"该教材暂无可用单元结构"
 */
```

---

#### 4.2 文档 ✅

**文件**：`docs/resource-unit-system-invariants.md`

**内容**：
- 系统级不变量定义
- 规则说明
- 工具接口说明
- 完成标准
- 代码注释规范
- 验证清单

---

## 📋 关键代码点

### 1. 校验服务

**文件**：`src/resource/resource-unit-validation.service.ts`

**关键函数**：
- `isResourceBoundToCatalog()` - 检查资源是否已绑定 catalog
- `getResourcesMissingUnit()` - 获取未填写 unit 的资源列表
- `batchSetResourceUnit()` - 批量设置 unit

---

### 2. 校验控制器

**文件**：`src/resource/resource-unit-validation.controller.ts`

**关键函数**：
- `getResourcesMissingUnit()` - 校验接口控制器
- `batchSetUnit()` - 批量设置接口控制器

---

### 3. 资源创建校验

**文件**：`src/resource/resource.controller.ts`

**关键代码**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
if (catalog_id && (!unit || unit.trim() === '')) {
    return response.status(400).json({
        success: false,
        message: '该资源已绑定教材，必须选择所属单元',
        error: 'UNIT_REQUIRED_FOR_CATALOG',
    });
}
```

---

### 4. 资源编辑校验

**文件**：`src/resource/resource.controller.update.ts`

**关键代码**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
const isBoundToCatalog = await resourceUnitValidationService.isResourceBoundToCatalog(resourceId);
if (isBoundToCatalog) {
  const newUnit = unit !== undefined ? unit : existingResource.unit;
  if (!newUnit || (typeof newUnit === 'string' && newUnit.trim() === '')) {
    return response.status(400).json({
      success: false,
      message: '该资源已绑定教材，必须选择所属单元',
      error: 'UNIT_REQUIRED_FOR_CATALOG',
    });
  }
}
```

---

### 5. 绑定 catalog 校验

**文件**：`src/resource/resource-catalog-bind.controller.ts`

**关键代码**：
```typescript
// 【系统级不变量】教材单元完整性硬约束
const resource = await getResourceByIdForAdmin(resourceId);
if (!resource.unit || (typeof resource.unit === 'string' && resource.unit.trim() === '')) {
  return response.status(400).json({
    success: false,
    message: '该资源未设置所属单元，无法绑定教材。请先设置 unit 字段',
    error: 'UNIT_REQUIRED_FOR_CATALOG',
  });
}
```

---

## ✅ 交付标准验证

### 1. 任意已绑定 catalog 的资源，不可能再出现 unit 为空但"正常可用"的状态 ✅

- ✅ 资源创建时校验（如果传了 catalog_id）
- ✅ 资源编辑时校验（如果已绑定 catalog）
- ✅ 绑定 catalog 时校验（如果 unit 为空）

---

### 2. Admin 能 5 分钟内修复一批"待整理"资源 ✅

- ✅ 提供校验接口：`GET /api/admin/resources/missing-unit`
- ✅ 提供批量设置接口：`POST /api/admin/resources/batch-set-unit`

**使用流程**：
1. 调用 `GET /api/admin/resources/missing-unit` 获取未填写 unit 的资源列表
2. 调用 `POST /api/admin/resources/batch-set-unit` 批量设置 unit

---

### 3. Catalog → Unit → Resource 路径不依赖任何历史字段 ✅

- ✅ 筛选逻辑只使用 `resource.unit`
- ✅ 禁止使用 `chapter_info` / `auto_meta_result.structure`
- ✅ SQL 中不再出现 `chapter_info LIKE` 或 `JSON_SEARCH(auto_meta_result)`

---

### 4. 新人只看代码就能明白：Unit 是强业务字段，不是展示字段 ✅

- ✅ 系统级不变量注释已写入 `src/resource/resource.service.ts`
- ✅ 所有校验点都有明确的注释说明
- ✅ 文档已创建：`docs/resource-unit-system-invariants.md`

---

## 📝 修改文件清单

1. **新增文件**：
   - `src/resource/resource-unit-validation.service.ts` - 校验服务
   - `src/resource/resource-unit-validation.controller.ts` - 校验控制器（已更新）
   - `docs/resource-unit-system-invariants.md` - 系统级不变量文档
   - `docs/resource-unit-system-completion-checklist.md` - 完成清单（本文档）

2. **修改文件**：
   - `src/resource/resource.controller.ts` - 添加创建时校验
   - `src/resource/resource.controller.update.ts` - 添加编辑时校验
   - `src/resource/resource-catalog-bind.controller.ts` - 添加绑定 catalog 时校验
   - `src/resource/resource.service.ts` - 添加系统级不变量注释
   - `src/resource/resource.router.ts` - 添加批量设置和校验接口路由

---

## 🎯 总结

所有任务已完成，系统级不变量已建立，教材单元体系已收口并固化。

**核心成果**：
1. ✅ 建立了「教材单元完整性」硬约束
2. ✅ 提供了后台补齐工具
3. ✅ 保证了 Catalog → Unit 结构稳定性
4. ✅ 写入了系统级不变量

**下一步**：
- 前端需要适配新的校验错误信息
- 前端需要更新筛选参数（从 `chapter_keyword` 改为 `unit`）
- 建议定期使用校验接口检查未填写 unit 的资源

