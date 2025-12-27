# 用户个人资料更新接口修复说明

## 🔍 问题分析

### 发现的问题

1. **路径不匹配**
   - 前端使用：`PATCH /user/profile`
   - 后端实际：`PATCH /users`
   - 结果：404 Not Found

2. **用户名/邮箱占用检查缺陷**
   - 问题：更新自己的用户名或邮箱时，如果名字/邮箱不变，会误判为"已被占用"
   - 原因：没有排除当前用户自己

3. **响应格式不完整**
   - 问题：更新后只返回数据库操作结果，没有返回更新后的用户信息
   - 影响：前端无法获取更新后的数据

## ✅ 修复内容

### 1. 添加兼容路由

在 `src/user/user.router.ts` 中添加了 `/user/profile` 路由，兼容前端：

```typescript
/**
 * 更新用户（兼容前端 /user/profile 路径）
 */
router.patch(
  '/user/profile',
  authGuard,
  validateUpdateUserData,
  userController.update,
);
```

### 2. 修复用户名/邮箱占用检查

在 `src/user/user.middleware.ts` 中修复了占用检查逻辑：

```typescript
// 修复前：没有排除当前用户
if (update.name) {
  const user = await userService.getUserByName(update.name);
  if (user) {
    return next(new Error('USER_ALREADY_EXIST'));
  }
}

// 修复后：排除当前用户
if (update.name) {
  const existingUser = await userService.getUserByName(update.name);
  if (existingUser && existingUser.id !== userId) {
    return next(new Error('USER_ALREADY_EXIST'));
  }
}
```

### 3. 改进响应格式

在 `src/user/user.controller.ts` 中，更新后返回完整的用户信息：

```typescript
// 修复前：只返回数据库操作结果
response.send(data);

// 修复后：返回更新后的用户信息
const updatedUser = await getUserById(id);
response.send({
  success: true,
  message: '更新成功',
  user: updatedUser,
});
```

## 📍 接口说明

### 更新用户信息

**路径**: `PATCH /users` 或 `PATCH /user/profile`（两者相同）

**认证**: 需要 JWT Token

**请求格式**:
```json
{
  "validate": {
    "password": "当前密码"  // 必填，用于验证身份
  },
  "update": {
    "name": "新用户名",      // 可选
    "email": "新邮箱",       // 可选
    "password": "新密码"     // 可选
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "message": "更新成功",
  "user": {
    "id": 2,
    "name": "新用户名",
    "email": "new@example.com",
    "role": "admin",
    "created_at": "2021-02-23T22:05:31.000Z",
    "updated_at": "2025-12-24T10:00:00.000Z",
    "avatar": null
  }
}
```

**错误响应**:

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| `PASSWORD_IS_REQUIRED` | 400 | 缺少当前密码验证 |
| `PASSWORD_DOES_NOT_MATCH` | 400 | 当前密码错误 |
| `USER_ALREADY_EXIST` | 409 | 用户名已被其他用户占用 |
| `EMAIL_ALREADY_EXIST` | 409 | 邮箱已被其他用户占用 |
| `PASSWORD_IS_THE_SAME` | 400 | 新密码与旧密码相同 |

## 🔧 使用示例

### 更新用户名和邮箱

```bash
curl -X PATCH http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "validate": {
      "password": "current_password"
    },
    "update": {
      "name": "new_username",
      "email": "new_email@example.com"
    }
  }'
```

### 只更新邮箱

```bash
curl -X PATCH http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "validate": {
      "password": "current_password"
    },
    "update": {
      "email": "new_email@example.com"
    }
  }'
```

### 只更新密码

```bash
curl -X PATCH http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "validate": {
      "password": "current_password"
    },
    "update": {
      "password": "new_password"
    }
  }'
```

## ✅ 修复验证

修复后的接口：

1. ✅ 支持 `/user/profile` 路径（兼容前端）
2. ✅ 允许用户更新自己的用户名/邮箱（不误判为占用）
3. ✅ 返回更新后的完整用户信息
4. ✅ 保持原有的安全验证（需要当前密码）

## 📝 注意事项

1. **必须提供当前密码**：`validate.password` 是必填的，用于安全验证
2. **用户名/邮箱唯一性**：如果新用户名/邮箱被其他用户占用，会返回错误
3. **密码加密**：如果更新密码，新密码会自动加密存储
4. **密码不能重复**：新密码不能与当前密码相同

