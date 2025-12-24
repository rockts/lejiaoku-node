# 注册接口使用指南和管理员账号说明

## 一、注册接口说明

### 1. 注册接口路径

系统中有**两个注册接口**：

1. **`POST /register`** - 简单版本（在 userRouter 中）
   - 控制器：`userController.store`
   - 返回格式：`{ message: '注册成功', data: {...} }`
   - 不返回 token

2. **`POST /api/register`** - 完整版本（推荐使用，在 authRouter 中）
   - 控制器：`registerController.register`
   - 返回格式：`{ success: true, message: '注册成功', token: '...', user: {...} }`
   - 返回 JWT token，可直接用于后续请求

### 2. 注册失败常见原因

#### 原因 1: 用户名已存在
- **错误码**: `USERNAME_ALREADY_EXIST`
- **HTTP 状态码**: 409
- **错误信息**: "用户名已被占用"
- **解决方案**: 使用不同的用户名

#### 原因 2: 邮箱已存在
- **错误码**: `EMAIL_ALREADY_EXIST`
- **HTTP 状态码**: 409
- **错误信息**: "邮箱已被占用"
- **解决方案**: 使用不同的邮箱地址

#### 原因 3: 缺少必填字段
- **错误码**: `USERNAME_OR_NAME_IS_REQUIRED` 或 `PASSWORD_IS_REQUIRED`
- **HTTP 状态码**: 400
- **错误信息**: "请提供用户名" 或 "请提供用户密码"
- **解决方案**: 确保请求体包含 `name`（或 `username`）和 `password`

#### 原因 4: 服务未运行
- **错误**: `ECONNREFUSED` 或连接超时
- **解决方案**: 确保服务正在运行 `npm run start:dev`

### 3. 正确的注册请求示例

```bash
# 使用 /api/register（推荐）
curl -X POST http://localhost:3333/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "user"
  }'

# 或使用 /register
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newuser",
    "email": "newuser@example.com",
    "password": "password123"
  }'
```

### 4. 注册普通用户

```json
{
  "name": "username",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"  // 可选，默认为 "user"
}
```

### 5. 注册管理员（通过接口）

**注意**：当前系统允许通过注册接口创建管理员，但建议使用脚本创建（见下文）。

```json
{
  "name": "admin",
  "email": "admin@example.com",
  "password": "admin123456",
  "role": "admin"
}
```

---

## 二、管理员账号

### 1. 当前数据库用户状态

根据查询结果，当前数据库中有 4 个用户，但**没有管理员账号**（所有用户的 role 都是 "user"）：

- ID: 1 - 用户名: "高鹏" - 邮箱: rockts@sina.com - 角色: user
- ID: 2 - 用户名: "admin" - 邮箱: admin@lekee.cc - 角色: user（**注意：虽然用户名是 admin，但角色是 user**）
- ID: 3 - 用户名: "testuser_1766596890796" - 邮箱: test_1766596890796@test.com - 角色: user
- ID: 4 - 用户名: "testuser" - 邮箱: test@test.com - 角色: user

### 2. 创建管理员账号的方法

#### 方法 1: 使用脚本（推荐）

```bash
# 使用默认账号（用户名: admin, 密码: admin123456, 邮箱: admin@lejiaoku.com）
node scripts/create-admin-user.js

# 自定义账号信息
node scripts/create-admin-user.js myadmin mypassword123 admin@example.com
```

**默认管理员账号信息**（运行脚本时会显示）：
- 用户名: `admin`（默认值，可通过参数修改）
- 密码: 由脚本参数指定，或使用默认值（脚本会显示）
- 邮箱: 由脚本参数指定，或使用默认值（脚本会显示）
- 角色: `admin`

#### 方法 2: 使用注册接口

```bash
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin",
    "email": "admin@example.com",
    "password": "your_secure_password",
    "role": "admin"
  }'
```

**⚠️ 注意**：生产环境请使用强密码，不要使用默认密码。

#### 方法 3: 直接更新现有用户为管理员

```bash
# 使用脚本更新现有用户（设置新密码）
node scripts/create-admin-user.js admin newpassword admin@example.com
```

### 3. 查看所有用户

```bash
node scripts/check-users.js
```

### 4. 管理员权限

管理员账号（`role: "admin"`）具有以下权限：

- ✅ 可以上传资源（`POST /api/resources`）
- ✅ 可以编辑所有资源（`PUT /api/resources/:id`）
- ✅ 可以删除所有资源（`DELETE /api/resources/:id`）
- ✅ 可以查看所有状态的资源（`GET /api/admin/resources`）

普通用户（`role: "user"`）只能操作自己创建的资源。

---

## 三、登录接口

### 1. 登录接口路径

`POST /login` 或 `POST /api/login`（两者相同，都在 authRouter 中）

### 2. 登录请求示例

```bash
# 使用用户名登录
curl -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "<使用脚本设置的密码>"
  }'

# 或使用邮箱登录
curl -X POST http://localhost:3333/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<使用脚本设置的邮箱>",
    "password": "<使用脚本设置的密码>"
  }'
```

### 3. 登录响应

```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "admin",
    "email": "admin@lejiaoku.com",
    "role": "admin",
    "created_at": "2024-12-24T10:00:00.000Z",
    "updated_at": "2024-12-24T10:00:00.000Z",
    "avatar": null
  }
}
```

### 4. 使用 Token

登录成功后，使用返回的 `token` 访问需要认证的接口：

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "title": "测试资源",
    "category": "课件",
    "file_format": "PDF",
    "file_url": "http://example.com/file.pdf"
  }'
```

---

## 四、快速创建默认管理员账号

运行以下命令创建默认管理员账号：

```bash
node scripts/create-admin-user.js
```

这将创建/更新管理员账号，脚本会显示实际使用的值：
- **用户名**: `admin`（默认，可通过参数修改）
- **密码**: 脚本会显示实际设置的密码
- **邮箱**: 脚本会显示实际使用的邮箱
- **角色**: `admin`

**⚠️ 安全提示**：
- 密码信息不会存储在代码仓库中
- 生产环境请使用强密码
- 运行脚本时会显示实际设置的密码，请妥善保管

---

## 五、常见问题

### Q1: 为什么注册失败？

A: 常见原因包括：
1. 用户名或邮箱已存在（409 错误）
2. 缺少必填字段（400 错误）
3. 服务未运行（连接错误）
4. 请求格式错误

查看服务日志获取详细错误信息。

### Q2: 如何查看现有用户？

A: 运行 `node scripts/check-users.js`

### Q3: 如何重置管理员密码？

A: 运行 `node scripts/create-admin-user.js admin newpassword admin@example.com`

### Q4: 可以创建多个管理员吗？

A: 可以，通过注册接口或脚本创建多个 `role: "admin"` 的用户。

### Q5: 忘记管理员密码怎么办？

A: 运行脚本重置密码：
```bash
node scripts/create-admin-user.js admin newpassword admin@example.com
```

