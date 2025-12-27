# 角色权限对照表

## 权限矩阵

| 功能 | user | contributor | editor | admin |
|------|------|-------------|--------|-------|
| **资源操作** |
| 查看资源列表 | ✅ | ✅ | ✅ | ✅ |
| 查看资源详情 | ✅ | ✅ | ✅ | ✅ |
| 下载资源 | ✅ | ✅ | ✅ | ✅ |
| 上传资源 | ❌ | ✅ | ✅ | ✅ |
| 编辑自己的资源 | ❌ | ✅ | ✅ | ✅ |
| 编辑他人的资源 | ❌ | ❌ | ✅ | ✅ |
| 删除自己的资源 | ❌ | ✅ | ✅ | ✅ |
| 删除他人的资源 | ❌ | ❌ | ❌ | ✅ |
| 审核资源 | ❌ | ❌ | ✅ | ✅ |
| **用户管理** |
| 查看用户列表 | ✅ | ✅ | ✅ | ✅ |
| 查看用户详情 | ✅ | ✅ | ✅ | ✅ |
| 修改自己的资料 | ✅ | ✅ | ✅ | ✅ |
| 修改用户角色 | ❌ | ❌ | ❌ | ✅ |

## 资源状态规则

| 角色 | 上传资源默认状态 | 说明 |
|------|-----------------|------|
| user | - | 不允许上传 |
| contributor | `pending` | 必须审核 |
| editor | `pending` 或 `approved` | 根据环境变量 `AUTO_APPROVE_RESOURCES` |
| admin | `pending` 或 `approved` | 根据环境变量 `AUTO_APPROVE_RESOURCES` |

## 接口权限保护清单

### 需要权限保护的接口

| 接口 | 方法 | 允许的角色 | 保护方式 |
|------|------|-----------|----------|
| `/api/resources` | POST | contributor, editor, admin | 控制器层检查 |
| `/api/resources/:id` | PUT | contributor(自己的), editor, admin | 中间件 + 控制器 |
| `/api/resources/:id` | DELETE | contributor(自己的), editor(自己的), admin | 中间件 + 控制器 |
| `/api/admin/resources/:id/status` | PATCH | editor, admin | roleGuard |
| `/api/admin/users/:id/role` | PATCH | admin | roleGuard |

### 公开接口（无需登录）

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

*最后更新：2024-12-25*

