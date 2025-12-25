# 权限系统说明文档

## 一、角色定义

系统包含以下四种角色：

- **user**：普通用户，只能浏览、下载资源，不可上传/编辑资源
- **contributor**：贡献者，可以上传资源，不可审核资源
- **editor**：编辑，可以编辑资源、审核资源
- **admin**：管理员，拥有全部权限（包括用户角色修改）

---

## 二、资源操作权限

### 1. 创建资源 (POST /api/resources)

**允许角色**：`contributor` / `editor` / `admin`

**禁止角色**：`user`

**实现位置**：`src/resource/resource.router.ts`

```typescript
router.post(
  '/resources',
  authGuard,
  requireRole(['contributor', 'editor', 'admin']),
  resourceController.store,
);
```

**错误返回**：
- 未登录：401 Unauthorized
- user 角色：403 Forbidden

---

### 2. 编辑资源 (PUT /api/resources/:id)

**权限规则**：
- `contributor`：只能修改自己创建的资源（`resource.user_id === req.user.id`）
- `editor` / `admin`：可以修改任意资源
- `user`：禁止

**实现位置**：`src/resource/resource.router.ts` + `src/resource/resource.permission.middleware.ts`

```typescript
router.put(
  '/resources/:id',
  authGuard,
  resourcePermissionGuard, // 内部实现 owner 校验
  updateResourceController.update,
);
```

**Owner 校验逻辑**：
- 如果角色为 `contributor`，必须校验 `resource.user_id === req.user.id`
- 如果角色为 `editor` 或 `admin`，无需校验 owner

**错误返回**：
- 未登录：401 Unauthorized
- user 角色：403 Forbidden
- contributor 修改他人资源：403 Forbidden

---

### 3. 删除资源 (DELETE /api/resources/:id)

**权限规则**：
- **仅 `admin` 允许删除资源**

**实现位置**：`src/resource/resource.router.ts`

```typescript
router.delete(
  '/resources/:id',
  authGuard,
  requireRole(['admin']),
  deleteResourceController.destroy,
);
```

**错误返回**：
- 未登录：401 Unauthorized
- 非 admin 角色：403 Forbidden

---

### 4. 审核资源 (POST /api/resources/:id/approve)

**权限规则**：
- `editor` / `admin`：允许审核
- `user` / `contributor`：禁止

**功能**：
- 将资源状态从 `pending` 改为 `approved`
- 记录审核人信息（`reviewed_by` 和 `reviewed_at`）

**实现位置**：`src/resource/resource.router.ts`

```typescript
router.post(
  '/resources/:id/approve',
  authGuard,
  requireRole(['editor', 'admin']),
  resourceController.approve,
);
```

**验证规则**：
- 资源必须是 `pending` 状态才能审核
- 非 `pending` 状态的资源返回 400 Bad Request

**错误返回**：
- 未登录：401 Unauthorized
- user/contributor 角色：403 Forbidden
- 资源不是 pending 状态：400 Bad Request

---

## 三、Contributor 申请机制

### 1. 申请成为 Contributor

**接口**：`POST /api/contributor-applications`

**权限**：需要登录，仅 `user` 角色可调用

**功能**：
- 创建 `status=pending` 的申请记录
- 若已有 `pending` 申请，返回 400

**实现位置**：`src/contributor-application/contributor-application.router.ts`

```typescript
router.post(
  '/contributor-applications',
  authGuard,
  requireRole(['user']),
  applicationController.store,
);
```

**请求示例**：
```json
POST /api/contributor-applications
Authorization: Bearer <user_token>
```

**响应示例**：
```json
{
  "success": true,
  "message": "申请已提交，等待管理员审核"
}
```

**错误返回**：
- 未登录：401 Unauthorized
- 非 user 角色：403 Forbidden
- 已有 pending 申请：400 Bad Request

---

### 2. 获取待审核申请列表（管理员接口）

**接口**：`GET /api/admin/contributor-applications`

**权限**：需要登录，仅 `admin` 角色

**功能**：
- 返回所有 `status=pending` 的申请
- 包含用户基本信息（username, name, email, role, nickname, created_at）

**实现位置**：`src/contributor-application/contributor-application.router.ts`

```typescript
router.get(
  '/admin/contributor-applications',
  authGuard,
  adminGuard,
  applicationController.getPendingList,
);
```

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "created_at": "2025-12-25T10:00:00.000Z",
      "updated_at": "2025-12-25T10:00:00.000Z",
      "user": {
        "id": 2,
        "username": "testuser",
        "name": "测试用户",
        "email": "test@example.com",
        "role": "user",
        "nickname": "测试",
        "created_at": "2025-12-20T10:00:00.000Z"
      }
    }
  ]
}
```

---

### 3. 审核通过申请（管理员接口）

**接口**：`POST /api/admin/contributor-applications/:id/approve`

**权限**：需要登录，仅 `admin` 角色

**功能**：
- **原子操作**：
  1. 将申请 `status` 改为 `approved`
  2. 将 `users.role` 更新为 `contributor`
  3. 记录 `reviewed_by` 和 `reviewed_at`

**实现位置**：`src/contributor-application/contributor-application.router.ts` + `src/contributor-application/contributor-application.service.ts`

```typescript
router.post(
  '/admin/contributor-applications/:id/approve',
  authGuard,
  adminGuard,
  applicationController.approve,
);
```

**请求示例**：
```json
POST /api/admin/contributor-applications/1/approve
Authorization: Bearer <admin_token>
```

**响应示例**：
```json
{
  "success": true,
  "message": "申请已通过，用户角色已更新为 contributor"
}
```

**错误返回**：
- 未登录：401 Unauthorized
- 非 admin 角色：403 Forbidden
- 申请不存在：404 Not Found
- 申请已被处理：400 Bad Request

---

### 4. 拒绝申请（管理员接口）

**接口**：`POST /api/admin/contributor-applications/:id/reject`

**权限**：需要登录，仅 `admin` 角色

**功能**：
- 将申请 `status` 改为 `rejected`
- 记录 `reviewed_by` 和 `reviewed_at`
- **不更新用户角色**

**实现位置**：`src/contributor-application/contributor-application.router.ts`

```typescript
router.post(
  '/admin/contributor-applications/:id/reject',
  authGuard,
  adminGuard,
  applicationController.reject,
);
```

**请求示例**：
```json
POST /api/admin/contributor-applications/1/reject
Authorization: Bearer <admin_token>
```

**响应示例**：
```json
{
  "success": true,
  "message": "申请已拒绝"
}
```

**错误返回**：
- 未登录：401 Unauthorized
- 非 admin 角色：403 Forbidden
- 申请不存在：404 Not Found
- 申请已被处理：400 Bad Request

---

## 四、数据库表结构

### contributor_applications 表

```sql
CREATE TABLE `contributor_applications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL COMMENT '申请用户ID',
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '申请状态',
  `reviewed_by` INT UNSIGNED NULL DEFAULT NULL COMMENT '审核人ID（管理员）',
  `reviewed_at` DATETIME NULL DEFAULT NULL COMMENT '审核时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_pending` (`user_id`, `status`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_contributor_applications_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_contributor_applications_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**字段说明**：
- `id`：主键
- `user_id`：申请用户ID（外键关联 `user.id`）
- `status`：申请状态（`pending` / `approved` / `rejected`）
- `reviewed_by`：审核人ID（外键关联 `user.id`，仅管理员）
- `reviewed_at`：审核时间
- `created_at`：申请时间
- `updated_at`：更新时间

**索引**：
- `unique_user_pending`：确保每个用户只能有一个 `pending` 状态的申请

---

## 五、角色权限矩阵

| 操作 | user | contributor | editor | admin |
|------|------|-------------|--------|-------|
| **浏览资源** (GET /api/resources) | ✅ | ✅ | ✅ | ✅ |
| **创建资源** (POST /api/resources) | ❌ | ✅ | ✅ | ✅ |
| **编辑自己的资源** (PUT /api/resources/:id) | ❌ | ✅ | ✅ | ✅ |
| **编辑他人的资源** (PUT /api/resources/:id) | ❌ | ❌ | ✅ | ✅ |
| **删除资源** (DELETE /api/resources/:id) | ❌ | ❌ | ❌ | ✅ |
| **审核资源** (POST /api/resources/:id/approve) | ❌ | ❌ | ✅ | ✅ |
| **申请成为 Contributor** (POST /api/contributor-applications) | ✅ | ❌ | ❌ | ❌ |
| **查看申请列表** (GET /api/admin/contributor-applications) | ❌ | ❌ | ❌ | ✅ |
| **审核申请** (POST /api/admin/contributor-applications/:id/approve) | ❌ | ❌ | ❌ | ✅ |
| **拒绝申请** (POST /api/admin/contributor-applications/:id/reject) | ❌ | ❌ | ❌ | ✅ |
| **修改用户角色** (PATCH /api/admin/users/:id/role) | ❌ | ❌ | ❌ | ✅ |

---

## 六、错误返回规范

### 401 Unauthorized（未登录）

```json
{
  "error": "unauthorized",
  "message": "Unauthorized, please login first",
  "success": false
}
```

### 403 Forbidden（权限不足）

```json
{
  "error": "permission_denied",
  "message": "You do not have permission to perform this action",
  "success": false
}
```

### 400 Bad Request（请求错误）

```json
{
  "success": false,
  "message": "您已有待审核的申请，请等待审核结果",
  "error": "PENDING_APPLICATION_EXISTS"
}
```

### 404 Not Found（资源不存在）

```json
{
  "success": false,
  "message": "申请不存在",
  "error": "APPLICATION_NOT_FOUND"
}
```

---

## 七、实现细节

### 1. 权限中间件

**位置**：`src/auth/auth.middleware.ts`

- `authGuard`：验证 JWT token，注入 `req.user`
- `requireRole(allowedRoles)`：检查用户角色是否在允许列表中
- `adminGuard`：确保用户角色为 `admin`

### 2. 资源权限中间件

**位置**：`src/resource/resource.permission.middleware.ts`

- `resourcePermissionGuard`：实现资源级别的权限控制
- 对 `contributor` 角色进行 owner 校验

### 3. Contributor 申请服务

**位置**：`src/contributor-application/contributor-application.service.ts`

- `approveApplicationAndUpdateRole`：使用事务确保原子操作（更新申请状态 + 更新用户角色）

---

## 八、相关文件

- **权限中间件**：`src/auth/auth.middleware.ts`
- **管理员中间件**：`src/auth/admin.middleware.ts`
- **资源权限中间件**：`src/resource/resource.permission.middleware.ts`
- **资源路由**：`src/resource/resource.router.ts`
- **Contributor 申请路由**：`src/contributor-application/contributor-application.router.ts`
- **Contributor 申请控制器**：`src/contributor-application/contributor-application.controller.ts`
- **Contributor 申请服务**：`src/contributor-application/contributor-application.service.ts`
- **Contributor 申请模型**：`src/contributor-application/contributor-application.model.ts`
- **数据库迁移脚本**：`scripts/create-contributor-applications-table.sql`

---

## 九、注意事项

1. **所有权限校验都在后端实现**，前端仅用于 UI 展示
2. **即使前端隐藏了按钮，后端也必须做权限校验**
3. **错误返回格式统一**，使用 `error` 和 `message` 字段
4. **Owner 校验仅对 `contributor` 角色生效**，`editor` 和 `admin` 可以操作任意资源
5. **删除资源仅允许 `admin` 角色**，其他角色一律禁止
6. **审核通过申请是原子操作**，使用事务确保申请状态和用户角色同时更新
7. **每个用户只能有一个 `pending` 状态的申请**，通过数据库唯一索引保证

