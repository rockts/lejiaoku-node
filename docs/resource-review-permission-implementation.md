# 资源审核权限功能实现总结

## 一、实现概述

本次实现完成了资源审核权限控制功能，确保只有 `editor` 和 `admin` 角色可以审核资源，`user` 角色无法访问审核接口。

---

## 二、权限控制

### 1. 审核接口权限

**接口**：`PATCH /api/admin/resources/:id/status`

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 仅允许 `editor` 和 `admin` 角色（`roleGuard(['admin', 'editor'])`）
- ❌ `user` 角色调用此接口将返回 `403 Forbidden`

**实现位置**：`src/resource/resource.router.ts` (第 96-100 行)

---

## 三、审核操作定义

### 1. 状态流转规则

**允许的状态流转**：
- `pending` → `approved`（通过审核）
- `pending` → `rejected`（拒绝审核）

**不允许的操作**：
- ❌ 非 `pending` 状态的资源不可再次审核
- ❌ `user` 角色无法执行审核操作

### 2. 状态验证

审核接口会严格验证：
1. 资源必须存在
2. 资源当前状态必须是 `pending`
3. 新状态只能是 `approved` 或 `rejected`

**实现位置**：`src/resource/resource.controller.ts` (第 556-642 行)

---

## 四、接口行为

### 1. 请求格式

**接口**：`PATCH /api/admin/resources/:id/status`

**请求头**：
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**请求参数**：
```json
{
  "status": "approved"  // 或 "rejected"
}
```

**路径参数**：
- `id` (number) - 资源ID

### 2. 响应格式

**成功响应**（200）：
```json
{
  "success": true,
  "message": "资源已通过审核",  // 或 "资源已拒绝审核"
  "resource": {
    "id": 1,
    "title": "资源标题",
    "status": "approved",
    "reviewed_by": 2,        // 审核人ID（如果数据库有该字段）
    "reviewed_at": "2024-12-25T00:00:00.000Z",  // 审核时间（如果数据库有该字段）
    // ... 其他字段
  }
}
```

**错误响应**：

**400 - 无效的状态值**：
```json
{
  "success": false,
  "message": "无效的状态值，只允许 approved 或 rejected",
  "error": "INVALID_STATUS"
}
```

**400 - 资源不是 pending 状态**：
```json
{
  "success": false,
  "message": "资源当前状态为 approved，只有 pending 状态的资源可以审核",
  "error": "RESOURCE_NOT_PENDING",
  "current_status": "approved"
}
```

**403 - 权限不足**：
```json
{
  "success": false,
  "message": "无权访问审核接口，仅 editor 和 admin 可以审核资源",
  "error": "FORBIDDEN"
}
```

**404 - 资源不存在**：
```json
{
  "success": false,
  "message": "资源不存在",
  "error": "RESOURCE_NOT_FOUND"
}
```

---

## 五、审计字段支持

### 1. 字段说明

如果数据库中存在以下字段，系统会自动记录审核信息：
- `reviewed_by` (INT) - 审核人ID
- `reviewed_at` (TIMESTAMP) - 审核时间

### 2. 字段添加（可选）

如果需要添加审核字段，可以运行迁移脚本：

```bash
mysql -u用户名 -p数据库名 < scripts/add-resource-review-fields.sql
```

**迁移脚本位置**：`scripts/add-resource-review-fields.sql`

### 3. 兼容性

- ✅ 如果数据库有 `reviewed_by` 和 `reviewed_at` 字段，系统会自动使用
- ✅ 如果数据库没有这些字段，系统会正常 work，只是不记录审核人信息
- ✅ 代码会自动检测字段是否存在，无需手动配置

**实现位置**：
- `src/resource/resource.service.ts` (第 192-240 行) - 更新状态时自动记录审核人
- `src/resource/resource.service.ts` (第 146-210 行) - 查询时自动包含审核信息

---

## 六、代码修改总结

### 1. 路由层 (`src/resource/resource.router.ts`)

**修改内容**：
- 添加 `authGuard` 中间件（需要登录）
- 添加 `roleGuard(['admin', 'editor'])` 中间件（仅允许 admin 和 editor）

```typescript
router.patch(
  '/admin/resources/:id/status',
  authGuard, // 需要登录
  roleGuard(['admin', 'editor']), // 仅允许 admin 或 editor 角色
  resourceController.updateStatus,
);
```

### 2. 控制器层 (`src/resource/resource.controller.ts`)

**修改内容**：
- 添加权限验证（双重检查）
- 添加资源状态验证（必须是 pending）
- 添加状态值验证（只能是 approved 或 rejected）
- 改进错误处理和响应格式

### 3. 服务层 (`src/resource/resource.service.ts`)

**修改内容**：
- `updateResourceStatus` 函数支持记录审核人信息
- `getResourceByIdForAdmin` 函数支持查询审核信息
- 自动检测字段是否存在，提供向后兼容

### 4. 模型层 (`src/resource/resource.model.ts`)

**修改内容**：
- 添加 `reviewed_by?: number` 字段
- 添加 `reviewed_at?: Date` 字段
- 更新 `status` 字段注释

---

## 七、使用示例

### 1. 审核通过资源

```bash
curl -X PATCH http://localhost:3333/api/admin/resources/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

### 2. 审核拒绝资源

```bash
curl -X PATCH http://localhost:3333/api/admin/resources/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected"
  }'
```

### 3. user 角色尝试审核（会失败）

```bash
curl -X PATCH http://localhost:3333/api/admin/resources/1/status \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

**响应**：
```json
{
  "success": false,
  "message": "权限不足，禁止访问",
  "error": "FORBIDDEN"
}
```

---

## 八、测试场景

### 1. 权限测试
- ✅ `admin` 角色可以审核资源
- ✅ `editor` 角色可以审核资源
- ❌ `user` 角色无法访问审核接口（返回 403）

### 2. 状态流转测试
- ✅ `pending` → `approved` 成功
- ✅ `pending` → `rejected` 成功
- ❌ `approved` → `approved` 失败（资源不是 pending）
- ❌ `rejected` → `approved` 失败（资源不是 pending）

### 3. 错误处理测试
- ✅ 资源不存在返回 404
- ✅ 无效状态值返回 400
- ✅ 非 pending 状态返回 400

---

## 九、注意事项

1. **状态流转严格性**：
   - 只有 `pending` 状态的资源可以审核
   - 已审核的资源（`approved` 或 `rejected`）不能再次审核

2. **权限控制**：
   - 路由层和控制器层都有权限验证（双重检查）
   - `user` 角色无法绕过权限检查

3. **审计字段**：
   - `reviewed_by` 和 `reviewed_at` 字段是可选的
   - 如果数据库没有这些字段，系统仍然可以正常工作
   - 建议添加这些字段以便审计

4. **不影响已发布资源**：
   - 只影响 `pending` 状态的资源
   - 已审核的资源不会被影响

---

## 十、完成标准检查

- ✅ `editor` / `admin` 可审核
- ✅ `user` 无法访问审核接口（返回 403）
- ✅ 状态流转严格（只有 pending 可以审核）
- ✅ 不修改角色定义
- ✅ 不引入新状态
- ✅ 不影响已发布资源

---

*最后更新：2024-12-25*

