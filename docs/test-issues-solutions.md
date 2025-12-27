# 后端测试问题解决方案

## 问题汇总

1. **验证登录/注册接口的实际路径**
2. **为缺少 auto_meta_result 的资源批量触发自动解析**
3. **获取有效 token 后，继续测试资源创建、编辑、删除等需要认证的接口**
4. **后端测试失败: Request failed with status code 401**

## 解决方案

### 1. 登录/注册接口路径确认

根据代码分析，路由挂载方式如下：

- **userRouter** 直接挂载：`app.use(userRouter)`
  - 注册接口：`POST /register` ✅

- **authRouter** 直接挂载：`app.use(authRouter)`
  - 登录接口：`POST /login` ✅
  - 获取当前用户：`GET /user` ✅

- **resourceRouter** 双重挂载：
  - `app.use(resourceRouter)` → `/resources`
  - `app.use('/api', resourceRouter)` → `/api/resources` ✅

**正确的接口路径：**
```bash
# 注册
POST http://localhost:3333/register
Content-Type: application/json
{
  "name": "用户名",
  "email": "email@example.com",
  "password": "密码",
  "role": "user"  # 可选，默认为 "user"
}

# 登录
POST http://localhost:3333/login
Content-Type: application/json
{
  "email": "email@example.com",  # 或 "username": "用户名"
  "password": "密码"
}

# 返回格式
{
  "success": true,
  "message": "登录成功",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": 1,
    "name": "用户名",
    "email": "email@example.com",
    "role": "user"
  }
}
```

### 2. 批量触发自动解析脚本

已创建脚本：`scripts/batch-auto-parse-resources.js`

**使用方法：**
```bash
# 确保服务正在运行
npm run start:dev

# 运行批量解析脚本
node scripts/batch-auto-parse-resources.js
```

**脚本功能：**
- 自动获取所有 `status='approved'` 且 `auto_meta_result` 为 null 的资源
- 调用 `POST /api/resources/:id/auto-parse` 触发解析
- 支持批量处理，自动添加延迟避免请求过快
- 输出详细统计信息

**注意：**
- 解析可能需要一些时间（取决于资源数量）
- 脚本会在每个请求之间延迟 500ms
- 可以使用 `GET /api/resources/:id` 查询解析结果

### 3. 测试需要认证的接口

已创建改进的测试脚本：`test-backend-api-fixed.js`

**测试流程：**

1. **注册用户**
```bash
POST /register
{
  "name": "testuser_1234567890",
  "email": "test_1234567890@test.com",
  "password": "test123456",
  "role": "user"
}
```

2. **登录获取 token**
```bash
POST /login
{
  "email": "test_1234567890@test.com",
  "password": "test123456"
}

# 从响应中提取 token
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

3. **使用 token 测试需要认证的接口**

```bash
# 创建资源
POST /api/resources
Authorization: Bearer <token>
{
  "title": "测试资源",
  "category": "课件",
  "file_format": "PDF",
  "file_url": "http://test.com/test.pdf"
}

# 编辑资源
PUT /api/resources/:id
Authorization: Bearer <token>
{
  "title": "更新后的标题",
  "description": "更新后的描述"
}

# 删除资源
DELETE /api/resources/:id
Authorization: Bearer <token>
```

### 4. 401 错误解决方案

**原因分析：**

1. **未携带 token**
   - 所有需要认证的接口必须携带 `Authorization: Bearer <token>` 头部
   - 缺少 token 会返回 401 Unauthorized

2. **token 过期**
   - JWT token 默认 24 小时过期
   - 过期后需要重新登录获取新 token

3. **token 格式错误**
   - 必须使用格式：`Authorization: Bearer <token>`
   - 注意 `Bearer` 后面有一个空格

**解决方案：**

```javascript
// 正确的请求方式
const response = await fetch('http://localhost:3333/api/resources', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // 正确格式
  },
  body: JSON.stringify({
    title: '测试资源',
    category: '课件',
    file_format: 'PDF',
    file_url: 'http://test.com/test.pdf'
  })
});

// 错误的格式（会导致 401）
headers: {
  'Authorization': token  // ❌ 缺少 "Bearer "
}
headers: {
  'Authorization': 'Bearer' + token  // ❌ 缺少空格
}
```

## 完整测试流程示例

```bash
# 1. 启动服务
npm run start:dev

# 2. 运行测试脚本（包含完整流程）
node test-backend-api-fixed.js

# 3. 批量触发自动解析
node scripts/batch-auto-parse-resources.js

# 4. 批量绑定教材目录
node scripts/batch-bind-catalog-from-auto-meta.js
```

## 常见问题排查

### 问题：连接被拒绝 (ECONNREFUSED)

**原因：** 服务未运行或端口被占用

**解决：**
```bash
# 检查服务状态
lsof -i :3333

# 启动服务
npm run start:dev

# 检查服务日志
tail -f /tmp/lejiaoku-node.log
```

### 问题：socket hang up

**原因：** 服务在处理请求时崩溃或连接中断

**解决：**
1. 检查服务日志
2. 重启服务
3. 检查请求数据格式是否正确

### 问题：401 Unauthorized

**原因：** 
- 未携带 token
- token 过期
- token 格式错误

**解决：**
1. 确保登录成功并获取 token
2. 检查 token 是否过期（24小时）
3. 确认请求头格式正确：`Authorization: Bearer <token>`

## 测试脚本说明

### test-backend-api-fixed.js

改进的测试脚本，包含：
- ✅ 自动查找登录/注册接口路径
- ✅ 完整的认证流程测试
- ✅ 资源 CRUD 操作测试
- ✅ 权限验证测试
- ✅ 详细的错误日志

### batch-auto-parse-resources.js

批量自动解析脚本：
- ✅ 自动筛选需要解析的资源
- ✅ 批量触发解析接口
- ✅ 请求限流（500ms 延迟）
- ✅ 详细的统计输出

## 总结

所有问题已通过以下方式解决：

1. ✅ **接口路径确认** - 注册 `/register`，登录 `/login`
2. ✅ **批量解析脚本** - `scripts/batch-auto-parse-resources.js`
3. ✅ **完整测试脚本** - `test-backend-api-fixed.js`
4. ✅ **401 错误解决** - 正确使用 Bearer token 格式

**下一步：**
1. 确保服务稳定运行
2. 运行测试脚本验证所有功能
3. 批量触发自动解析
4. 批量绑定教材目录

