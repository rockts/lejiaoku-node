# 如何检查个人资料保存状态

## 🔍 检查方法

### 方法 1: 查看数据库最近更新（推荐）

运行以下脚本查看最近更新的用户：

```bash
node scripts/check-recent-user-updates.js
```

这会显示：
- 最近更新的10个用户
- 更新时间
- 是否在最近5分钟内更新

### 方法 2: 查看服务日志

如果服务正在运行，查看控制台输出，应该能看到：
- `👮‍♂️ 验证更新用户数据` - 表示请求已到达
- `📝 更新用户信息` - 表示开始处理更新
- `👤 用户ID:` 和 `📋 更新数据:` - 显示具体更新内容

### 方法 3: 直接测试接口

使用 curl 测试接口是否正常工作：

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}' | jq -r '.token')

# 测试更新接口
curl -X PATCH http://localhost:3333/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "validate": {
      "password": "admin123456"
    },
    "update": {
      "name": "test_name",
      "email": "test@example.com"
    }
  }'
```

## ⚠️ 常见问题

### 1. 保存失败但无错误提示

**可能原因**：
- 请求格式不正确
- 缺少当前密码验证
- Token 已过期

**检查**：
- 查看浏览器开发者工具的 Network 标签
- 检查请求状态码（200=成功，400/401/409=失败）
- 查看响应内容

### 2. 接口返回成功但数据未更新

**可能原因**：
- 更新的字段值没有变化
- 数据库更新失败但未返回错误

**检查**：
- 运行 `node scripts/check-recent-user-updates.js` 查看数据库
- 检查 `updated_at` 字段是否更新

### 3. 路径不存在（404错误）

**可能原因**：
- 前端使用了错误的路径
- 服务未重启，新路由未生效

**解决**：
- 确保使用 `PATCH /user/profile` 或 `PATCH /users`
- 重启服务：`npm run start:dev`

## 📋 正确的请求格式

```json
{
  "validate": {
    "password": "当前密码"  // 必填
  },
  "update": {
    "name": "新用户名",      // 可选
    "email": "新邮箱",       // 可选
    "password": "新密码"     // 可选
  }
}
```

## ✅ 成功响应

```json
{
  "success": true,
  "message": "更新成功",
  "user": {
    "id": 2,
    "name": "新用户名",
    "email": "new@example.com",
    "role": "admin",
    "updated_at": "2025-12-24T14:27:22.000Z"
  }
}
```

## ❌ 失败响应

常见错误：

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| "请提供用户密码" | 缺少 validate.password | 提供当前密码 |
| "用户名或密码错误" | 当前密码不正确 | 检查密码是否正确 |
| "用户名已被占用" | 新用户名已被其他用户使用 | 使用其他用户名 |
| "邮箱已被占用" | 新邮箱已被其他用户使用 | 使用其他邮箱 |
| "未授权，请先登录" | Token 无效或过期 | 重新登录获取新 Token |

