# 资源教材目录人工绑定 API 文档

## 概述

提供两个接口用于人工绑定资源到教材目录，解决因 `auto_meta_result.textbook_version` 为 NULL 导致无法自动绑定的问题。

**权限要求**：仅 `admin` 和 `editor` 角色可以调用

---

## 接口 1：获取待人工绑定的资源列表

### 请求

```
GET /api/admin/resources/unbound-catalog
```

**Headers:**
```
Authorization: Bearer <token>
```

**权限**：`admin` / `editor`

### 返回条件

- `resource.auto_meta_result IS NOT NULL`
- 未绑定到任何教材目录（`resource_textbook_map` 中无记录）
- `auto_meta_result` 中 `subject` / `grade_number` / `volume` 存在

### 响应示例

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
        },
        {
          "id": 6,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "北师大版",
          "volume": "下册"
        },
        {
          "id": 8,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "外研版",
          "volume": "下册"
        },
        {
          "id": 10,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "沪教版",
          "volume": "下册"
        },
        {
          "id": 12,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "冀教版",
          "volume": "下册"
        },
        {
          "id": 14,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "浙教版",
          "volume": "下册"
        },
        {
          "id": 16,
          "education_level": "elementary",
          "grade": "1",
          "subject": "语文",
          "textbook_version": "湘教版",
          "volume": "下册"
        }
      ]
    },
    {
      "resource_id": 36,
      "title": "语文二年级下册",
      "subject": "语文",
      "grade": "二年级",
      "volume": "下册",
      "textbook_version": null,
      "candidate_catalogs": [
        {
          "id": 130,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "人教版",
          "volume": "下册"
        },
        {
          "id": 132,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "苏教版",
          "volume": "下册"
        },
        {
          "id": 134,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "北师大版",
          "volume": "下册"
        },
        {
          "id": 136,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "外研版",
          "volume": "下册"
        },
        {
          "id": 138,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "沪教版",
          "volume": "下册"
        },
        {
          "id": 140,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "冀教版",
          "volume": "下册"
        },
        {
          "id": 142,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "浙教版",
          "volume": "下册"
        },
        {
          "id": 144,
          "education_level": "elementary",
          "grade": "2",
          "subject": "语文",
          "textbook_version": "湘教版",
          "volume": "下册"
        }
      ]
    }
  ],
  "count": 2
}
```

### 字段说明

- `resource_id`: 资源ID
- `title`: 资源标题
- `subject`: 学科（来自 `auto_meta_result`）
- `grade`: 年级文本（如："一年级"）
- `volume`: 册别（"上册" / "下册"）
- `textbook_version`: 教材版本（可能为 `null`）
- `candidate_catalogs`: 候选教材目录数组
  - `id`: 教材目录ID
  - `education_level`: 学段（"elementary" / "junior"）
  - `grade`: 年级数字（"1" / "2" 等）
  - `subject`: 学科
  - `textbook_version`: 教材版本
  - `volume`: 册别

---

## 接口 2：人工绑定教材目录

### 请求

```
POST /api/admin/resources/:id/bind-catalog
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**权限**：`admin` / `editor`

**Path Parameters:**
- `id`: 资源ID

**Request Body:**
```json
{
  "catalog_id": 2
}
```

### 响应示例

#### 成功响应

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

#### 错误响应

**资源不存在**
```json
{
  "success": false,
  "message": "资源不存在",
  "error": "BIND_FAILED"
}
```

**教材目录不存在**
```json
{
  "success": false,
  "message": "教材目录不存在",
  "error": "BIND_FAILED"
}
```

**资源已绑定**
```json
{
  "success": false,
  "message": "资源已绑定到教材目录，禁止重复绑定",
  "error": "BIND_FAILED"
}
```

**无效参数**
```json
{
  "success": false,
  "message": "无效的资源ID",
  "error": "INVALID_RESOURCE_ID"
}
```

```json
{
  "success": false,
  "message": "无效的教材目录ID",
  "error": "INVALID_CATALOG_ID"
}
```

### 行为说明

1. **校验资源是否存在**
2. **校验教材目录是否存在**
3. **检查是否已绑定**（幂等性：已绑定的资源禁止重复绑定）
4. **写入绑定记录**到 `resource_textbook_map` 表
   - `source` 字段设置为 `'manual'`（人工绑定）
   - `created_at` 自动记录时间

---

## SQL 查询说明

### 获取待绑定资源列表

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

### 获取候选教材目录

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

### 绑定资源到教材目录

```sql
INSERT INTO resource_textbook_map 
  (resource_id, textbook_catalog_id, source, created_at)
VALUES (?, ?, 'manual', CURRENT_TIMESTAMP)
```

---

## 约束说明

1. **不自动猜教材版本**：必须人工选择
2. **不修改 auto_meta_result 内容**：只写入 `resource_textbook_map` 表
3. **catalog_id 一经绑定不可覆盖**：已绑定的资源禁止重复绑定（如需解绑，需要单独的接口）
4. **SQL 使用参数化查询**：防止 SQL 注入
5. **返回标准 JSON 格式**：统一的响应格式

---

## 使用流程

1. 调用 `GET /api/admin/resources/unbound-catalog` 获取待绑定资源列表
2. 查看每个资源的 `candidate_catalogs`，选择正确的教材版本
3. 调用 `POST /api/admin/resources/:id/bind-catalog` 进行绑定
4. 重复步骤 1-3 直到所有资源绑定完成

