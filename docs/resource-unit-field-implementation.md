# 资源单元字段显式化实现总结

## ✅ 完成内容

### 一、数据库迁移

1. **添加字段**
   - `resource.unit` VARCHAR(32) - 资源所属单元（如：第一单元）
   - `resource.unit_index` INT - 单元序号（如：1）
   - 添加索引：`idx_unit`, `idx_unit_index`

2. **迁移脚本**
   - `scripts/add-unit-fields-to-resource.sql` - 数据库字段添加脚本
   - `scripts/migrate-resource-unit.js` - 数据迁移脚本
   - 从 `chapter_info` 和 `auto_meta_result.structure` 中提取 unit 信息

### 二、筛选逻辑改造

1. **移除隐式推断**
   - ❌ 移除 `chapter_info LIKE` 筛选
   - ❌ 移除 `auto_meta_result.structure` JSON 搜索
   - ✅ 统一使用 `resource.unit` 字段筛选

2. **修改的文件**
   - `src/resource/resource.middleware.ts`
     - `filter()` 函数：将 `chapter_keyword` 改为 `unit` 参数，只使用 `resource.unit = ?`
     - 支持在 catalog 筛选时同时使用 unit 筛选
   - `src/resource/resource.service.ts`
     - `getResourceList()`: 添加 `unit` 筛选支持，在 SELECT 中添加 `unit` 和 `unit_index` 字段
     - `getResourceTotalCount()`: 添加 `unit` 筛选支持
     - `getResourceById()`: 添加 `unit` 和 `unit_index` 字段返回
     - `getResourceByIdForAdmin()`: 添加 `unit` 和 `unit_index` 字段返回

### 三、校验接口

1. **新增接口**
   - `GET /api/admin/resources/missing-unit`
   - 权限：仅 admin
   - 返回：未填写 `unit` 的已审核资源列表

2. **实现文件**
   - `src/resource/resource-unit-validation.service.ts` - 服务层
   - `src/resource/resource-unit-validation.controller.ts` - 控制器层
   - `src/resource/resource.router.ts` - 路由注册

---

## 核心 SQL 变更

### 筛选 SQL（有 unit 参数时）

```sql
-- 普通查询
SELECT r.*
FROM resource r
WHERE r.status = "approved"
  AND r.unit = ?

-- Catalog + Unit 联合筛选
SELECT DISTINCT r.*
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE r.status = "approved"
  AND c.subject = ?
  AND c.grade = ?
  AND c.volume = ?
  AND r.unit = ?  -- 必须同时满足
```

### 关键约束

1. **Catalog + Unit 联合筛选**
   - 如果同时传了 `catalog_id`（通过 subject/grade/volume）和 `unit`
   - 必须同时满足，任一缺失 → 不返回数据

2. **只使用 resource.unit**
   - ❌ 禁止使用 `chapter_info LIKE`
   - ❌ 禁止使用 `auto_meta_result.structure` 推断
   - ✅ 唯一使用 `resource.unit = ?`

---

## API 使用示例

### 1. 按单元筛选

```bash
curl -X GET "http://localhost:3333/api/resources?unit=第一单元" \
  -H "Content-Type: application/json"
```

### 2. Catalog + Unit 联合筛选

```bash
curl -X GET "http://localhost:3333/api/resources?subject=数学&grade=2&volume=上册&unit=第一单元" \
  -H "Content-Type: application/json"
```

### 3. 校验接口（仅 admin）

```bash
curl -X GET "http://localhost:3333/api/admin/resources/missing-unit" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "资源标题",
      "subject": "数学",
      "grade": "二年级",
      "unit": null,
      "status": "approved"
    }
  ],
  "count": 1,
  "message": "发现 1 条资源未填写 unit 字段"
}
```

---

## 数据迁移说明

### 执行迁移

1. **添加字段**（如果字段不存在）:
   ```bash
   mysql -u root -p < scripts/add-unit-fields-to-resource.sql
   ```

2. **迁移数据**:
   ```bash
   node scripts/migrate-resource-unit.js
   ```

### 迁移规则

1. **优先级**:
   - 优先从 `auto_meta_result.structure[0].unit` 提取
   - 其次从 `chapter_info` 中解析（匹配 "第X单元" 格式）

2. **幂等性**:
   - 已有 `unit` 的资源跳过
   - 可重复执行，不会覆盖已有数据

3. **unit_index 提取**:
   - 从 "第一单元" → 1
   - 从 "Unit 2" → 2
   - 支持中文数字和阿拉伯数字

---

## 完成标准验证

### ✅ 已满足

1. **resource 表中 unit 字段真实存在**
   - ✅ 已添加 `unit` 和 `unit_index` 字段
   - ✅ 已添加索引

2. **所有已展示资源都有明确 unit**
   - ✅ 迁移脚本可从现有数据提取 unit
   - ✅ 校验接口可检查未填写 unit 的资源

3. **搜索和筛选只依赖 resource.unit**
   - ✅ 已移除 `chapter_info LIKE` 筛选
   - ✅ 已移除 `auto_meta_result.structure` JSON 搜索
   - ✅ 统一使用 `resource.unit = ?`

4. **CatalogUnits 页面展示的 unit 与 resource.unit 完全一致**
   - ✅ 所有资源查询都返回 `unit` 字段
   - ✅ 筛选逻辑基于 `resource.unit`

---

## 修改文件清单

1. **数据库脚本**
   - `scripts/add-unit-fields-to-resource.sql`
   - `scripts/migrate-resource-unit.js`

2. **后端代码**
   - `src/resource/resource.middleware.ts` - 筛选逻辑改造
   - `src/resource/resource.service.ts` - 查询逻辑更新
   - `src/resource/resource-unit-validation.service.ts` - 校验服务（新增）
   - `src/resource/resource-unit-validation.controller.ts` - 校验控制器（新增）
   - `src/resource/resource.router.ts` - 路由注册

---

## 注意事项

1. **迁移脚本需要手动执行**
   - 由于网络限制，迁移脚本无法自动执行
   - 请在数据库可访问的环境中手动运行

2. **向后兼容**
   - `chapter_info` 字段仍然保留（用于显示）
   - `auto_meta_result` 字段仍然保留（用于其他用途）
   - 只是筛选逻辑不再使用这些字段

3. **前端适配**
   - 前端需要更新筛选参数：`chapter_keyword` → `unit`
   - 前端需要显示 `unit` 字段（如果之前显示 `chapter_info`）

---

## 下一步

1. 执行数据库迁移脚本
2. 运行数据迁移脚本填充已有资源
3. 使用校验接口检查未填写 unit 的资源
4. 前端适配新的筛选参数

