# 📜 乐教库开发规则与规范

## 🎯 目标

本文档定义了乐教库后端项目的开发规则、编码规范和最佳实践，旨在保证代码质量、可维护性和团队协作效率。

---

## 📁 项目结构规范

### 目录命名

- 使用小写字母和连字符：`user-profile`（不推荐：`UserProfile`, `user_profile`）
- 模块目录使用单数形式：`user`, `post`, `tag`

### 文件命名

- TypeScript 文件：`kebab-case.ts`，如 `user.controller.ts`
- 测试文件：`*.test.ts` 或 `*.spec.ts`
- 配置文件：`kebab-case.config.ts`

### 模块文件组织

每个功能模块应包含以下文件：

```
module-name/
├── module-name.controller.ts    # 控制器：处理 HTTP 请求
├── module-name.service.ts       # 服务层：业务逻辑
├── module-name.model.ts         # 数据模型：数据结构定义
├── module-name.middleware.ts    # 中间件：该模块专用中间件
├── module-name.router.ts        # 路由：路由定义
└── module-name.test.ts          # 测试文件（可选）
```

---

## 💻 编码规范

### TypeScript 规范

#### 基本规则

1. **使用严格模式**
   ```typescript
   // tsconfig.json
   {
     "strict": true,
     "noImplicitAny": true,
     "strictNullChecks": true
   }
   ```

2. **类型定义**
   - 优先使用接口（interface）定义对象类型
   - 使用类型别名（type）定义联合类型、函数类型
   - 避免使用 `any`，使用 `unknown` 或具体类型

   ```typescript
   // ✅ 推荐
   interface UserModel {
     id: number;
     name: string;
     email?: string;
   }

   type Status = 'active' | 'inactive';

   // ❌ 不推荐
   const user: any = { ... };
   ```

3. **命名规范**
   - 类名：`PascalCase`，如 `UserController`
   - 接口名：`PascalCase`，如 `UserModel`
   - 变量/函数名：`camelCase`，如 `getUserById`
   - 常量：`UPPER_SNAKE_CASE`，如 `MAX_FILE_SIZE`
   - 私有属性：前缀 `_`，如 `_privateMethod`

#### 代码风格

1. **导入顺序**
   ```typescript
   // 1. Node.js 内置模块
   import fs from 'fs';
   import path from 'path';

   // 2. 第三方库
   import express from 'express';
   import bcrypt from 'bcrypt';

   // 3. 项目内部模块（按路径层级排序）
   import { UserModel } from './user.model';
   import { userService } from './user.service';
   import { currentUser } from '../auth/auth.middleware';
   ```

2. **导出规范**
   ```typescript
   // ✅ 推荐：命名导出
   export class UserController { ... }
   export function getUser() { ... }

   // ✅ 推荐：默认导出（主要用于路由、主类）
   export default router;

   // ❌ 避免混用
   ```

3. **注释规范**
   ```typescript
   /**
    * 获取用户信息
    * @param userId 用户 ID
    * @returns 用户对象或 null
    */
   async getUserById(userId: number): Promise<UserModel | null> {
     // 实现代码
   }
   ```

### 代码组织

#### 控制器（Controller）

- 职责：处理 HTTP 请求和响应，调用服务层
- 原则：
  - 保持简洁，不包含业务逻辑
  - 负责参数验证、响应格式化
  - 一个控制器方法对应一个路由端点

  ```typescript
  // ✅ 推荐
  export const index = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const { page = 1, perPage = 10 } = request.query;
      const result = await userService.getUsers({ page, perPage });
      response.send(result);
    } catch (error) {
      next(error);
    }
  };
  ```

#### 服务层（Service）

- 职责：业务逻辑处理，数据库操作
- 原则：
  - 可复用、可测试
  - 不依赖 HTTP 请求对象
  - 返回业务数据，不处理响应格式

  ```typescript
  // ✅ 推荐
  export const getUserById = async (userId: number): Promise<UserModel | null> => {
    // 业务逻辑
    return await userModel.findById(userId);
  };
  ```

#### 数据模型（Model）

- 职责：数据结构定义，数据库操作封装
- 原则：
  - 只包含数据结构和数据访问方法
  - 不包含业务逻辑

  ```typescript
  // ✅ 推荐
  export class UserModel {
    id?: number;
    name?: string;
    email?: string;
    created_at?: Date;
  }

  export const findById = async (id: number): Promise<UserModel | null> => {
    // 数据库查询
  };
  ```

---

## 🔒 安全规范

### 认证与授权

1. **密码处理**
   - 使用 bcrypt 加密，salt rounds >= 10
   - 不在日志中记录密码
   - 密码重置功能需要验证机制

   ```typescript
   import bcrypt from 'bcrypt';
   const SALT_ROUNDS = 10;

   // 加密
   const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

   // 验证
   const isValid = await bcrypt.compare(password, hashedPassword);
   ```

2. **JWT Token**
   - Token 过期时间合理设置
   - 敏感操作需要额外验证
   - 实现 Token 刷新机制

3. **权限检查**
   - 使用中间件进行权限验证
   - 资源级别的权限控制

### 输入验证

1. **参数验证**
   - 所有用户输入必须验证
   - 验证数据类型、格式、长度
   - 使用参数化查询防止 SQL 注入

   ```typescript
   // ✅ 推荐：使用参数化查询
   const query = 'SELECT * FROM users WHERE id = ?';
   connection.query(query, [userId], callback);

   // ❌ 危险：字符串拼接
   const query = `SELECT * FROM users WHERE id = ${userId}`;
   ```

2. **文件上传**
   - 验证文件类型（白名单）
   - 限制文件大小
   - 检查文件扩展名
   - 重命名文件防止路径遍历

   ```typescript
   const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
   const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

   if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
     throw new Error('不支持的文件类型');
   }

   if (file.size > MAX_FILE_SIZE) {
     throw new Error('文件大小超过限制');
   }
   ```

### 错误处理

1. **错误信息**
   - 不向客户端暴露敏感信息（数据库错误、内部路径等）
   - 使用友好的错误消息
   - 记录详细错误日志到服务器

   ```typescript
   // ✅ 推荐
   try {
     // 操作
   } catch (error) {
     console.error('详细错误信息（仅服务器日志）:', error);
     response.status(500).send({
       success: false,
       message: '操作失败，请稍后重试',
       code: 500
     });
   }
   ```

---

## 🧪 测试规范

### 测试文件

- 测试文件与被测文件同目录或 `__tests__` 目录
- 命名：`*.test.ts` 或 `*.spec.ts`

### 测试结构

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('应该返回用户信息', async () => {
      // Arrange（准备）
      const userId = 1;
      
      // Act（执行）
      const user = await userService.getUserById(userId);
      
      // Assert（断言）
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });

    it('用户不存在时应该返回 null', async () => {
      // ...
    });
  });
});
```

### 测试覆盖率

- 目标：核心业务逻辑 > 60%
- 重点测试：服务层、工具函数
- 使用 Jest 覆盖率报告

---

## 🔄 Git 工作流规范

### 分支命名

- `feature/功能名称`：新功能开发
- `bugfix/问题描述`：缺陷修复
- `hotfix/问题描述`：紧急修复
- `refactor/重构内容`：代码重构

### 提交信息规范

使用约定式提交（Conventional Commits）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：
```
feat(user): 添加用户注册功能

- 实现用户注册 API
- 添加邮箱验证
- 完善错误处理

Closes #123
```

### 代码审查

- 所有代码合并前需要代码审查
- 审查重点：
  - 代码规范和风格
  - 业务逻辑正确性
  - 安全性问题
  - 性能问题
  - 测试覆盖

---

## 📊 性能规范

### 数据库查询

1. **避免 N+1 查询**
   ```typescript
   // ❌ 不推荐
   const posts = await getPosts();
   for (const post of posts) {
     post.user = await getUserById(post.userId);
   }

   // ✅ 推荐：使用 JOIN 或批量查询
   const posts = await getPostsWithUsers();
   ```

2. **使用索引**
   - 为常用查询字段添加索引
   - 为外键添加索引
   - 避免全表扫描

3. **分页查询**
   - 列表查询必须分页
   - 合理设置每页数量（默认 10-20 条）
   - 使用 LIMIT 和 OFFSET

### 异步处理

1. **使用 async/await**
   ```typescript
   // ✅ 推荐
   const result = await someAsyncOperation();

   // ❌ 避免：回调地狱
   someAsyncOperation((err, result) => {
     anotherAsyncOperation((err, result) => {
       // ...
     });
   });
   ```

2. **错误处理**
   ```typescript
   // ✅ 推荐
   try {
     const result = await asyncOperation();
   } catch (error) {
     // 错误处理
   }
   ```

### 资源管理

1. **数据库连接**
   - 使用连接池
   - 及时关闭连接
   - 避免连接泄漏

2. **文件处理**
   - 及时释放文件流
   - 大文件使用流式处理
   - 清理临时文件

---

## 📝 文档规范

### 代码注释

1. **函数注释**
   - 使用 JSDoc 格式
   - 说明参数、返回值、异常

   ```typescript
   /**
    * 根据 ID 获取用户信息
    * @param userId - 用户 ID
    * @returns 用户对象，不存在返回 null
    * @throws {Error} 当数据库查询失败时抛出
    */
   async getUserById(userId: number): Promise<UserModel | null> {
     // ...
   }
   ```

2. **复杂逻辑注释**
   - 解释“为什么”而不是“是什么”
   - 说明业务规则和算法思路

### API 文档

- 使用 Swagger/OpenAPI 生成 API 文档
- 包含请求示例、响应示例
- 说明参数、错误码

---

## 🚫 禁止事项

1. **安全禁止**
   - ❌ 禁止在代码中硬编码密码、密钥
   - ❌ 禁止直接拼接 SQL 语句
   - ❌ 禁止向客户端暴露敏感错误信息
   - ❌ 禁止跳过输入验证

2. **代码质量禁止**
   - ❌ 禁止提交 `console.log` 调试代码
   - ❌ 禁止使用 `any` 类型（除非必要）
   - ❌ 禁止提交格式化的代码
   - ❌ 禁止提交注释掉的代码

3. **性能禁止**
   - ❌ 禁止在循环中进行数据库查询
   - ❌ 禁止查询所有数据再在内存中过滤
   - ❌ 禁止上传超大文件（需限制大小）

---

## ✅ 代码审查清单

在提交代码前，检查以下事项：

- [ ] 代码符合 TypeScript 规范
- [ ] 代码已格式化（Prettier）
- [ ] 没有 ESLint 错误
- [ ] 已添加必要的注释
- [ ] 已编写/更新测试
- [ ] 已更新相关文档
- [ ] 已进行安全检查
- [ ] 已进行性能考虑
- [ ] 错误处理完善
- [ ] 提交信息符合规范

---

## 🔧 工具配置

### Prettier 配置

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### ESLint 配置

- 使用 TypeScript ESLint 插件
- 启用推荐规则
- 自定义项目特定规则

---

*最后更新：2024年*

