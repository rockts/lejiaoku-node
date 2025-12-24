# 用户资料更新密码要求说明

## 🔐 当前设计要求

更新用户资料时，**必须提供当前密码**作为身份验证，这是一个安全措施。

### 为什么需要密码？

1. **安全验证**：确保只有知道密码的用户才能修改个人信息
2. **防止未授权修改**：即使 Token 被泄露，也需要密码才能修改
3. **双重验证**：Token + 密码双重保护

## 📋 请求格式

更新用户资料时必须提供以下格式：

```json
{
  "validate": {
    "password": "当前密码"  // ⚠️ 必填
  },
  "update": {
    "name": "新用户名",      // 可选
    "email": "新邮箱",       // 可选
    "password": "新密码"     // 可选（如果要修改密码）
  }
}
```

## 🎯 前端实现建议

前端表单需要包含：

1. **当前密码输入框**（必填）
   - 用于 `validate.password`
   - 用于身份验证

2. **用户名输入框**（可选）
   - 用于 `update.name`

3. **邮箱输入框**（可选）
   - 用于 `update.email`

4. **新密码输入框**（可选，仅在需要修改密码时）
   - 用于 `update.password`

### 前端示例代码结构

```javascript
// 表单数据
const formData = {
  validate: {
    password: '' // 当前密码（必填）
  },
  update: {
    name: '',    // 新用户名（可选）
    email: '',   // 新邮箱（可选）
    password: '' // 新密码（可选）
  }
};

// 提交时
await api.put('/user/profile', formData);
```

## ⚠️ 如果不想每次都输入密码

如果业务需求是：**仅修改用户名/邮箱时不需要密码，只有修改密码时才需要密码**，可以调整后端逻辑。

### 方案：仅在修改密码时要求当前密码

修改 `src/user/user.middleware.ts` 中的 `validateUpdateUserData`：

```typescript
// 当前逻辑：总是要求密码
if (!_.has(validate, 'password')) {
  return next(new Error('PASSWORD_IS_REQUIRED'));
}

// 可选：仅在修改密码时要求密码
if (update.password) {
  // 修改密码时，必须提供当前密码验证
  if (!_.has(validate, 'password')) {
    return next(new Error('PASSWORD_IS_REQUIRED'));
  }
  // 验证当前密码...
} else {
  // 只修改用户名/邮箱时，不需要密码验证
  // 只验证 Token 即可（已通过 authGuard）
}
```

## ✅ 当前设计（推荐）

保持当前设计（总是要求密码）的优势：
- ✅ 更高的安全性
- ✅ 防止 Token 泄露导致的信息修改
- ✅ 符合多数系统的设计规范

## 🔄 如果需要调整

如果确实需要调整为"仅修改密码时要求密码"，我可以帮你修改代码。但建议保持当前设计以确保安全性。

