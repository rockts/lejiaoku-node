# 用户认证和权限管理实现总结

## 实现概述

已完成用户登录、权限管理和资源操作安全功能的实现，确保所有资源操作都需要适当的权限验证。

---

## 一、实现的功能

### 1.1 用户认证

✅ **注册接口** (`POST /api/register`)
- 支持 username/name、password、email、role 字段
- 密码自动使用 bcrypt 加密存储（salt rounds: 10）
- 返回 JWT token 和用户信息

✅ **登录接口** (`POST /api/login`)
- 支持 username 或 email 登录
- 密码验证（bcrypt 比较）
- 返回 JWT token（24小时过期）和用户信息

✅ **Token 验证**
- JWT token 使用 RS256 算法签名
- Token 有效期：24 小时
- Token 包含：id, name, email, role

---

### 1.2 权限管理

✅ **角色定义**
- `user`: 普通用户
  - 可以上传资源
  - 可以编辑/删除自己创建的资源
- `admin`: 管理员
  - 可以上传资源
  - 可以编辑/删除所有资源

✅ **接口权限控制**
- `POST /api/resources`: 需要登录（user 或 admin）
- `PUT /api/resources/:id`: 需要登录 + 权限验证（仅创建者或 admin）
- `DELETE /api/resources/:id`: 需要登录 + 权限验证（仅创建者或 admin）
- `GET /api/resources`: 公开访问（仅返回 approved 资源）
- `GET /api/resources/:id`: 公开访问（仅返回 approved 资源）

---

### 1.3 中间件

✅ **authGuard 中间件**
- 检查 `Authorization` header 中的 JWT token
- 验证 token 有效性
- 如果验证失败，返回 401 Unauthorized

✅ **currentUser 中间件**
- 从 `Authorization: Bearer <token>` 提取 token
- 验证 token 并解码用户信息
- 将用户信息注入 `request.user`
- 如果 token 无效，`request.user` 为 null（不抛出错误）

✅ **resourcePermissionGuard 中间件**
- 检查用户是否有权限操作特定资源
- 验证逻辑：
  - admin 可以操作所有资源
  - 创建者可以操作自己创建的资源
  - 其他情况返回 403 Forbidden

---

## 二、数据库变更

### 2.1 user 表结构

需要执行 SQL 脚本添加 `role` 字段：

```sql
-- scripts/add-role-to-user-table.sql
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
COMMENT '用户角色：user(普通用户) / admin(管理员)' 
AFTER email;
```

**字段说明**:
- `role`: VARCHAR(20)，默认值为 'user'
- 允许值：'user'（普通用户）、'admin'（管理员）

---

## 三、安全特性

### 3.1 密码安全

- ✅ 使用 bcrypt 加密存储（salt rounds: 10）
- ✅ 密码永远不会以明文形式返回给客户端
- ✅ 登录时使用 bcrypt.compare 验证密码

### 3.2 Token 安全

- ✅ JWT token 使用 RS256 算法（非对称加密）
- ✅ Token 有效期：24 小时
- ✅ Token 包含用户 ID、name、email、role 信息
- ✅ Token 验证失败返回 401 Unauthorized

### 3.3 权限验证

- ✅ 所有受保护接口都通过 `authGuard` 中间件
- ✅ 资源操作通过 `resourcePermissionGuard` 中间件
- ✅ 双重验证确保安全性

---

## 四、错误处理

### 4.1 HTTP 状态码

| 状态码 | 说明 | 触发场景 |
|--------|------|----------|
| 200 | 成功 | 操作成功 |
| 201 | 创建成功 | 注册或创建资源成功 |
| 400 | 请求错误 | 参数错误、验证失败 |
| 401 | 未授权 | Token 无效或不存在 |
| 403 | 权限不足 | 无权操作资源 |
| 404 | 资源不存在 | 资源不存在 |
| 409 | 冲突 | 用户名或邮箱已存在 |

### 4.2 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error": "ERROR_CODE"
}
```

---

## 五、使用示例

### 5.1 注册用户

```bash
curl -X POST http://localhost:3333/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com",
    "role": "user"
  }'
```

### 5.2 用户登录

```bash
curl -X POST http://localhost:3333/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 5.3 创建资源（需要登录）

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer <token>" \
  -F "title=测试资源" \
  -F "category=课件" \
  -F "file=@/path/to/file.pdf"
```

### 5.4 更新资源（需要权限）

```bash
curl -X PUT http://localhost:3333/api/resources/3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

### 5.5 删除资源（需要权限）

```bash
curl -X DELETE http://localhost:3333/api/resources/3 \
  -H "Authorization: Bearer <token>"
```

---

## 六、文件变更清单

### 6.1 新增文件

- `src/auth/auth.controller.register.ts` - 注册接口控制器
- `src/resource/resource.permission.middleware.ts` - 资源权限守卫
- `src/resource/resource.controller.delete.ts` - 删除资源接口
- `scripts/add-role-to-user-table.sql` - 数据库迁移脚本
- `docs/api/auth-api.md` - API 文档

### 6.2 修改文件

- `src/auth/auth.controller.ts` - 登录接口（添加 role 支持）
- `src/auth/auth.middleware.ts` - 认证中间件（支持 username 登录、完善 authGuard）
- `src/auth/auth.router.ts` - 添加注册路由
- `src/auth/auth.service.ts` - Token 签发（添加 24 小时过期）
- `src/user/user.model.ts` - 添加 role 和 username 字段
- `src/user/user.service.ts` - 支持 role 字段查询
- `src/user/user.middleware.ts` - 注册验证（支持 username）
- `src/resource/resource.controller.ts` - 创建资源（移除测试用的默认 userId）
- `src/resource/resource.controller.update.ts` - 更新资源（完善权限验证）
- `src/resource/resource.router.ts` - 应用权限控制（authGuard、resourcePermissionGuard）
- `src/app/app.middleware.ts` - 错误处理（添加用户名和权限相关错误）

---

## 七、完成标准确认

✅ **注册、登录接口可用，返回 token**
- 注册接口：`POST /api/register`
- 登录接口：`POST /api/login`
- 都返回 JWT token 和用户信息

✅ **上传资源接口仅限登录用户**
- `POST /api/resources` 已添加 `authGuard` 中间件

✅ **编辑和删除资源接口仅限创建者或管理员**
- `PUT /api/resources/:id` 已添加 `authGuard` + `resourcePermissionGuard`
- `DELETE /api/resources/:id` 已添加 `authGuard` + `resourcePermissionGuard`

✅ **GET 列表和详情接口可公开访问**
- `GET /api/resources` 无需登录
- `GET /api/resources/:id` 无需登录
- 都只返回 `status='approved'` 的资源

✅ **控制台无未捕获异常**
- 所有错误都通过错误处理中间件处理
- 返回统一的 JSON 错误格式

✅ **前端可直接对接**
- 提供完整的 API 文档
- 错误响应格式统一
- Token 使用标准 Bearer 格式

---

## 八、部署前准备

### 8.1 数据库迁移

执行 SQL 脚本添加 role 字段：

```bash
mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < scripts/add-role-to-user-table.sql
```

### 8.2 测试步骤

1. **注册用户**：
   ```bash
   curl -X POST http://localhost:3333/api/register \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "test123", "role": "user"}'
   ```

2. **登录获取 token**：
   ```bash
   curl -X POST http://localhost:3333/api/login \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "test123"}'
   ```

3. **使用 token 创建资源**：
   ```bash
   curl -X POST http://localhost:3333/api/resources \
     -H "Authorization: Bearer <token>" \
     -F "title=测试" -F "category=课件" -F "file=@test.pdf"
   ```

4. **测试权限控制**：
   - 使用不同用户登录，尝试编辑/删除其他用户的资源
   - 应该返回 403 Forbidden

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

