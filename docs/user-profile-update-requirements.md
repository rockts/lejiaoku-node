# 用户资料更新接口说明（已优化）

## ✅ 更新后的逻辑

**仅在修改密码时才需要提供当前密码验证**

- ✅ 修改用户名/邮箱：**不需要**当前密码，只需要 Token
- ✅ 修改密码：**需要**当前密码验证（`validate.password`）

## 📋 请求格式

### 1. 只更新用户名或邮箱（不需要密码）

```json
{
  "update": {
    "name": "新用户名"
  }
}
```

或

```json
{
  "update": {
    "email": "new@example.com"
  }
}
```

### 2. 修改密码（需要当前密码）

```json
{
  "validate": {
    "password": "当前密码"  // ⚠️ 修改密码时必须提供
  },
  "update": {
    "password": "新密码"
  }
}
```

### 3. 同时更新多个字段

```json
{
  "validate": {
    "password": "当前密码"  // 如果 update.password 存在，则必填
  },
  "update": {
    "name": "新用户名",
    "email": "new@example.com",
    "password": "新密码"    // 如果存在此字段，validate.password 必填
  }
}
```

## 🔧 接口说明

**路径**: `PUT /user/profile` 或 `PATCH /user/profile`

**认证**: 需要 JWT Token（Bearer Token）

**请求格式**:

| 场景 | validate.password | update 字段 |
|------|------------------|------------|
| 只修改用户名 | ❌ 不需要 | `{ name: "新用户名" }` |
| 只修改邮箱 | ❌ 不需要 | `{ email: "新邮箱" }` |
| 修改密码 | ✅ **必填** | `{ password: "新密码" }` |
| 同时修改多个字段（包含密码） | ✅ **必填** | `{ name, email, password }` |
| 同时修改多个字段（不包含密码） | ❌ 不需要 | `{ name, email }` |

## ✅ 响应格式

成功响应：

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
    "updated_at": "2025-12-24T15:00:00.000Z",
    "avatar": null
  }
}
```

## ❌ 错误响应

| 错误信息 | HTTP状态码 | 原因 |
|---------|-----------|------|
| "请提供用户密码" | 400 | 修改密码时未提供 `validate.password` |
| "用户名或密码错误" | 400 | `validate.password` 不正确 |
| "用户名已被占用" | 409 | 新用户名已被其他用户使用 |
| "邮箱已被占用" | 409 | 新邮箱已被其他用户使用 |
| "要修改的密码不能与原密码一样" | 400 | 新密码与当前密码相同 |

## 💡 使用示例

### 示例 1: 只更新用户名（不需要密码）

```bash
curl -X PUT http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "update": {
      "name": "new_username"
    }
  }'
```

### 示例 2: 只更新邮箱（不需要密码）

```bash
curl -X PUT http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "update": {
      "email": "new@example.com"
    }
  }'
```

### 示例 3: 修改密码（需要当前密码）

```bash
curl -X PUT http://localhost:3333/user/profile \
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

### 示例 4: 同时更新用户名和邮箱（不需要密码）

```bash
curl -X PUT http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "update": {
      "name": "new_username",
      "email": "new@example.com"
    }
  }'
```

## 🔐 安全说明

1. **Token 验证**：所有请求都需要有效的 JWT Token
2. **密码修改保护**：修改密码时需要提供当前密码，防止 Token 泄露导致密码被恶意修改
3. **用户名/邮箱唯一性**：系统会检查用户名和邮箱是否已被其他用户占用
4. **密码加密**：新密码会自动使用 bcrypt 加密存储

## 📝 变更历史

- **2025-12-24**: 优化为仅在修改密码时才要求当前密码，修改用户名/邮箱时不需要密码

