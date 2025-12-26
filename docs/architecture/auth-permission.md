# 后端权限控制系统

## 一、权限中间件

### requireRole

通用权限校验中间件，支持单角色或多角色权限校验。

**位置**：`src/auth/auth.middleware.ts`

**使用方式**：
```typescript
import { authGuard, requireRole } from '../auth/auth.middleware';

// 单角色
router.post('/resources', authGuard, requireRole(['admin']), controller);

// 多角色
router.post('/resources', authGuard, requireRole(['editor', 'admin']), controller);
```

**功能**：
- 必须在 `authGuard` 之后使用
- 检查用户角色是否在允许的角色列表中
- 如果权限不足，返回 403 Forbidden

**错误返回**：
```json
{
  "error": "permission_denied",
  "message": "You do not have permission to perform this action",
  "success": false
}
```

### roleGuard（已废弃）

`roleGuard` 已标记为废弃，保留用于向后兼容。新代码请使用 `requireRole`。

---

## 二、资源接口权限控制

### 1. POST /api/resources（创建资源）

**允许角色**：`contributor` / `editor` / `admin`

**禁止角色**：`user`

**实现**：
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

### 2. PUT /api/resources/:id（编辑资源）

**权限规则**：
- `contributor`：只能修改自己创建的资源（`resource.user_id === req.user.id`）
- `editor` / `admin`：可以修改任意资源
- `user`：禁止

**实现**：
```typescript
router.put(
  '/resources/:id',
  authGuard,
  resourcePermissionGuard, // 内部实现 owner 校验
  updateResourceController.update,
);
```

**Owner 校验逻辑**（在 `resourcePermissionGuard` 中）：
- 如果角色为 `contributor`，校验 `resource.user_id === req.user.id`
- 否则返回 403 Forbidden

**错误返回**：
- 未登录：401 Unauthorized
- user 角色：403 Forbidden
- contributor 修改他人资源：403 Forbidden

---

### 3. DELETE /api/resources/:id（删除资源）

**权限规则**：
- **仅 `admin` 允许删除资源**

**实现**：
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

### 4. POST /api/resources/:id/approve（审核资源）

**权限规则**：
- `editor` / `admin`：允许审核
- `user` / `contributor`：禁止

**功能**：
- 将资源状态从 `pending` 改为 `approved`
- 记录审核人信息（`reviewed_by` 和 `reviewed_at`）

**实现**：
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

## 三、角色权限矩阵

| 操作 | user | contributor | editor | admin |
|------|------|-------------|--------|-------|
| **创建资源** (POST /api/resources) | ❌ | ✅ | ✅ | ✅ |
| **编辑自己的资源** (PUT /api/resources/:id) | ❌ | ✅ | ✅ | ✅ |
| **编辑他人的资源** (PUT /api/resources/:id) | ❌ | ❌ | ✅ | ✅ |
| **删除资源** (DELETE /api/resources/:id) | ❌ | ❌ | ❌ | ✅ |
| **审核资源** (POST /api/resources/:id/approve) | ❌ | ❌ | ✅ | ✅ |

---

## 四、错误返回规范

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
  "error": "invalid_resource_id",
  "message": "Invalid resource ID",
  "success": false
}
```

### 404 Not Found（资源不存在）

```json
{
  "error": "resource_not_found",
  "message": "Resource not found",
  "success": false
}
```

---

## 五、实现细节

### Owner 校验

资源表已有 `user_id` 字段，用于标识资源创建者。

在 `PUT /api/resources/:id` 时：
- 如果角色为 `contributor`，必须校验 `resource.user_id === req.user.id`
- 如果角色为 `editor` 或 `admin`，无需校验 owner

**实现位置**：`src/resource/resource.permission.middleware.ts`

```typescript
// 编辑资源（PUT）权限规则
if (method === 'PUT') {
  // user 角色不允许编辑
  if (userRole === 'user') {
    return response.status(403).json({...});
  }

  // admin 和 editor 可以编辑任何资源
  if (userRole === 'admin' || userRole === 'editor') {
    return next();
  }

  // contributor 只能编辑自己的资源
  if (userRole === 'contributor' && isOwner) {
    return next();
  }
}
```

---

## 六、测试建议

### 1. user token 调用 POST /api/resources

**预期**：403 Forbidden

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"test"}'
```

### 2. contributor 修改他人资源

**预期**：403 Forbidden

```bash
curl -X PUT http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer <contributor_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"updated"}'
```

### 3. editor 审核资源

**预期**：200 OK

```bash
curl -X POST http://localhost:3333/api/resources/1/approve \
  -H "Authorization: Bearer <editor_token>"
```

### 4. admin 删除资源

**预期**：200 OK

```bash
curl -X DELETE http://localhost:3333/api/resources/1 \
  -H "Authorization: Bearer <admin_token>"
```

---

## 七、相关文件

- **权限中间件**：`src/auth/auth.middleware.ts`
- **资源权限中间件**：`src/resource/resource.permission.middleware.ts`
- **资源路由**：`src/resource/resource.router.ts`
- **资源控制器**：`src/resource/resource.controller.ts`

---

## 八、注意事项

1. **所有权限校验都在后端实现**，前端仅用于 UI 展示
2. **即使前端隐藏了按钮，后端也必须做权限校验**
3. **错误返回格式统一**，使用 `error` 和 `message` 字段
4. **Owner 校验仅对 `contributor` 角色生效**，`editor` 和 `admin` 可以操作任意资源
5. **删除资源仅允许 `admin` 角色**，其他角色一律禁止


