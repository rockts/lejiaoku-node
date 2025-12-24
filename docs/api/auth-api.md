# 用户认证和权限管理 API 文档

## 一、用户认证接口

### 1.1 用户注册

**接口**: `POST /api/register`

**描述**: 注册新用户

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `username` 或 `name` | string | 是 | 用户名 |
| `password` | string | 是 | 密码（会自动加密存储） |
| `email` | string | 否 | 邮箱 |
| `role` | string | 否 | 用户角色：`user`（默认）或 `admin` |

**请求示例**:

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

**响应示例**:

```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "testuser",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2024-12-24T10:00:00.000Z",
    "updated_at": "2024-12-24T10:00:00.000Z",
    "avatar": null
  }
}
```

---

### 1.2 用户登录

**接口**: `POST /api/login`

**描述**: 用户登录，返回 JWT token

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `username` 或 `email` | string | 是 | 用户名或邮箱 |
| `password` | string | 是 | 密码 |

**请求示例**:

```bash
# 使用用户名登录
curl -X POST http://localhost:3333/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# 或使用邮箱登录
curl -X POST http://localhost:3333/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**响应示例**:

```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "testuser",
    "email": "test@example.com",
    "role": "user",
    "created_at": "2024-12-24T10:00:00.000Z",
    "updated_at": "2024-12-24T10:00:00.000Z",
    "avatar": null
  }
}
```

**Token 说明**:
- Token 有效期：24 小时
- Token 格式：JWT (RS256 算法)
- 需要在请求头中使用：`Authorization: Bearer <token>`

---

### 1.3 验证登录状态

**接口**: `POST /api/auth/validate`

**描述**: 验证当前 token 是否有效

**请求头**:

```
Authorization: Bearer <token>
```

**请求示例**:

```bash
curl -X POST http://localhost:3333/api/auth/validate \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**响应示例**:

```json
// 成功（HTTP 200）
// 无响应体

// 失败（HTTP 401）
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

---

## 二、权限管理

### 2.1 角色定义

| 角色 | 说明 | 权限 |
|------|------|------|
| `user` | 普通用户 | 可以上传资源、编辑/删除自己创建的资源 |
| `admin` | 管理员 | 可以上传、编辑、删除所有资源 |

---

### 2.2 接口权限说明

#### 公开接口（无需登录）

- `GET /api/resources` - 资源列表（仅返回 approved 资源）
- `GET /api/resources/:id` - 资源详情（仅返回 approved 资源）

#### 需要登录的接口

- `POST /api/resources` - 创建资源（user 或 admin）
- `PUT /api/resources/:id` - 更新资源（仅创建者或 admin）
- `DELETE /api/resources/:id` - 删除资源（仅创建者或 admin）

---

## 三、资源操作权限

### 3.1 创建资源

**接口**: `POST /api/resources`

**权限**: user 或 admin

**请求头**:

```
Authorization: Bearer <token>
```

**请求示例**:

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer <token>" \
  -F "title=测试资源" \
  -F "category=课件" \
  -F "file=@/path/to/file.pdf"
```

---

### 3.2 更新资源

**接口**: `PUT /api/resources/:id`

**权限**: 仅创建者或 admin

**请求头**:

```
Authorization: Bearer <token>
```

**请求示例**:

```bash
curl -X PUT http://localhost:3333/api/resources/3 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "description": "更新后的描述"
  }'
```

**权限验证**:
- 如果用户不是资源创建者且不是 admin，返回 403 Forbidden

---

### 3.3 删除资源

**接口**: `DELETE /api/resources/:id`

**权限**: 仅创建者或 admin

**请求头**:

```
Authorization: Bearer <token>
```

**请求示例**:

```bash
curl -X DELETE http://localhost:3333/api/resources/3 \
  -H "Authorization: Bearer <token>"
```

**响应示例**:

```json
{
  "success": true,
  "message": "资源删除成功",
  "resource_id": 3
}
```

**权限验证**:
- 如果用户不是资源创建者且不是 admin，返回 403 Forbidden

---

## 四、错误响应

### 4.1 认证错误（401 Unauthorized）

```json
{
  "success": false,
  "message": "未授权，请先登录",
  "error": "UNAUTHORIZED"
}
```

**触发场景**:
- Token 不存在或无效
- Token 已过期
- Token 格式错误

---

### 4.2 权限错误（403 Forbidden）

```json
{
  "success": false,
  "message": "无权操作此资源",
  "error": "FORBIDDEN"
}
```

**触发场景**:
- 用户尝试修改/删除非自己创建的资源（且不是 admin）

---

### 4.3 登录错误

```json
{
  "success": false,
  "message": "用户名或密码错误",
  "error": "PASSWORD_DOES_NOT_MATCH"
}
```

**触发场景**:
- 用户名/邮箱不存在
- 密码错误

---

### 4.4 注册错误

```json
{
  "success": false,
  "message": "用户名已存在",
  "error": "USERNAME_ALREADY_EXIST"
}
```

**触发场景**:
- 用户名已存在
- 邮箱已存在

---

## 五、前端集成示例

### 5.1 登录流程

```typescript
// 1. 用户登录
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123',
  }),
});

const { token, user } = await loginResponse.json();

// 2. 保存 token 到 localStorage
localStorage.setItem('token', token);

// 3. 在后续请求中使用 token
const resourceResponse = await fetch('/api/resources', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### 5.2 权限判断

```typescript
// 检查用户是否有权限编辑资源
function canEditResource(resource: Resource, currentUser: User): boolean {
  // admin 可以编辑所有资源
  if (currentUser.role === 'admin') {
    return true;
  }
  
  // 创建者可以编辑自己的资源
  return resource.user_id === currentUser.id;
}

// 使用示例
if (canEditResource(resource, currentUser)) {
  // 显示编辑按钮
}
```

### 5.3 错误处理

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    // Token 过期或无效，跳转到登录页
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  
  if (response.status === 403) {
    // 权限不足
    throw new Error('无权操作此资源');
  }
  
  return response;
}
```

---

## 六、安全说明

### 6.1 密码加密

- 使用 bcrypt 加密存储（salt rounds: 10）
- 密码永远不会以明文形式返回给客户端

### 6.2 Token 安全

- Token 有效期：24 小时
- 使用 RS256 算法签名（非对称加密）
- Token 包含用户 ID、name、email、role 信息

### 6.3 权限验证

- 所有受保护接口都通过 `authGuard` 中间件验证
- 资源操作权限通过 `resourcePermissionGuard` 中间件验证
- 双重验证确保安全性

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

