# 登录与权限控制系统实现总结

## 一、实现概述

本次实现完成了生产可用的登录与权限控制系统，在不破坏现有 Resource API 的前提下，实现了用户注册/登录、JWT 鉴权和资源级别的编辑/删除权限控制。

---

## 二、用户模型

### 数据库表结构

`user` 表包含以下字段：
- `id`: 主键
- `username`: 用户名（唯一，用于登录）
- `password`: 密码（使用 bcrypt 加密存储）
- `role`: 用户角色，ENUM('admin', 'editor', 'user')，默认 'user'
- `created_at`: 创建时间

**位置**：`src/user/user.model.ts`

---

## 三、认证接口

### 1. POST /api/login

**功能**：用户登录

**请求参数**：
```json
{
  "username": "string",  // 或 "email": "string"
  "password": "string"
}
```

**响应格式**：
```json
{
  "success": true,
  "message": "登录成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "用户名",
    "email": "email@example.com",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "avatar": null
  }
}
```

**实现位置**：
- 路由：`src/auth/auth.router.ts` (第 26 行)
- 控制器：`src/auth/auth.controller.ts` (第 11-53 行)
- 中间件：`src/auth/auth.middleware.ts` (第 12-45 行)

---

### 2. POST /api/register

**功能**：用户注册

**请求参数**：
```json
{
  "username": "string",  // 或 "name": "string"
  "password": "string",
  "email": "string"  // 可选
}
```

**响应格式**：
```json
{
  "success": true,
  "message": "注册成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "用户名",
    "email": "email@example.com",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "avatar": null
  }
}
```

**说明**：
- 注册时默认 `role = 'user'`
- 密码使用 bcrypt 加密（salt rounds >= 10）
- 用户名必须唯一

**实现位置**：
- 路由：`src/auth/auth.router.ts` (第 14-19 行)
- 控制器：`src/auth/auth.controller.register.ts` (第 17-88 行)
- 中间件：`src/user/user.middleware.ts` (验证和密码加密)

---

## 四、鉴权中间件

### 1. currentUser 中间件

**功能**：从请求头 `Authorization: Bearer <token>` 中提取并验证 JWT token，将用户信息注入 `req.user`

**使用方式**：
```typescript
app.use(currentUser);  // 全局中间件，所有请求都会执行
```

**注入的用户信息**：
```typescript
request.user = {
  id: number,
  name?: string,
  email?: string,
  role: 'admin' | 'editor' | 'user'
}
```

**实现位置**：`src/auth/auth.middleware.ts` (第 78-136 行)

---

### 2. authGuard 中间件

**功能**：验证用户是否已登录，未登录返回 401

**使用方式**：
```typescript
router.post('/resources', authGuard, controller);
```

**响应格式（未登录）**：
```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

**实现位置**：`src/auth/auth.middleware.ts` (第 51-72 行)

---

## 五、资源权限规则

### 1. 创建资源

**接口**：`POST /api/resources`

**权限要求**：
- ✅ 必须登录（任何已登录用户都可以创建资源）
- ✅ 自动写入 `resource.user_id = req.user.id`

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 71-78 行)
- 控制器：`src/resource/resource.controller.ts` (第 269-489 行)

**修改说明**：
- 移除了 `roleGuard(['admin', 'editor'])`，现在任何已登录用户都可以创建资源
- 创建资源时自动设置 `user_id` 字段（第 423 行）

---

### 2. 编辑资源

**接口**：`PUT /api/resources/:id`

**权限要求**：
- ✅ 必须登录
- ✅ 允许条件（满足其一即可）：
  - `req.user.role === 'admin'`
  - `req.user.role === 'editor'`
  - `resource.user_id === req.user.id`（资源所有者）

**权限不足时返回**：
```json
{
  "success": false,
  "message": "无权操作此资源",
  "error": "FORBIDDEN"
}
```

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 108-114 行)
- 权限中间件：`src/resource/resource.permission.middleware.ts` (第 19-83 行)
- 控制器：`src/resource/resource.controller.update.ts` (第 16-112 行)

**修改说明**：
- 移除了 `roleGuard(['admin', 'editor'])`，改为使用 `resourcePermissionGuard`
- `resourcePermissionGuard` 现在允许 admin、editor 或资源所有者编辑资源

---

### 3. 删除资源

**接口**：`DELETE /api/resources/:id`

**权限要求**：
- ✅ 必须登录
- ✅ 允许条件：
  - `req.user.role === 'admin'`：可删除任何资源
  - `resource.user_id === req.user.id`：user/editor 只能删除自己的资源

**权限不足时返回**：
```json
{
  "success": false,
  "message": "无权操作此资源",
  "error": "FORBIDDEN"
}
```

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 121-126 行)
- 权限中间件：`src/resource/resource.permission.middleware.ts` (第 19-83 行)
- 控制器：`src/resource/resource.controller.delete.ts` (第 15-74 行)

**修改说明**：
- 移除了 `roleGuard(['admin'])`，改为使用 `resourcePermissionGuard`
- `resourcePermissionGuard` 现在允许 admin 删除任何资源，user/editor 只能删除自己的资源

---

## 六、保持兼容性

### GET 接口无需登录

以下接口保持无需登录即可访问：

1. **GET /api/resources** - 资源列表
2. **GET /api/resources/:id** - 资源详情
3. **GET /api/resources/:id/download** - 下载资源文件

**实现位置**：`src/resource/resource.router.ts` (第 15-20 行, 第 35-38 行, 第 62-65 行)

---

## 七、权限判断逻辑总结

### resourcePermissionGuard 中间件

**位置**：`src/resource/resource.permission.middleware.ts`

**权限判断逻辑**：

#### 编辑资源（PUT）
```typescript
if (userRole === 'admin' || userRole === 'editor' || isOwner) {
  // 允许编辑
}
```

#### 删除资源（DELETE）
```typescript
if (userRole === 'admin') {
  // admin 可删除任何资源
} else if (isOwner) {
  // user/editor 只能删除自己的资源
}
```

---

## 八、关键代码位置

### 认证相关
- **登录接口**：`src/auth/auth.router.ts` (第 26 行)
- **注册接口**：`src/auth/auth.router.ts` (第 14-19 行)
- **JWT 签发**：`src/auth/auth.service.ts` (第 12-24 行)
- **JWT 验证**：`src/auth/auth.middleware.ts` (第 78-136 行)
- **登录验证**：`src/auth/auth.middleware.ts` (第 12-45 行)

### 权限控制相关
- **资源权限中间件**：`src/resource/resource.permission.middleware.ts`
- **资源路由配置**：`src/resource/resource.router.ts`
- **资源创建**：`src/resource/resource.controller.ts` (第 269-489 行)
- **资源编辑**：`src/resource/resource.controller.update.ts`
- **资源删除**：`src/resource/resource.controller.delete.ts`

### 用户模型
- **用户模型定义**：`src/user/user.model.ts`
- **用户服务**：`src/user/user.service.ts`

---

## 九、标准错误响应格式

### 401 Unauthorized（未授权）
```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

### 403 Forbidden（权限不足）
```json
{
  "success": false,
  "message": "无权操作此资源",
  "error": "FORBIDDEN"
}
```

### 404 Not Found（资源不存在）
```json
{
  "success": false,
  "message": "资源不存在",
  "error": "RESOURCE_NOT_FOUND"
}
```

---

## 十、使用示例

### 1. 用户注册
```bash
curl -X POST http://localhost:3333/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com"
  }'
```

### 2. 用户登录
```bash
curl -X POST http://localhost:3333/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. 创建资源（需要登录）
```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试资源",
    "category": "课件",
    "file_url": "/uploads/resources/test.pdf",
    "file_format": "PDF"
  }'
```

### 4. 编辑资源（需要权限）
```bash
curl -X PUT http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

### 5. 删除资源（需要权限）
```bash
curl -X DELETE http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 十一、测试建议

1. **测试用户注册**：验证用户名唯一性、密码加密
2. **测试用户登录**：验证 JWT token 生成和返回
3. **测试资源创建**：验证 `user_id` 自动写入
4. **测试资源编辑**：验证 admin、editor、owner 权限
5. **测试资源删除**：验证 admin 和 owner 权限
6. **测试 GET 接口**：验证无需登录即可访问

---

## 十二、注意事项

1. **JWT Token 格式**：使用 `Authorization: Bearer <token>` 格式
2. **Token 过期时间**：24 小时（可在 `src/auth/auth.service.ts` 中修改）
3. **密码加密**：使用 bcrypt，salt rounds >= 10
4. **权限验证顺序**：`authGuard` → `resourcePermissionGuard` → Controller
5. **GET 接口兼容性**：所有 GET 接口保持无需登录，确保向后兼容

---

*最后更新：2024-12-25*

