# 测试目录

本目录包含所有测试相关的脚本和文件。

## 目录结构

```
test/
├── README.md                    # 本文件
├── test-user-apis.sh           # 用户API测试脚本（基础版）
├── test-user-apis-fixed.sh     # 用户API测试脚本（修复版）
├── test-user-apis-complete.sh  # 用户API测试脚本（完整版）
├── test-login.js               # 登录功能测试
├── test-register.js            # 注册功能测试
├── test-update-user.js         # 用户更新功能测试
└── test-update-without-password.js  # 无密码更新测试
```

## 使用方法

### 用户API测试

运行完整的用户API测试（注册、登录、修改个人信息）：

```bash
./test/test-user-apis-fixed.sh
```

### Node.js测试脚本

运行Node.js测试脚本：

```bash
# 测试登录
node test/test-login.js

# 测试注册
node test/test-register.js

# 测试用户更新
node test/test-update-user.js
```

## API端点

- **注册**: `POST http://localhost:3333/register`
- **登录**: `POST http://localhost:3333/login`
- **修改个人信息**: `PATCH http://localhost:3333/users` (需要Bearer Token)

## 注意事项

1. 修改个人信息需要使用 `update` 字段包裹数据：
   ```json
   {
     "update": {
       "name": "新用户名",
       "email": "新邮箱"
     }
   }
   ```

2. 所有需要认证的接口都需要在请求头中携带JWT Token：
   ```
   Authorization: Bearer <token>
   ```

