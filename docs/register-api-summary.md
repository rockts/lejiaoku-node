# 注册接口使用说明

## ✅ 注册接口状态

**`POST /register` - 正常工作** ✅

## 📍 可用的注册接口

### 1. POST /register（推荐使用）

**路由位置**: `userRouter`  
**控制器**: `userController.store`  
**状态**: ✅ 正常工作

**请求示例**:
```bash
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newuser",
    "email": "newuser@example.com",
    "password": "password123"
  }'
```

**响应示例**:
```json
{
  "message": "注册成功",
  "data": {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 5,
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0
  }
}
```

**特点**:
- ✅ 接口可用
- ✅ 用户创建成功
- ⚠️ 不返回 token（需要单独登录获取）

---

### 2. POST /api/register（不可用）

**路由位置**: `authRouter`  
**控制器**: `registerController.register`  
**状态**: ❌ 404 错误

**原因**: `authRouter` 是直接挂载的（没有 `/api` 前缀），所以实际路径是 `/register`，不是 `/api/register`。

**代码位置**: `src/app/index.ts`
```typescript
app.use(
  userRouter,    // /register
  authRouter,    // /register, /login (没有 /api 前缀)
  // ...
);
app.use('/api', resourceRouter);  // /api/resources
app.use('/api', textbookRouter);  // /api/textbook-catalog
```

---

## 🔧 修复方案（如果需要 /api/register）

如果希望 `POST /api/register` 可用，需要修改路由挂载：

```typescript
// 方案 1: 给 authRouter 也加上 /api 前缀
app.use('/api', authRouter);  // /api/register, /api/login

// 方案 2: 保持兼容，同时支持两个路径
app.use(authRouter);  // /register, /login
app.use('/api', authRouter);  // /api/register, /api/login
```

---

## ✅ 当前推荐使用方式

### 注册用户

```bash
POST /register
Content-Type: application/json

{
  "name": "username",
  "email": "user@example.com",
  "password": "password123"
}
```

### 登录获取 Token

```bash
POST /login
Content-Type: application/json

{
  "username": "username",
  "password": "password123"
}
```

---

## 📊 测试结果

| 接口路径 | 状态 | HTTP状态码 | 说明 |
|---------|------|-----------|------|
| `POST /register` | ✅ 正常 | 201 | 用户创建成功 |
| `POST /api/register` | ❌ 404 | 404 | 路径不存在 |
| `POST /login` | ✅ 正常 | 200 | 登录成功 |
| `POST /api/login` | ❌ 404 | 404 | 路径不存在 |

---

## 💡 总结

1. ✅ **`POST /register` 接口正常工作** - 可以成功注册用户
2. ❌ **`POST /api/register` 不可用** - 返回 404（路由未挂载）
3. ✅ **`POST /login` 接口正常工作** - 可以成功登录获取 token

**建议**: 使用 `POST /register` 注册，然后使用 `POST /login` 登录获取 token。

