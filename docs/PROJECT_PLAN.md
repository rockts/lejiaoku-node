# 🏗️ 乐教库项目规划文档

## 📖 项目概述

**乐教库（LeJiaoKu）** 是一款面向 K12 教育场景的教学资源分享平台后端 API，致力于为教师提供便捷的教学资源管理、搜索和分享服务。

---

## 🏛️ 系统架构

### 技术架构

```
┌─────────────────┐
│  前端应用 (Vue) │
└────────┬────────┘
         │ HTTP/HTTPS
         │ RESTful API
┌────────▼─────────────────────────────┐
│      Express.js 后端服务器            │
│  ┌────────────────────────────────┐  │
│  │  路由层 (Router)                │  │
│  │  - auth.router                  │  │
│  │  - post.router                  │  │
│  │  - user.router                  │  │
│  │  - ...                          │  │
│  └────────────┬───────────────────┘  │
│  ┌────────────▼───────────────────┐  │
│  │  中间件层 (Middleware)           │  │
│  │  - 认证中间件                    │  │
│  │  - 错误处理                      │  │
│  │  - 请求验证                      │  │
│  └────────────┬───────────────────┘  │
│  ┌────────────▼───────────────────┐  │
│  │  控制器层 (Controller)           │  │
│  │  - 请求处理                      │  │
│  │  - 响应格式化                    │  │
│  └────────────┬───────────────────┘  │
│  ┌────────────▼───────────────────┐  │
│  │  服务层 (Service)                │  │
│  │  - 业务逻辑                      │  │
│  │  - 数据处理                      │  │
│  └────────────┬───────────────────┘  │
│  ┌────────────▼───────────────────┐  │
│  │  数据访问层 (Model/DAO)          │  │
│  │  - 数据库操作                    │  │
│  └────────────┬───────────────────┘  │
└───────────────┼───────────────────────┘
                │
        ┌───────▼────────┐
        │   MySQL 数据库  │
        └────────────────┘
                │
        ┌───────▼────────┐
        │   文件存储系统   │
        │  (uploads/)     │
        └────────────────┘
```

### 目录结构

```
lejiaoku-node/
├── src/                    # 源代码目录
│   ├── app/               # 应用核心配置
│   │   ├── app.config.ts  # 配置管理
│   │   ├── app.middleware.ts  # 全局中间件
│   │   ├── app.router.ts  # 根路由
│   │   └── database/      # 数据库连接
│   ├── auth/              # 认证模块
│   ├── user/              # 用户模块
│   ├── post/              # 资源/帖子模块
│   ├── file/              # 文件模块
│   ├── cover/             # 封面模块
│   ├── avatar/            # 头像模块
│   ├── tag/               # 标签模块
│   ├── classification/    # 分类模块
│   ├── comment/           # 评论模块
│   ├── like/              # 点赞模块
│   ├── save/              # 收藏模块
│   └── main.ts            # 应用入口
├── dist/                  # 编译输出目录
├── uploads/               # 文件上传目录
│   ├── avatar/           # 头像文件
│   ├── cover/            # 封面文件
│   └── files/            # 其他文件
├── config/                # 配置文件
├── types/                 # 类型定义
├── assets/                # 资源文件
└── package.json           # 项目配置
```

---

## 📦 功能模块规划

### 1. 认证授权模块 (auth)

**功能**:
- 用户注册
- 用户登录（JWT Token）
- Token 刷新
- 密码重置（规划中）
- 权限验证中间件

**数据库表**: `users`

### 2. 用户管理模块 (user)

**功能**:
- 用户信息 CRUD
- 用户列表查询
- 用户权限管理
- 用户状态管理（启用/禁用）

**数据库表**: `users`

### 3. 资源管理模块 (post)

**功能**:
- 资源创建、编辑、删除
- 资源列表查询（支持分页、筛选）
- 资源详情查询
- 资源搜索
- 资源统计（浏览量、下载量）

**数据库表**: `posts`

**关联关系**:
- 关联用户（userId）
- 关联分类（classification）
- 关联标签（tags）
- 关联封面（cover）
- 关联文件（files）

### 4. 分类管理模块 (classification)

**功能**:
- 分类 CRUD
- 分类树结构管理
- 分类资源统计

**数据库表**: `classifications`

### 5. 标签管理模块 (tag)

**功能**:
- 标签 CRUD
- 标签资源关联
- 热门标签统计

**数据库表**: `tags`, `post_tags` (关联表)

### 6. 文件管理模块 (file)

**功能**:
- 文件上传（支持多文件）
- 文件下载
- 文件列表查询
- 文件删除
- 文件类型验证

**存储位置**: `uploads/files/`

### 7. 封面管理模块 (cover)

**功能**:
- 封面上传
- 封面图片处理（压缩、裁剪）
- 封面列表查询
- 封面删除

**存储位置**: `uploads/cover/`

### 8. 头像管理模块 (avatar)

**功能**:
- 头像上传
- 头像图片处理
- 头像更新
- 默认头像

**存储位置**: `uploads/avatar/`

### 9. 评论模块 (comment)

**功能**:
- 评论创建、编辑、删除
- 评论列表查询（支持分页）
- 评论回复（规划中）
- 评论审核（规划中）

**数据库表**: `comments`

### 10. 点赞模块 (like)

**功能**:
- 点赞/取消点赞
- 点赞状态查询
- 点赞统计

**数据库表**: `likes`

### 11. 收藏模块 (save)

**功能**:
- 收藏/取消收藏
- 收藏列表查询
- 收藏统计

**数据库表**: `saves`

---

## 🗄️ 数据库设计

### 核心表结构

#### users 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- name: VARCHAR(50) NOT NULL
- password: VARCHAR(255) NOT NULL
- email: VARCHAR(100) UNIQUE
- avatar: VARCHAR(255)
- role: ENUM('user', 'editor', 'admin') DEFAULT 'user'
- status: ENUM('active', 'inactive') DEFAULT 'active'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### posts 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- title: VARCHAR(200) NOT NULL
- description: TEXT
- user_id: INT FOREIGN KEY (users.id)
- classification_id: INT FOREIGN KEY (classifications.id)
- grade: VARCHAR(20)
- subject: VARCHAR(50)
- version: VARCHAR(50)
- category: VARCHAR(50)
- cover_id: INT FOREIGN KEY (covers.id)
- view_count: INT DEFAULT 0
- download_count: INT DEFAULT 0
- like_count: INT DEFAULT 0
- status: ENUM('draft', 'published', 'deleted') DEFAULT 'draft'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### classifications 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- name: VARCHAR(100) NOT NULL
- category: VARCHAR(50)
- parent_id: INT NULL
- sort_order: INT DEFAULT 0
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### tags 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- name: VARCHAR(50) NOT NULL UNIQUE
- usage_count: INT DEFAULT 0
- created_at: TIMESTAMP
```

#### post_tags 表（关联表）
```sql
- post_id: INT FOREIGN KEY (posts.id)
- tag_id: INT FOREIGN KEY (tags.id)
- PRIMARY KEY (post_id, tag_id)
```

#### comments 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- post_id: INT FOREIGN KEY (posts.id)
- user_id: INT FOREIGN KEY (users.id)
- content: TEXT NOT NULL
- parent_id: INT NULL (用于回复)
- status: ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### likes 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- post_id: INT FOREIGN KEY (posts.id)
- user_id: INT FOREIGN KEY (users.id)
- created_at: TIMESTAMP
- UNIQUE KEY (post_id, user_id)
```

#### saves 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- post_id: INT FOREIGN KEY (posts.id)
- user_id: INT FOREIGN KEY (users.id)
- created_at: TIMESTAMP
- UNIQUE KEY (post_id, user_id)
```

#### files 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- post_id: INT FOREIGN KEY (posts.id)
- filename: VARCHAR(255) NOT NULL
- original_name: VARCHAR(255)
- file_path: VARCHAR(500) NOT NULL
- file_size: BIGINT
- mime_type: VARCHAR(100)
- upload_user_id: INT FOREIGN KEY (users.id)
- created_at: TIMESTAMP
```

#### covers 表
```sql
- id: INT PRIMARY KEY AUTO_INCREMENT
- filename: VARCHAR(255) NOT NULL
- file_path: VARCHAR(500) NOT NULL
- file_size: BIGINT
- width: INT
- height: INT
- upload_user_id: INT FOREIGN KEY (users.id)
- created_at: TIMESTAMP
```

---

## 🔐 安全规划

### 认证与授权

1. **JWT Token 认证**
   - Access Token（短期，15分钟-1小时）
   - Refresh Token（长期，7-30天）
   - Token 黑名单机制

2. **密码安全**
   - bcrypt 加密（salt rounds >= 10）
   - 密码强度要求
   - 密码重置功能

3. **权限管理**
   - 角色：user（普通用户）、editor（编辑）、admin（管理员）
   - 基于角色的访问控制（RBAC）

### 数据安全

1. **输入验证**
   - 参数校验（使用 express-validator 或类似）
   - SQL 注入防护（使用参数化查询）
   - XSS 防护（输入转义）

2. **文件安全**
   - 文件类型白名单
   - 文件大小限制
   - 文件名安全处理
   - 病毒扫描（规划中）

3. **API 安全**
   - CORS 配置
   - 请求频率限制
   - IP 白名单（可选）

---

## 🚀 性能优化规划

### 数据库优化

1. **索引策略**
   - 主键索引
   - 外键索引
   - 查询字段索引（title, user_id, classification_id 等）
   - 复合索引（根据查询模式）

2. **查询优化**
   - 避免 N+1 查询
   - 使用 JOIN 替代多次查询
   - 分页查询优化
   - 慢查询监控

### 缓存策略

1. **Redis 缓存**（规划中）
   - 热点数据缓存
   - 用户会话缓存
   - 统计数据缓存

2. **应用层缓存**
   - 静态配置缓存
   - 频繁查询结果缓存

### 文件处理优化

1. **图片处理**
   - 缩略图生成
   - 多尺寸图片
   - 图片压缩

2. **文件存储**
   - 文件分片上传（规划中）
   - CDN 集成（规划中）

---

## 📊 监控与日志

### 日志系统

1. **日志级别**
   - ERROR: 错误信息
   - WARN: 警告信息
   - INFO: 一般信息
   - DEBUG: 调试信息

2. **日志内容**
   - API 请求日志
   - 错误堆栈
   - 性能指标
   - 业务操作日志

3. **日志存储**
   - 文件日志（本地）
   - 日志轮转
   - 集中日志服务（规划中）

### 监控指标

1. **系统指标**
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率

2. **应用指标**
   - API 响应时间
   - 请求量（QPS）
   - 错误率
   - 数据库连接池状态

---

## 🧪 测试策略

### 单元测试

- 服务层逻辑测试
- 工具函数测试
- 目标覆盖率：> 60%

### 集成测试

- API 端点测试
- 数据库操作测试
- 认证流程测试

### 测试工具

- Jest（单元测试框架）
- Supertest（API 测试）

---

## 📚 API 设计规范

### RESTful API 设计

1. **URL 规范**
   - 使用名词，不用动词
   - 使用复数形式
   - 使用小写字母和连字符

2. **HTTP 方法**
   - GET: 查询资源
   - POST: 创建资源
   - PUT: 更新资源（完整）
   - PATCH: 更新资源（部分）
   - DELETE: 删除资源

3. **响应格式**
   ```json
   {
     "success": true,
     "data": {},
     "message": "操作成功",
     "code": 200
   }
   ```

4. **状态码**
   - 200: 成功
   - 201: 创建成功
   - 400: 请求错误
   - 401: 未认证
   - 403: 无权限
   - 404: 资源不存在
   - 500: 服务器错误

5. **分页格式**
   - 查询参数：`page`, `per_page`
   - 响应头：`X-Total-Count`
   - 响应体：`{ data: [], pagination: { page, per_page, total } }`

---

## 🔄 版本管理

### Git 分支策略

- `main`: 生产环境代码
- `develop`: 开发分支
- `feature/*`: 功能分支
- `bugfix/*`: 缺陷修复分支
- `hotfix/*`: 紧急修复分支

### 版本号规范

使用语义化版本（Semantic Versioning）：
- 主版本号（Major）：不兼容的 API 修改
- 次版本号（Minor）：向下兼容的功能性新增
- 修订号（Patch）：向下兼容的问题修正

---

## 📝 部署规划

### 开发环境

- 本地开发
- 热重载（tsc-watch）
- 环境变量（.env）

### 测试环境

- 独立测试服务器
- 测试数据库
- 自动化测试

### 生产环境

- Docker 容器化
- Nginx 反向代理
- SSL/TLS 证书
- 数据库主从复制（规划中）
- 负载均衡（规划中）

---

## 🎯 未来扩展

### 功能扩展

1. **AI 功能**
   - 自动标签生成
   - 智能推荐
   - 内容审核

2. **数据分析**
   - 用户行为分析
   - 资源热度分析
   - 数据可视化

3. **社交功能**
   - 用户关注
   - 消息通知
   - 资源分享

### 技术升级

1. **微服务架构**（长期规划）
2. **GraphQL API**（可选）
3. **实时通信**（WebSocket）
4. **消息队列**（RabbitMQ/Kafka）

---

## 📞 团队协作

### 代码规范

- TypeScript 严格模式
- ESLint 代码检查
- Prettier 代码格式化
- 代码审查流程

### 文档维护

- API 文档（Swagger）
- 代码注释
- 变更日志
- 开发指南

---

*最后更新：2024年*

