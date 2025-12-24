# 管理员账号信息

## ✅ 正确的管理员账号信息

根据数据库查询和测试结果，**登录功能正常工作**。

### 管理员账号（已确认可用）

| 字段 | 值 |
|------|-----|
| **用户名** | `admin` |
| **密码** | 请运行 `node scripts/create-admin-user.js` 查看或设置 |
| **邮箱** | 请运行 `node scripts/check-users.js` 查看 |
| **角色** | `admin` |
| **用户ID** | 2 |

**⚠️ 安全提示**：密码信息不会存储在代码仓库中，请使用脚本查看或创建管理员账号。

### 登录方式

#### 方式 1: 使用用户名登录（✅ 已测试成功）

```bash
curl -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "<请使用脚本查看或设置密码>"
  }'
```

#### 方式 2: 使用邮箱登录（✅ 已测试成功）

```bash
curl -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<请使用脚本查看邮箱>",
    "password": "<请使用脚本查看或设置密码>"
  }'
```

**💡 获取账号信息**：
- 查看所有用户：`node scripts/check-users.js`
- 创建/重置管理员账号：`node scripts/create-admin-user.js [username] [password] [email]`

### 登录成功响应示例

```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "admin",
    "email": "admin@lekee.cc",
    "role": "admin",
    "created_at": "2021-02-23T22:05:31.000Z",
    "updated_at": "2025-12-24T05:33:17.000Z"
  }
}
```

### 常见登录错误

#### 错误 1: 用户不存在
```json
{
  "message": "用户不存在"
}
```
**原因**：
- 用户名或邮箱输入错误
- 用户确实不存在

#### 错误 2: 密码错误
```json
{
  "message": "用户名或密码错误"
}
```
**原因**：
- 密码输入错误

### 测试登录功能

运行测试脚本验证登录：

```bash
node scripts/test-login.js
```

### 查看所有用户

```bash
node scripts/check-users.js
```

### 重置管理员密码

如果需要重置密码：

```bash
# 创建/重置管理员账号（会显示设置的密码）
node scripts/create-admin-user.js admin your_password admin@example.com

# 或使用默认值（脚本会显示实际使用的值）
node scripts/create-admin-user.js
```

---

## 总结

✅ **登录功能正常** - 接口工作正常  
✅ **账号密码正确** - 使用正确的账号信息可以成功登录  
✅ **Token 正常生成** - 登录后可以获取 JWT token  

**获取登录信息**：
- 查看用户：运行 `node scripts/check-users.js`
- 创建/重置管理员：运行 `node scripts/create-admin-user.js [username] [password] [email]`

**⚠️ 注意**：密码信息不会存储在代码仓库中，请妥善保管。

