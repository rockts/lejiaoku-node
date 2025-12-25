# User API 完整文档

## 概述

本文档描述了乐教库用户管理系统的完整 API 接口，包括用户注册、登录、查询、更新和删除等功能。

---

## 一、用户表字段说明

### 数据库字段

| 字段名        | 类型         | 说明                        | 可更新 | 可创建          |
| ------------- | ------------ | --------------------------- | ------ | --------------- |
| `id`          | INT          | 主键，自增                  | ❌      | ❌ (自动生成)    |
| `name`        | VARCHAR(255) | 姓名（唯一）                | ✅      | ✅               |
| `username`    | VARCHAR(50)  | 用户名（唯一，用于登录）    | ❌      | ✅               |
| `nickname`    | VARCHAR(100) | 昵称                        | ✅      | ❌               |
| `avatar_url`  | VARCHAR(500) | 头像URL                     | ✅      | ❌               |
| `description` | TEXT         | 个人介绍                    | ✅      | ❌               |
| `password`    | VARCHAR(255) | 密码（bcrypt加密）          | ✅      | ✅               |
| `email`       | CHAR(100)    | 邮箱（唯一）                | ✅      | ✅               |
| `role`        | VARCHAR(50)  | 用户角色：user/editor/admin | ❌      | ✅ (默认 user)   |
| `status`      | ENUM         | 用户状态：active/disabled   | ❌      | ✅ (默认 active) |
| `created_at`  | TIMESTAMP    | 创建时间                    | ❌      | ❌ (自动生成)    |
| `updated_at`  | TIMESTAMP    | 更新时间                    | ❌      | ❌ (自动更新)    |

---

## 二、认证相关接口

### 1. 用户注册

**接口**：`POST /register`

**说明**：注册新用户，默认角色为 `user`，状态为 `active`

**请求参数**：
```json
{
  "username": "string",  // 或 "name": "string"
  "password": "string",
  "email": "string"      // 可选
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "注册成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "username",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**：
- `400` - 缺少必填字段
- `409` - 用户名或邮箱已存在

---

### 2. 用户登录

**接口**：`POST /login`

**说明**：用户登录，支持用户名或邮箱登录

**请求参数**：
```json
{
  "username": "string",  // 或 "email": "string"
  "password": "string"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "登录成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "username",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**：
- `401` - 用户名或密码错误

---

## 三、用户查询接口

### 1. 获取用户列表

**接口**：`GET /users/`

**说明**：获取所有用户列表（不包含密码）

**权限**：无需登录

**响应示例**：
```json
[
  {
    "id": 1,
    "name": "username",
    "username": "username",
    "email": "user@example.com",
    "role": "user",
    "nickname": null,
    "avatar_url": null,
    "description": "个人介绍",
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "avatar": 1
  }
]
```

**响应头**：
- `X-Total-Count`: 用户总数

---

### 2. 获取单个用户信息

**接口**：`GET /users/:userId`

**说明**：根据用户ID获取用户详细信息（不包含密码）

**权限**：无需登录

**路径参数**：
- `userId` (number) - 用户ID

**响应示例**：
```json
{
  "id": 1,
  "name": "username",
  "username": "username",
  "email": "user@example.com",
  "role": "user",
  "nickname": null,
  "avatar_url": null,
  "description": "个人介绍",
  "status": "active",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "avatar": 1
}
```

**错误响应**：
- `404` - 用户不存在

---

### 3. 获取当前用户信息

**接口**：`GET /user`

**说明**：获取当前登录用户的信息

**权限**：需要登录（通过 `currentUser` 中间件）

**请求头**：
```
Authorization: Bearer <JWT_TOKEN>
```

**响应示例**：
```json
{
  "id": 1,
  "name": "username",
  "email": "user@example.com",
  "role": "user"
}
```

---

## 四、用户更新接口

### 1. 更新当前用户信息

**接口**：`PATCH /users` 或 `PATCH /user/profile` 或 `PUT /user/profile`

**说明**：更新当前登录用户的信息

**权限**：需要登录

**请求头**：
```
Authorization: Bearer <JWT_TOKEN>
```

**可更新字段**：
- `name` - 姓名（需要验证唯一性）
- `email` - 邮箱（需要验证唯一性）
- `password` - 密码（需要提供当前密码验证）
- `description` - 个人介绍
- `nickname` - 昵称
- `avatar_url` - 头像URL

**请求参数**（方式1：使用 update 字段）：
```json
{
  "update": {
    "name": "新姓名",
    "email": "newemail@example.com",
    "description": "新的个人介绍",
    "nickname": "新昵称",
    "avatar_url": "/uploads/avatar/xxx.jpg"
  }
}
```

**请求参数**（方式2：直接提供字段，自动包裹）：
```json
{
  "name": "新姓名",
  "email": "newemail@example.com",
  "description": "新的个人介绍"
}
```

**更新密码**（需要提供当前密码验证）：
```json
{
  "validate": {
    "password": "当前密码"
  },
  "update": {
    "password": "新密码"
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "更新成功",
  "user": {
    "id": 1,
    "name": "新姓名",
    "username": "username",
    "email": "newemail@example.com",
    "role": "user",
    "nickname": "新昵称",
    "avatar_url": "/uploads/avatar/xxx.jpg",
    "description": "新的个人介绍",
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应**：
- `400` - 没有提供要更新的字段
- `401` - 未授权（未登录）
- `400` - 修改密码时需要提供当前密码
- `400` - 当前密码错误
- `400` - 新密码与当前密码相同
- `409` - 用户名或邮箱已被占用

---

## 五、用户删除接口

### 1. 删除用户

**接口**：`DELETE /users/:userId`

**说明**：删除指定用户

**权限**：需要登录

**请求头**：
```
Authorization: Bearer <JWT_TOKEN>
```

**路径参数**：
- `userId` (number) - 要删除的用户ID

**响应示例**：
```json
{
  "affectedRows": 1
}
```

**错误响应**：
- `401` - 未授权（未登录）
- `404` - 用户不存在

---

## 六、字段操作权限总结

### 可创建字段（注册时）
- ✅ `name` / `username` - 必填
- ✅ `password` - 必填
- ✅ `email` - 可选
- ✅ `role` - 自动设置为 `user`（注册时不能设置其他角色）
- ✅ `status` - 自动设置为 `active`

### 可查询字段（所有查询接口）
- ✅ `id` - 用户ID
- ✅ `name` - 姓名
- ✅ `username` - 用户名
- ✅ `email` - 邮箱
- ✅ `role` - 角色
- ✅ `nickname` - 昵称
- ✅ `avatar_url` - 头像URL
- ✅ `description` - 个人介绍
- ✅ `status` - 状态
- ✅ `created_at` - 创建时间
- ✅ `updated_at` - 更新时间
- ❌ `password` - 密码（不返回）

### 可更新字段（更新接口）
- ✅ `name` - 姓名（需要验证唯一性）
- ✅ `email` - 邮箱（需要验证唯一性）
- ✅ `password` - 密码（需要当前密码验证）
- ✅ `description` - 个人介绍
- ✅ `nickname` - 昵称
- ✅ `avatar_url` - 头像URL
- ❌ `username` - 用户名（不可更新）
- ❌ `role` - 角色（不可更新，需要管理员权限）
- ❌ `status` - 状态（不可更新，需要管理员权限）

### 不可操作字段
- ❌ `id` - 主键（自动生成）
- ❌ `created_at` - 创建时间（自动生成）
- ❌ `updated_at` - 更新时间（自动更新）

---

## 七、使用示例

### 1. 注册新用户
```bash
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "email": "newuser@example.com"
  }'
```

### 2. 用户登录
```bash
curl -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123"
  }'
```

### 3. 获取用户列表
```bash
curl -X GET http://localhost:3333/users/
```

### 4. 获取单个用户
```bash
curl -X GET http://localhost:3333/users/1
```

### 5. 更新用户信息
```bash
curl -X PATCH http://localhost:3333/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "update": {
      "name": "新姓名",
      "description": "这是我的个人介绍",
      "nickname": "新昵称",
      "avatar_url": "/uploads/avatar/xxx.jpg"
    }
  }'
```

### 6. 更新密码
```bash
curl -X PATCH http://localhost:3333/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "validate": {
      "password": "当前密码"
    },
    "update": {
      "password": "新密码"
    }
  }'
```

### 7. 删除用户
```bash
curl -X DELETE http://localhost:3333/users/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 八、注意事项

1. **密码安全**：
   - 密码使用 bcrypt 加密存储（salt rounds = 10）
   - 修改密码需要提供当前密码进行验证
   - 新密码不能与当前密码相同

2. **唯一性验证**：
   - `name` 字段必须唯一
   - `username` 字段必须唯一
   - `email` 字段必须唯一
   - 更新时如果修改这些字段，会验证是否与其他用户冲突

3. **角色和状态**：
   - 注册时只能创建 `user` 角色
   - `role` 和 `status` 字段需要通过管理员接口或数据库直接修改
   - 普通用户无法修改自己的角色和状态

4. **字段限制**：
   - `username` 创建后不可修改
   - `id`、`created_at`、`updated_at` 由系统自动管理

---

## 九、错误码说明

| 错误码                         | 说明                 |
| ------------------------------ | -------------------- |
| `USERNAME_OR_NAME_IS_REQUIRED` | 缺少用户名或姓名     |
| `PASSWORD_IS_REQUIRED`         | 缺少密码             |
| `USERNAME_ALREADY_EXIST`       | 用户名已存在         |
| `EMAIL_ALREADY_EXIST`          | 邮箱已存在           |
| `USER_DOES_NOT_EXIST`          | 用户不存在           |
| `PASSWORD_DOES_NOT_MATCH`      | 密码错误             |
| `UPDATE_DATA_REQUIRED`         | 缺少更新数据         |
| `NO_UPDATE_FIELDS`             | 没有提供要更新的字段 |
| `PASSWORD_IS_THE_SAME`         | 新密码与当前密码相同 |
| `USER_NOT_FOUND`               | 用户未找到           |
| `UNAUTHORIZED`                 | 未授权（未登录）     |

---

*最后更新：2024-12-25*

