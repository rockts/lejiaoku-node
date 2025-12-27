# 用户登录和权限保护系统文档

## 概述

乐教库实现了最小可用的用户登录和权限保护系统，保护资源的写操作，保证读操作对所有人开放。

---

## 一、用户系统

### 1.1 用户表结构

**表名**：`user`

**字段说明**：
- `id` - 主键，自增
- `username` - 用户名（唯一，用于登录）
- `name` - 姓名（兼容旧字段）
- `password` - 密码（bcrypt hash）
- `email` - 邮箱（唯一，可选）
- `role` - 用户角色：`user`（普通用户）/ `editor`（编辑）/ `admin`（管理员）
- `nickname` - 昵称（可选）
- `avatar_url` - 头像URL（可选）
- `status` - 用户状态：`active`（激活）/ `disabled`（禁用）
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 1.2 用户角色

- **user**：普通用户，只能查看资源，不能进行写操作
- **editor**：编辑，可以创建和编辑资源
- **admin**：管理员，拥有所有权限，包括删除资源

### 1.3 默认注册

- 新用户注册时，默认角色为 `user`
- 默认状态为 `active`
- 注册时只能创建 `user` 角色，`editor` 和 `admin` 角色需要管理员分配

---

## 二、认证接口

### 2.1 POST /api/login

**功能**：用户登录

**请求参数**：
```json
{
  "username": "用户名",
  "password": "密码"
}
```

或者使用 email 登录：
```json
{
  "email": "user@example.com",
  "password": "密码"
}
```

**响应**：
```json
{
  "success": true,
  "message": "登录成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "用户名",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**Token Payload**：
```json
{
  "uid": 1,
  "role": "user"
}
```

**错误响应**：
- `401 Unauthorized` - 用户名/密码错误
- `400 Bad Request` - 缺少必填参数

---

### 2.2 POST /api/register

**功能**：用户注册

**请求参数**：
```json
{
  "username": "用户名",
  "password": "密码",
  "email": "user@example.com"  // 可选
}
```

**响应**：
```json
{
  "success": true,
  "message": "注册成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "用户名",
    "username": "用户名",
    "email": "user@example.com",
    "role": "user",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**错误响应**：
- `400 Bad Request` - 用户名已存在、邮箱已存在、角色无效等

**注意事项**：
- 密码使用 bcrypt 加密（salt rounds: 10）
- 注册时只能创建 `user` 角色
- 用户名和邮箱必须唯一

---

## 三、鉴权中间件

### 3.1 currentUser

**功能**：从请求头 `Authorization` 中提取并验证 JWT token，将用户信息注入 `request.user`

**使用位置**：全局中间件（在 `app/index.ts` 中注册）

**请求头格式**：
```
Authorization: Bearer <JWT_TOKEN>
```

**注入的用户信息**：
```typescript
request.user = {
  id: number,
  name?: string,
  email?: string,
  role: 'user' | 'editor' | 'admin'
}
```

**说明**：
- 如果 token 无效或不存在，`request.user` 为 `null`
- 不会抛出错误，让后续的 `authGuard` 处理

---

### 3.2 authGuard

**功能**：验证用户身份，确保用户已登录

**使用方式**：
```typescript
router.post('/api/resources', authGuard, controller);
```

**行为**：
- 检查 `request.user` 是否存在
- 如果不存在，返回 `401 Unauthorized`
- 如果存在，继续执行

**响应**：
```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

**日志**：
- 记录请求方法、路径和用户ID

---

### 3.3 roleGuard(roles: string[])

**功能**：验证用户角色，确保用户具有指定角色

**使用方式**：
```typescript
router.post('/api/resources', authGuard, roleGuard(['admin', 'editor']), controller);
```

**参数**：
- `roles` - 允许的角色数组，例如：`['admin', 'editor']`

**行为**：
- 必须在 `authGuard` 之后使用
- 检查 `request.user.role` 是否在 `roles` 数组中
- 如果不在，返回 `403 Forbidden`

**响应**：
```json
{
  "success": false,
  "message": "权限不足，禁止访问",
  "error": "FORBIDDEN"
}
```

**日志**：
- 记录请求方法、路径、用户ID、用户角色和所需角色

---

## 四、资源权限控制

### 4.1 写操作（需要权限）

以下接口需要登录并具有相应角色：

| 接口 | 方法 | 权限要求 |
|------|------|----------|
| 创建资源 | `POST /api/resources` | `admin`, `editor` |
| 更新资源 | `PUT /api/resources/:id` | `admin`, `editor` |
| 删除资源 | `DELETE /api/resources/:id` | `admin` |
| 自动解析资源 | `POST /api/resources/:id/auto-parse` | `admin`, `editor` |

**示例**：
```typescript
// 创建资源 - 需要 admin 或 editor 角色
router.post('/resources', 
  authGuard, 
  roleGuard(['admin', 'editor']), 
  controller
);

// 删除资源 - 需要 admin 角色
router.delete('/resources/:id', 
  authGuard, 
  roleGuard(['admin']), 
  controller
);
```

---

### 4.2 读操作（公开访问）

以下接口对所有人开放，无需登录：

| 接口 | 方法 | 说明 |
|------|------|------|
| 资源列表 | `GET /api/resources` | 公开 |
| 资源详情 | `GET /api/resources/:id` | 公开 |
| 下载资源 | `GET /api/resources/:id/download` | 公开 |

---

## 五、安全要求

### 5.1 未登录用户

- 禁止所有写操作
- 返回 `401 Unauthorized` 错误

### 5.2 标准错误码

- **401 Unauthorized**：未授权，需要登录
- **403 Forbidden**：权限不足，禁止访问

### 5.3 日志记录

所有权限验证都会记录日志，包含：
- 请求方法（GET/POST/PUT/DELETE）
- 请求路径
- 用户ID（UID）
- 用户角色
- 所需角色（如果使用 roleGuard）

**日志格式**：
```
[Auth] POST /api/resources - UID: 1
[RoleGuard] POST /api/resources - UID: 1, Role: editor, Required: [admin, editor]
```

---

## 六、测试用例

### 6.1 未登录访问写操作

**请求**：
```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title": "测试资源"}'
```

**预期响应**：
```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

**状态码**：`401`

---

### 6.2 user 角色访问 PUT

**请求**：
```bash
curl -X PUT http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "更新标题"}'
```

**预期响应**：
```json
{
  "success": false,
  "message": "权限不足，禁止访问",
  "error": "FORBIDDEN"
}
```

**状态码**：`403`

---

### 6.3 editor 角色访问 PUT

**请求**：
```bash
curl -X PUT http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer <EDITOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "更新标题"}'
```

**预期响应**：`200 OK`（如果资源存在且权限验证通过）

---

### 6.4 admin 删除资源

**请求**：
```bash
curl -X DELETE http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**预期响应**：`200 OK`（如果资源存在）

---

## 七、使用示例

### 7.1 前端登录

```javascript
// 登录
const response = await fetch('/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123',
  }),
});

const data = await response.json();
const token = data.token;

// 保存 token
localStorage.setItem('token', token);
```

### 7.2 前端请求（带 token）

```javascript
// 创建资源
const response = await fetch('/api/resources', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
  body: JSON.stringify({
    title: '新资源',
    category: '教案',
    // ... 其他字段
  }),
});

if (response.status === 401) {
  // 未授权，跳转到登录页
  window.location.href = '/login';
} else if (response.status === 403) {
  // 权限不足
  alert('权限不足，无法执行此操作');
}
```

---

## 八、注意事项

1. **Token 过期**：JWT token 默认 24 小时过期，过期后需要重新登录
2. **角色分配**：`editor` 和 `admin` 角色只能由管理员分配，不能通过注册获得
3. **密码安全**：密码使用 bcrypt 加密，salt rounds 为 10
4. **日志安全**：日志中不包含敏感信息（如密码），只记录用户ID和角色

---

## 九、更新日志

- **2025-01-XX**：实现最小可用的用户登录和权限保护系统
  - 添加用户表字段（username, nickname, avatar_url, status）
  - 实现 JWT token 认证
  - 实现 roleGuard 中间件
  - 为资源写操作添加权限保护
  - 保证读操作对所有人开放

