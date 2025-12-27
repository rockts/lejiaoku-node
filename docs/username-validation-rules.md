# 用户名验证规则

## 一、用户名格式要求

### 规则定义

用户名必须符合以下格式：
- **长度**：4-20 位字符
- **开头**：必须以字母（a-z 或 A-Z）开头
- **允许字符**：字母（a-z, A-Z）、数字（0-9）、下划线（_）、短横线（-）

### 正则表达式

```javascript
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;
```

**说明**：
- `^[a-zA-Z]` - 必须以字母开头
- `[a-zA-Z0-9_-]{3,19}` - 后面3-19个字符（总共4-20位），可包含字母、数字、下划线、短横线
- `$` - 字符串结尾

### 有效示例

✅ **有效的用户名**：
- `user123` - 字母开头，包含数字
- `test_user` - 字母开头，包含下划线
- `my-name` - 字母开头，包含短横线
- `admin2024` - 字母开头，包含数字
- `a123` - 最短（4位）
- `abcdefghijklmnopqrst` - 最长（20位）

❌ **无效的用户名**：
- `123user` - 不能以数字开头
- `_user` - 不能以下划线开头
- `-user` - 不能以短横线开头
- `abc` - 太短（少于4位）
- `abcdefghijklmnopqrstu` - 太长（超过20位）
- `user name` - 不能包含空格
- `user@name` - 不能包含特殊字符（除了 _ 和 -）
- `中文用户名` - 不能包含中文

---

## 二、用户名唯一性

### 规则

- 用户名在系统中必须**唯一**
- 注册时如果用户名已存在，将返回 `409 Conflict` 错误
- 更新用户名时，如果新用户名已被其他用户使用，将返回 `409 Conflict` 错误

### 数据库约束

- `username` 字段有 `UNIQUE` 约束
- `name` 字段也有 `UNIQUE` 约束（因为 username 和 name 可以互用）

---

## 三、验证实现

### 后端验证

**位置**：`src/user/user.middleware.ts`

**验证时机**：
1. **注册时**：`validateUserData` 中间件
2. **更新用户名时**：`validateUpdateUserData` 中间件

**验证逻辑**：
```typescript
// 1. 格式验证
if (!USERNAME_REGEX.test(userNameValue)) {
  return next(new Error('USERNAME_FORMAT_INVALID'));
}

// 2. 唯一性验证
const existingUser = await userService.getUserByName(userNameValue);
if (existingUser) {
  return next(new Error('USERNAME_ALREADY_EXIST'));
}
```

### 错误响应

**格式错误**（400）：
```json
{
  "message": "用户名格式无效，必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)"
}
```

**用户名已存在**（409）：
```json
{
  "message": "用户名已被占用"
}
```

---

## 四、前端验证示例

### JavaScript 验证函数

```javascript
// 导入正则表达式（如果使用模块化）
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;

function validateUsername(username) {
  if (!username) {
    return {
      valid: false,
      message: '请提供用户名'
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      message: '用户名格式无效，必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)'
    };
  }

  return {
    valid: true,
    message: '用户名格式正确'
  };
}

// 使用示例
const result = validateUsername('user123');
if (!result.valid) {
  alert(result.message);
}
```

### Vue 组件示例

```vue
<template>
  <div>
    <input 
      v-model="username" 
      @blur="validateUsername"
      placeholder="请输入用户名"
    />
    <span v-if="usernameError" class="error">{{ usernameError }}</span>
  </div>
</template>

<script>
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;

export default {
  data() {
    return {
      username: '',
      usernameError: ''
    };
  },
  methods: {
    validateUsername() {
      if (!this.username) {
        this.usernameError = '请提供用户名';
        return false;
      }

      if (!USERNAME_REGEX.test(this.username)) {
        this.usernameError = '用户名格式无效，必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)';
        return false;
      }

      this.usernameError = '';
      return true;
    }
  }
};
</script>
```

---

## 五、API 接口说明

### 注册接口

**接口**：`POST /register`

**请求参数**：
```json
{
  "username": "user123",  // 必须符合格式要求
  "password": "password123",
  "email": "user@example.com"  // 可选
}
```

**验证流程**：
1. 检查用户名格式
2. 检查用户名唯一性
3. 如果都通过，创建用户

### 更新用户名接口

**接口**：`PATCH /user/profile` 或 `PATCH /users`

**请求参数**：
```json
{
  "update": {
    "name": "newuser123"  // 必须符合格式要求
  }
}
```

**验证流程**：
1. 检查用户名格式
2. 检查用户名唯一性（排除当前用户）
3. 如果都通过，更新用户名

---

## 六、常量定义

**文件位置**：`src/user/user.constants.ts`

```typescript
export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;
export const USERNAME_FORMAT_DESCRIPTION = '用户名必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)';
```

**使用方式**：
```typescript
import { USERNAME_REGEX, USERNAME_FORMAT_DESCRIPTION } from './user.constants';

if (!USERNAME_REGEX.test(username)) {
  // 格式错误
}
```

---

## 七、测试用例

### 有效用户名测试

| 用户名 | 结果 | 说明 |
|--------|------|------|
| `user123` | ✅ 有效 | 字母开头，包含数字 |
| `test_user` | ✅ 有效 | 字母开头，包含下划线 |
| `my-name` | ✅ 有效 | 字母开头，包含短横线 |
| `a123` | ✅ 有效 | 最短（4位） |
| `abcdefghijklmnopqrst` | ✅ 有效 | 最长（20位） |

### 无效用户名测试

| 用户名 | 结果 | 说明 |
|--------|------|------|
| `123user` | ❌ 无效 | 不能以数字开头 |
| `_user` | ❌ 无效 | 不能以下划线开头 |
| `-user` | ❌ 无效 | 不能以短横线开头 |
| `abc` | ❌ 无效 | 太短（少于4位） |
| `abcdefghijklmnopqrstu` | ❌ 无效 | 太长（超过20位） |
| `user name` | ❌ 无效 | 不能包含空格 |
| `user@name` | ❌ 无效 | 不能包含 @ 符号 |
| `中文用户名` | ❌ 无效 | 不能包含中文 |

---

## 八、注意事项

1. **唯一性检查**：
   - 用户名在系统中必须唯一
   - 注册和更新时都会检查唯一性

2. **格式验证**：
   - 注册时必须通过格式验证
   - 更新用户名时也必须通过格式验证

3. **数据库约束**：
   - 数据库层面有 `UNIQUE` 约束，确保唯一性
   - 使用 `utf8mb4_unicode_ci` 字符集，但用户名格式限制为字母数字

4. **向后兼容**：
   - 现有的用户名如果不符合新格式，仍然可以正常使用（登录等）
   - 但更新用户名时必须符合新格式

---

*最后更新：2024-12-25*

