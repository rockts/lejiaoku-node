# 资源教材目录人工绑定功能实现总结

## 实现概述

实现了两个后台接口，用于人工绑定资源到教材目录，解决因 `auto_meta_result.textbook_version` 为 NULL 导致无法自动绑定的问题。

---

## 文件清单

### 1. Service 层
- **文件**: `src/resource/resource-catalog-bind.service.ts`
- **功能**: 
  - `getUnboundResources()`: 获取待人工绑定的资源列表
  - `getCandidateCatalogs()`: 获取候选教材目录
  - `bindResourceToCatalog()`: 绑定资源到教材目录

### 2. Controller 层
- **文件**: `src/resource/resource-catalog-bind.controller.ts`
- **功能**:
  - `getUnboundResourcesList()`: 处理获取待绑定资源列表的请求
  - `bindCatalog()`: 处理绑定教材目录的请求

### 3. 路由配置
- **文件**: `src/resource/resource.router.ts`
- **新增路由**:
  - `GET /api/admin/resources/unbound-catalog`
  - `POST /api/admin/resources/:id/bind-catalog`

### 4. API 文档
- **文件**: `docs/api/resource-catalog-bind-api.md`
- **内容**: 完整的接口文档、请求示例、响应示例、SQL 说明

---

## 接口详情

### 接口 1: GET /api/admin/resources/unbound-catalog

**功能**: 获取待人工绑定的资源列表

**权限**: `admin` / `editor`

**返回条件**:
- `resource.auto_meta_result IS NOT NULL`
- 未绑定到任何教材目录（`resource_textbook_map` 中无记录）
- `auto_meta_result` 中 `subject` / `grade_number` / `volume` 存在

**返回字段**:
- `resource_id`: 资源ID
- `title`: 资源标题
- `subject`: 学科（来自 `auto_meta_result`）
- `grade`: 年级文本（如："一年级"）
- `volume`: 册别（"上册" / "下册"）
- `textbook_version`: 教材版本（可能为 `null`）
- `candidate_catalogs`: 候选教材目录数组

**候选目录查询规则**:
```sql
SELECT * FROM textbook_catalog
WHERE subject = ?
  AND grade = ?
  AND volume = ?
  AND education_level = ?  -- 可选
ORDER BY textbook_version
```

---

### 接口 2: POST /api/admin/resources/:id/bind-catalog

**功能**: 人工绑定教材目录

**权限**: `admin` / `editor`

**请求 Body**:
```json
{
  "catalog_id": 2
}
```

**行为**:
1. 校验资源是否存在
2. 校验教材目录是否存在
3. 检查是否已绑定（幂等性：已绑定的资源禁止重复绑定）
4. 写入绑定记录到 `resource_textbook_map` 表
   - `source` 字段设置为 `'manual'`（人工绑定）
   - `created_at` 自动记录时间

---

## SQL 查询

### 1. 获取待绑定资源列表

```sql
SELECT 
  r.id as resource_id,
  r.title,
  JSON_EXTRACT(r.auto_meta_result, '$.subject') as subject,
  JSON_EXTRACT(r.auto_meta_result, '$.grade') as grade,
  JSON_EXTRACT(r.auto_meta_result, '$.grade_number') as grade_number,
  JSON_EXTRACT(r.auto_meta_result, '$.volume') as volume,
  JSON_EXTRACT(r.auto_meta_result, '$.textbook_version') as textbook_version,
  JSON_EXTRACT(r.auto_meta_result, '$.education_level') as education_level
FROM resource r
WHERE r.auto_meta_result IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM resource_textbook_map rtm 
    WHERE rtm.resource_id = r.id
  )
  AND JSON_EXTRACT(r.auto_meta_result, '$.subject') IS NOT NULL
  AND JSON_EXTRACT(r.auto_meta_result, '$.grade_number') IS NOT NULL
  AND JSON_EXTRACT(r.auto_meta_result, '$.volume') IS NOT NULL
ORDER BY r.created_at DESC
```

### 2. 获取候选教材目录

```sql
SELECT 
  id,
  education_level,
  grade,
  subject,
  textbook_version,
  volume
FROM textbook_catalog
WHERE subject = ?
  AND grade = ?
  AND volume = ?
  AND education_level = ?  -- 可选
ORDER BY textbook_version
```

### 3. 绑定资源到教材目录

```sql
INSERT INTO resource_textbook_map 
  (resource_id, textbook_catalog_id, source, created_at)
VALUES (?, ?, 'manual', CURRENT_TIMESTAMP)
```

---

## 接口返回示例

### GET /api/admin/resources/unbound-catalog

```json
{
  "success": true,
  "data": [
    {
      "resource_id": 35,
      "title": "语文一年级下册",
      "subject": "语文",
      "grade": "一年级",
      "volume": "下册",
      "textbook_version": null,
      "candidate_catalogs": [
        {
          "id": 2,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "人教版",
          "volume": "下册"
        },
        {
          "id": 4,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "苏教版",
          "volume": "下册"
        }
      ]
    }
  ],
  "count": 1
}
```

### POST /api/admin/resources/:id/bind-catalog

**成功响应**:
```json
{
  "success": true,
  "message": "绑定成功",
  "data": {
    "resource_id": 35,
    "catalog_id": 2
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "资源已绑定到教材目录，禁止重复绑定",
  "error": "BIND_FAILED"
}
```

---

## 约束说明

✅ **已实现**:
- 不自动猜教材版本（必须人工选择）
- 不修改 `auto_meta_result` 内容（只写入 `resource_textbook_map` 表）
- `catalog_id` 一经绑定不可覆盖（已绑定的资源禁止重复绑定）
- SQL 使用参数化查询（防止 SQL 注入）
- 返回标准 JSON 格式

---

## 测试验证

### SQL 查询测试
- ✅ 待绑定资源查询正常
- ✅ 当前有 2 条待绑定资源（ID: 35, 36）

### 编译测试
- ✅ TypeScript 编译通过
- ✅ 无 lint 错误

---

## 使用流程

1. **获取待绑定资源列表**
   ```
   GET /api/admin/resources/unbound-catalog
   ```

2. **查看候选教材目录**
   - 查看每个资源的 `candidate_catalogs` 数组
   - 选择正确的教材版本

3. **执行绑定**
   ```
   POST /api/admin/resources/:id/bind-catalog
   Body: { "catalog_id": 2 }
   ```

4. **重复步骤 1-3** 直到所有资源绑定完成

---

## 注意事项

1. **权限控制**: 仅 `admin` 和 `editor` 角色可以调用
2. **幂等性**: 已绑定的资源禁止重复绑定
3. **数据完整性**: 绑定前会校验资源和教材目录是否存在
4. **日志记录**: 绑定记录写入 `resource_textbook_map` 表，`source` 字段为 `'manual'`

---

## 后续优化建议

1. **解绑接口**: 如需解绑，可以添加 `DELETE /api/admin/resources/:id/unbind-catalog` 接口
2. **批量绑定**: 可以添加批量绑定接口，提高效率
3. **绑定历史**: 可以添加绑定历史查询接口，查看资源的绑定记录

