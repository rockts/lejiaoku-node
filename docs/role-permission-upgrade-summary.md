# 角色模型升级实现总结

## 一、实现概述

本次升级完成了角色模型扩展，新增 `contributor` 角色，并实现了严格的权限控制体系，确保不同角色拥有不同的资源操作权限。

---

## 二、角色定义

### 角色列表

| 角色 | 说明 | 默认注册 |
|------|------|----------|
| `user` | 普通用户 | ✅ 是（默认） |
| `contributor` | 贡献者 | ❌ 否（需管理员分配） |
| `editor` | 编辑 | ❌ 否（需管理员分配） |
| `admin` | 管理员 | ❌ 否（需管理员分配） |

---

## 三、权限规则对照表

### 资源操作权限

| 操作 | user | contributor | editor | admin |
|------|------|-------------|--------|-------|
| **上传资源** | ❌ 不允许 | ✅ 允许 | ✅ 允许 | ✅ 允许 |
| **编辑资源** | ❌ 不允许 | ✅ 仅自己的 | ✅ 任何资源 | ✅ 任何资源 |
| **删除资源** | ❌ 不允许 | ✅ 仅自己的 | ✅ 仅自己的 | ✅ 任何资源 |
| **审核资源** | ❌ 不允许 | ❌ 不允许 | ✅ 允许 | ✅ 允许 |
| **修改用户角色** | ❌ 不允许 | ❌ 不允许 | ❌ 不允许 | ✅ 允许 |

### 资源状态规则

| 角色 | 上传资源默认状态 | 说明 |
|------|-----------------|------|
| `user` | - | 不允许上传 |
| `contributor` | `pending` | 必须审核 |
| `editor` | `pending` 或 `approved` | 根据环境变量 |
| `admin` | `pending` 或 `approved` | 根据环境变量 |

---

## 四、权限判断方法

### 1. canUpload(user)

**功能**：判断用户是否可以上传资源

**实现位置**：`src/resource/resource.permission.service.ts`

**逻辑**：
- `user` 角色：❌ 不允许
- `contributor`、`editor`、`admin` 角色：✅ 允许

### 2. canEditResource(user, resource)

**功能**：判断用户是否可以编辑资源

**实现位置**：`src/resource/resource.permission.service.ts`

**逻辑**：
- `user` 角色：❌ 不允许
- `admin` 角色：✅ 可以编辑任何资源
- `editor` 角色：✅ 可以编辑任何资源
- `contributor` 角色：✅ 只能编辑自己上传的资源

### 3. canReview(user)

**功能**：判断用户是否可以审核资源

**实现位置**：`src/resource/resource.permission.service.ts`

**逻辑**：
- `user` 角色：❌ 不允许
- `contributor` 角色：❌ 不允许
- `editor` 角色：✅ 允许
- `admin` 角色：✅ 允许

### 4. canDeleteResource(user, resource)

**功能**：判断用户是否可以删除资源

**实现位置**：`src/resource/resource.permission.service.ts`

**逻辑**：
- `user` 角色：❌ 不允许
- `admin` 角色：✅ 可以删除任何资源
- `contributor`、`editor` 角色：✅ 只能删除自己的资源

---

## 五、接口权限保护说明

### 资源相关接口

#### 1. POST /api/resources - 创建资源

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 不允许 `user` 角色（返回 403）
- ✅ 允许 `contributor`、`editor`、`admin` 角色

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 71-77 行)
- 控制器：`src/resource/resource.controller.ts` (第 292-301 行)

**权限检查代码**：
```typescript
const userRole = (request.user as any)?.role || 'user';
if (userRole === 'user') {
    return response.status(403).json({
        success: false,
        message: 'user 角色不允许上传资源',
        error: 'FORBIDDEN',
    });
}
```

---

#### 2. PUT /api/resources/:id - 编辑资源

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 不允许 `user` 角色（返回 403）
- ✅ `admin` 和 `editor` 可以编辑任何资源
- ✅ `contributor` 只能编辑自己上传的资源

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 108-112 行)
- 权限中间件：`src/resource/resource.permission.middleware.ts` (第 68-89 行)
- 控制器：`src/resource/resource.controller.update.ts` (第 35-60 行)

**权限检查代码**：
```typescript
// user 角色不允许编辑
if (userRole === 'user') {
    return response.status(403).json({
        success: false,
        message: 'user 角色不允许编辑资源',
        error: 'FORBIDDEN',
    });
}

// admin 和 editor 可以编辑任何资源
if (userRole === 'admin' || userRole === 'editor') {
    return next();
}

// contributor 只能编辑自己的资源
if (userRole === 'contributor' && isOwner) {
    return next();
}
```

---

#### 3. DELETE /api/resources/:id - 删除资源

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 不允许 `user` 角色（返回 403）
- ✅ `admin` 可以删除任何资源
- ✅ `contributor` 和 `editor` 只能删除自己的资源

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 120-124 行)
- 权限中间件：`src/resource/resource.permission.middleware.ts` (第 91-110 行)
- 控制器：`src/resource/resource.controller.delete.ts` (第 42-65 行)

**权限检查代码**：
```typescript
// user 角色不允许删除
if (userRole === 'user') {
    return response.status(403).json({
        success: false,
        message: 'user 角色不允许删除资源',
        error: 'FORBIDDEN',
    });
}

// admin 可以删除任何资源
if (userRole === 'admin') {
    return next();
}

// contributor 和 editor 只能删除自己的资源
if (isOwner) {
    return next();
}
```

---

#### 4. PATCH /api/admin/resources/:id/status - 审核资源

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 仅允许 `editor` 和 `admin` 角色（`roleGuard(['admin', 'editor'])`）
- ❌ `user` 和 `contributor` 角色调用此接口将返回 403

**实现位置**：
- 路由：`src/resource/resource.router.ts` (第 96-100 行)
- 控制器：`src/resource/resource.controller.ts` (第 556-642 行)

**权限检查代码**：
```typescript
router.patch(
  '/admin/resources/:id/status',
  authGuard, // 需要登录
  roleGuard(['admin', 'editor']), // 仅允许 admin 或 editor 角色
  resourceController.updateStatus,
);
```

---

### 用户管理接口

#### 5. PATCH /api/admin/users/:id/role - 修改用户角色

**权限要求**：
- ✅ 必须登录（`authGuard`）
- ✅ 仅允许 `admin` 角色（`roleGuard(['admin'])`）

**实现位置**：
- 路由：`src/user/user.router.ts` (第 66-72 行)
- 控制器：`src/user/user.controller.admin.ts` (第 12-70 行)

**请求参数**：
```json
{
  "role": "contributor"  // 或 "user" | "editor" | "admin"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "用户角色更新成功",
  "user": {
    "id": 1,
    "name": "username",
    "role": "contributor",
    // ... 其他字段
  }
}
```

---

### 公开接口（无需登录）

以下接口无需登录即可访问：

- `GET /api/resources` - 资源列表（仅返回 `approved` 状态的资源）
- `GET /api/resources/:id` - 资源详情（仅返回 `approved` 状态的资源）
- `GET /api/resources/:id/download` - 下载资源文件
- `GET /users/` - 用户列表
- `GET /users/:userId` - 用户详情
- `POST /register` - 用户注册
- `POST /login` - 用户登录

---

## 六、代码修改总结

### 1. 模型层

**文件**：`src/user/user.model.ts`
- 更新角色类型：`'user' | 'contributor' | 'editor' | 'admin'`

### 2. 权限服务层

**文件**：`src/resource/resource.permission.service.ts`（新建）
- `canUpload(user)` - 判断是否可以上传
- `canEditResource(user, resource)` - 判断是否可以编辑
- `canReview(user)` - 判断是否可以审核
- `canDeleteResource(user, resource)` - 判断是否可以删除

### 3. 路由层

**文件**：`src/resource/resource.router.ts`
- 创建资源接口：添加 `user` 角色检查
- 审核资源接口：已有 `roleGuard(['admin', 'editor'])`

**文件**：`src/user/user.router.ts`
- 新增角色修改接口：`PATCH /api/admin/users/:id/role`

### 4. 控制器层

**文件**：`src/resource/resource.controller.ts`
- 创建资源：添加 `user` 角色权限检查
- 创建资源：根据角色设置默认状态（`contributor` 始终为 `pending`）

**文件**：`src/resource/resource.controller.update.ts`
- 更新权限检查逻辑，支持 `contributor` 角色

**文件**：`src/resource/resource.controller.delete.ts`
- 更新权限检查逻辑，`user` 角色不允许删除

**文件**：`src/user/user.controller.admin.ts`（新建）
- 实现角色修改接口

### 5. 中间件层

**文件**：`src/resource/resource.permission.middleware.ts`
- 更新编辑权限：`user` 不允许，`contributor` 只能编辑自己的
- 更新删除权限：`user` 不允许，`contributor`/`editor` 只能删除自己的

**文件**：`src/user/user.middleware.ts`
- 更新角色验证，支持 `contributor` 角色

---

## 七、使用示例

### 1. 修改用户角色（admin only）

```bash
curl -X PATCH http://localhost:3333/api/admin/users/1/role \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "contributor"
  }'
```

### 2. user 角色尝试上传资源（会失败）

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试资源",
    "category": "课件"
  }'
```

**响应**：
```json
{
  "success": false,
  "message": "user 角色不允许上传资源，请升级为 contributor、editor 或 admin 角色",
  "error": "FORBIDDEN"
}
```

### 3. contributor 上传资源

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer CONTRIBUTOR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试资源",
    "category": "课件",
    "file_url": "/uploads/resources/test.pdf",
    "file_format": "PDF"
  }'
```

**说明**：上传的资源状态自动设置为 `pending`，需要审核。

### 4. contributor 编辑自己的资源

```bash
curl -X PUT http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer CONTRIBUTOR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

### 5. contributor 尝试编辑他人的资源（会失败）

```bash
curl -X PUT http://localhost:3333/api/resources/2 \
  -H "Authorization: Bearer CONTRIBUTOR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

**响应**：
```json
{
  "success": false,
  "message": "无权操作此资源",
  "error": "FORBIDDEN"
}
```

---

## 八、接口权限保护清单

### ✅ 已添加权限保护的接口

| 接口 | 方法 | 权限要求 | 保护方式 |
|------|------|----------|----------|
| `/api/resources` | POST | contributor/editor/admin | 控制器层检查 |
| `/api/resources/:id` | PUT | contributor(自己的)/editor/admin | 中间件 + 控制器 |
| `/api/resources/:id` | DELETE | contributor(自己的)/editor(自己的)/admin | 中间件 + 控制器 |
| `/api/admin/resources/:id/status` | PATCH | editor/admin | roleGuard |
| `/api/admin/users/:id/role` | PATCH | admin | roleGuard |

### ✅ 无需权限保护的接口（公开访问）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/resources` | GET | 资源列表（仅 approved） |
| `/api/resources/:id` | GET | 资源详情（仅 approved） |
| `/api/resources/:id/download` | GET | 下载资源文件 |
| `/users/` | GET | 用户列表 |
| `/users/:userId` | GET | 用户详情 |
| `/register` | POST | 用户注册 |
| `/login` | POST | 用户登录 |

---

## 九、注意事项

1. **角色修改**：
   - 只有 `admin` 可以修改用户角色
   - 角色修改接口：`PATCH /api/admin/users/:id/role`

2. **资源状态**：
   - `contributor` 上传的资源始终为 `pending`，需要审核
   - `editor` 和 `admin` 上传的资源可以根据环境变量自动批准

3. **权限检查**：
   - 所有权限检查都在后端实现，不依赖前端
   - 路由层和控制器层都有权限验证（双重检查）

4. **向后兼容**：
   - 不破坏现有 `editor`/`admin` 权限
   - 不删除任何现有字段
   - 现有功能正常工作

---

## 十、完成标准检查

- ✅ 新增 `contributor` 角色
- ✅ 默认注册用户 role 仍为 `user`
- ✅ `user` 不允许上传和修改资源
- ✅ `contributor` 可以上传，只能修改自己的
- ✅ `editor` 可以上传、修改任何、审核
- ✅ `admin` 拥有全部权限
- ✅ 所有资源相关接口都有权限保护
- ✅ 角色修改接口（admin only）
- ✅ 不破坏现有权限
- ✅ 不删除现有字段

---

*最后更新：2024-12-25*

