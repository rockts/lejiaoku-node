# 后台管理接口实现总结

## 一、权限规则

所有 `/api/admin/*` 接口：
- ✅ 必须已登录（`authGuard`）
- ✅ 必须 `role === 'admin'`（`adminGuard`）
- ❌ `editor` 和 `contributor` 一律不可访问（返回 403）

## 二、实现的接口

### 1. 用户管理

#### GET /api/admin/users
**功能**：获取用户列表

**权限**：仅 admin

**返回字段**：
- `id` - 用户ID
- `nickname` - 昵称（如果为 null 则返回 name）
- `email` - 邮箱
- `role` - 角色
- `created_at` - 创建时间

**排序**：按 `created_at` 倒序

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nickname": "rockts",
      "email": "rockts@sina.com",
      "role": "user",
      "created_at": "2021-02-21T11:56:02.000Z"
    }
  ]
}
```

---

#### PATCH /api/admin/users/:id/role
**功能**：修改用户角色

**权限**：仅 admin

**请求参数**：
```json
{
  "role": "user" | "contributor" | "editor" | "admin"
}
```

**验证规则**：
- ✅ 验证 role 值合法
- ✅ 禁止将最后一个 admin 降权
- ✅ 检查用户是否存在

**响应示例**：
```json
{
  "success": true,
  "message": "用户角色更新成功",
  "data": {
    "id": 1,
    "name": "rockts",
    "username": "rockts",
    "role": "contributor",
    // ... 其他字段
  }
}
```

**错误响应**：
- `400` - 无效的用户ID或角色值
- `400` - 禁止将最后一个 admin 降权
- `404` - 用户不存在

---

### 2. 资源审核管理

#### GET /api/admin/resources
**功能**：获取资源列表（用于审核）

**权限**：仅 admin

**查询参数**：
- `status` (可选) - `pending` | `approved` | `rejected`
- `uploader_id` (可选) - 上传者ID

**返回字段**：
- `id` - 资源ID
- `title` - 资源标题
- `status` - 资源状态
- `uploader_id` - 上传者ID
- `created_at` - 创建时间

**排序**：按 `created_at` 倒序

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "测试资源",
      "status": "pending",
      "uploader_id": 1,
      "created_at": "2024-12-25T00:00:00.000Z"
    }
  ]
}
```

---

#### PATCH /api/admin/resources/:id/status
**功能**：审核资源状态

**权限**：仅 admin

**请求参数**：
```json
{
  "status": "approved" | "rejected"
}
```

**验证规则**：
- ✅ 验证 status 值合法
- ✅ 资源必须是 `pending` 状态才能审核
- ✅ 记录 `reviewed_by` 和 `reviewed_at`（如果数据库有这些字段）

**响应示例**：
```json
{
  "success": true,
  "message": "资源已通过审核",
  "data": {
    "id": 1,
    "title": "测试资源",
    "status": "approved",
    "reviewed_by": 2,
    "reviewed_at": "2024-12-25T00:00:00.000Z",
    // ... 其他字段
  }
}
```

**错误响应**：
- `400` - 无效的资源ID或状态值
- `400` - 资源不是 pending 状态
- `404` - 资源不存在

---

## 三、中间件

### adminGuard
**文件**：`src/auth/admin.middleware.ts`

**功能**：检查用户是否为 admin 角色

**使用方式**：
```typescript
router.get(
  '/admin/users',
  authGuard,    // 先验证登录
  adminGuard,   // 再验证 admin 角色
  controller,
);
```

**错误响应**：
- `403` - 权限不足，仅管理员可访问

---

## 四、路由定义

### 用户管理路由
**文件**：`src/user/user.router.ts`

```typescript
// 获取用户列表
router.get(
  '/admin/users',
  authGuard,
  adminGuard,
  userAdminController.getUserList,
);

// 修改用户角色
router.patch(
  '/admin/users/:id/role',
  authGuard,
  adminGuard,
  userAdminController.updateUserRole,
);
```

### 资源管理路由
**文件**：`src/resource/resource.router.ts`

```typescript
// 获取资源列表
router.get(
  '/admin/resources',
  authGuard,
  adminGuard,
  resourceAdminController.getResourceList,
);

// 审核资源状态
router.patch(
  '/admin/resources/:id/status',
  authGuard,
  adminGuard,
  resourceAdminController.updateResourceStatusByAdmin,
);
```

---

## 五、Controller 示例

### 用户管理 Controller
**文件**：`src/user/user.controller.admin.ts`

```typescript
export const getUserList = async (request, response, next) => {
  // 查询用户列表
  // 返回指定字段
};

export const updateUserRole = async (request, response, next) => {
  // 验证角色值
  // 检查是否是最后一个 admin
  // 更新角色
  // 返回更新后的用户信息
};
```

### 资源管理 Controller
**文件**：`src/resource/resource.controller.admin.ts`

```typescript
export const getResourceList = async (request, response, next) => {
  // 解析查询参数
  // 构建查询条件
  // 返回资源列表
};

export const updateResourceStatusByAdmin = async (request, response, next) => {
  // 验证状态值
  // 检查资源状态
  // 更新状态并记录审核人
  // 返回更新后的资源信息
};
```

---

## 六、错误码规范

- `401` - 未授权，请先登录
- `403` - 权限不足，仅管理员可访问
- `400` - 无效的参数或操作
- `404` - 资源不存在

---

## 七、完成标准

- ✅ 所有 `/api/admin/*` 接口仅允许 admin 访问
- ✅ editor 和 contributor 无法访问后台接口
- ✅ 用户管理接口已实现
- ✅ 资源审核管理接口已实现
- ✅ 禁止将最后一个 admin 降权
- ✅ 记录审核人信息（如果数据库有相关字段）
- ✅ 统一的错误响应格式

---

*最后更新：2024-12-25*


