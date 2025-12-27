# Catalog 任务接口文档

## 概述

Catalog 任务系统用于记录用户在教材目录页主动发起的行动（如"补充资源"、"整理单元"）。

---

## 一、接口列表

### 1. 创建任务

**接口路径：**
- `POST /api/tasks`

**权限：** 需要登录（authGuard）

**请求体：**
```json
{
  "task_type": "add_resources",  // 或 "organize_units"
  "catalog_id": 123,              // 教材目录ID（必填）
  "unit": "第一单元"               // 单元名称（可选，仅在 organize_units 时可能需要）
}
```

**请求参数说明：**
- `task_type` (必填): 任务类型
  - `"add_resources"`: 补充资源
  - `"organize_units"`: 整理单元
- `catalog_id` (必填): 教材目录ID，必须是有效的数字
- `unit` (可选): 单元名称，字符串类型

**响应示例：**
```json
{
  "success": true,
  "message": "任务创建成功",
  "data": {
    "id": 1,
    "task_type": "add_resources",
    "catalog_id": 123,
    "unit": null,
    "created_by": 6,
    "status": "pending",
    "created_at": "2024-12-27T12:00:00.000Z"
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "task_type 必须是 add_resources 或 organize_units",
  "error": "INVALID_TASK_TYPE"
}
```

---

### 2. 获取我的任务列表

**接口路径（支持多个别名）：**
- `GET /api/tasks/mine` ✅ 推荐
- `GET /api/tasks/my` ✅ 别名
- `GET /my/tasks` ✅ 别名（兼容前端可能使用的路径）

**权限：** 需要登录（authGuard）

**请求参数：** 无

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "task_type": "add_resources",
      "catalog_id": 123,
      "unit": null,
      "created_by": 6,
      "status": "pending",
      "created_at": "2024-12-27T12:00:00.000Z",
      "updated_at": "2024-12-27T12:00:00.000Z",
      "catalog_subject": "数学",
      "catalog_grade": "2",
      "catalog_volume": "下册",
      "catalog_textbook_version": "人教版"
    }
  ],
  "count": 1,
  "message": "成功获取 1 个待处理任务"
}
```

**响应字段说明：**
- `id`: 任务ID
- `task_type`: 任务类型（`add_resources` 或 `organize_units`）
- `catalog_id`: 教材目录ID
- `unit`: 单元名称（可选）
- `created_by`: 创建任务的用户ID
- `status`: 任务状态（`pending` / `completed` / `cancelled`）
- `created_at`: 创建时间
- `updated_at`: 更新时间
- `catalog_subject`: 教材学科（从 `textbook_catalog` 表关联获取）
- `catalog_grade`: 教材年级
- `catalog_volume`: 教材册别
- `catalog_textbook_version`: 教材版本

---

## 二、使用示例

### 2.1 创建"补充资源"任务

```bash
curl -X POST http://localhost:3333/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_type": "add_resources",
    "catalog_id": 123
  }'
```

### 2.2 创建"整理单元"任务

```bash
curl -X POST http://localhost:3333/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_type": "organize_units",
    "catalog_id": 123,
    "unit": "第一单元"
  }'
```

### 2.3 获取我的任务列表

```bash
# 使用推荐路径
curl -X GET http://localhost:3333/api/tasks/mine \
  -H "Authorization: Bearer YOUR_TOKEN"

# 或使用别名
curl -X GET http://localhost:3333/api/tasks/my \
  -H "Authorization: Bearer YOUR_TOKEN"

# 或使用不带 /api 前缀的路径
curl -X GET http://localhost:3333/my/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 三、前端集成示例

### 3.1 TypeScript 接口定义

```typescript
interface CatalogTask {
  id: number;
  task_type: 'add_resources' | 'organize_units';
  catalog_id: number;
  unit: string | null;
  created_by: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  catalog_subject?: string;
  catalog_grade?: string;
  catalog_volume?: string;
  catalog_textbook_version?: string;
}

interface CreateTaskRequest {
  task_type: 'add_resources' | 'organize_units';
  catalog_id: number;
  unit?: string;
}
```

### 3.2 创建任务

```typescript
async function createTask(request: CreateTaskRequest): Promise<CatalogTask> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '创建任务失败');
  }
  
  const result = await response.json();
  return result.data;
}
```

### 3.3 获取我的任务列表

```typescript
async function getMyTasks(): Promise<CatalogTask[]> {
  const response = await fetch('/api/tasks/mine', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '获取任务列表失败');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

## 四、注意事项

1. **任务状态**：新创建的任务默认状态为 `pending`（待处理）
2. **任务去重**：系统不自动去重，同一用户可以创建多个相同类型的任务
3. **权限控制**：所有接口都需要登录认证
4. **数据验证**：
   - `task_type` 必须是 `add_resources` 或 `organize_units`
   - `catalog_id` 必须是有效的数字
   - `unit` 是可选的字符串

---

## 五、错误码说明

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未授权，需要登录 |
| `INVALID_TASK_TYPE` | 无效的任务类型 |
| `INVALID_CATALOG_ID` | 无效的教材目录ID |
| `CATALOG_TASKS_TABLE_NOT_FOUND` | 数据库表不存在，需要执行迁移 |



