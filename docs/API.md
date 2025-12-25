# 乐教库 API 接口文档

**基础信息：**
- 服务地址：`http://localhost:3000`
- API 前缀：部分接口支持 `/api` 前缀
- 认证方式：JWT Token（Bearer Token）

---

## 一、认证相关 (Auth)

### 1. 用户登录
- **POST** `/login`
- 请求体：`{ username, password }`
- 返回：JWT Token

### 2. 验证登录
- **POST** `/auth/validate`
- 需要认证：是
- 返回：当前用户信息

### 3. 获取当前用户
- **GET** `/user`
- 需要认证：是
- 返回：当前用户信息

---

## 二、用户管理 (User)

### 1. 用户注册
- **POST** `/register`
- 请求体：`{ username, password, nickname, ... }`

### 2. 用户列表
- **GET** `/users/`
- 需要认证：否

### 3. 用户详情
- **GET** `/users/:userId`
- 需要认证：否

### 4. 更新用户
- **PATCH** `/users`
- 需要认证：是
- 请求体：`{ nickname, ... }`

### 5. 删除用户
- **DELETE** `/users/:userId`
- 需要认证：是

---

## 三、资源管理 (Resource) - 新版本

### 1. 资源列表
- **GET** `/resources` 或 `/api/resources`
- 查询参数：
  - `keyword`: 关键词搜索
  - `category`: 教学用途（教材/教案/课件/习题/视频/其他）
  - `subject`: 学科
  - `grade`: 年级
  - `textbook`: 教材版本
  - `page`: 页码
  - `per_page`: 每页数量

### 2. 我的资源列表
- **GET** `/my/resources`
- 需要认证：是
- 返回：当前用户的所有资源

### 3. 资源详情
- **GET** `/resources/:id` 或 `/api/resources/:id`
- 需要认证：否

### 4. 获取资源自动解析元数据
- **GET** `/resources/:id/auto-meta`
- 返回：资源的自动解析元数据

### 5. 自动解析资源结构
- **POST** `/resources/:id/auto-parse`
- 需要认证：是

### 6. 下载资源文件
- **GET** `/resources/:id/download`
- 需要认证：否
- 返回：文件下载

### 7. 创建资源
- **POST** `/resources` 或 `/api/resources`
- 需要认证：是（contributor 角色）
- 请求体：multipart/form-data
  - `title`: 标题（必填）
  - `category`: 分类（必填）
  - `file`: 资源文件（必填）
  - `cover`: 封面图片（可选）
  - `description`: 描述（可选）
  - `subject`: 学科（可选）
  - `grade`: 年级（可选）
  - `textbook`: 教材版本（可选）

### 8. 管理员资源列表
- **GET** `/admin/resources`
- 需要认证：是（admin 角色）
- 返回：所有状态的资源（用于审核）

### 9. 审核资源状态
- **PATCH** `/admin/resources/:id/status`
- 需要认证：是（admin 角色）
- 请求体：`{ status: 'approved' | 'rejected' }`

---

## 四、内容管理 (Post) - 旧版本

### 1. 内容列表
- **GET** `/posts`
- 查询参数：`sort`, `filter`, `page`, `per_page`

### 2. 内容详情
- **GET** `/posts/:postId`
- 需要认证：否

### 3. 创建内容
- **POST** `/posts`
- 需要认证：是

### 4. 更新内容
- **PATCH** `/posts/:postId`
- 需要认证：是（仅作者）

### 5. 删除内容
- **DELETE** `/posts/:postId`
- 需要认证：是（仅作者）

### 6. 添加内容标签
- **POST** `/posts/:postId/tag`
- 需要认证：是（仅作者）

### 7. 移除内容标签
- **DELETE** `/posts/:postId/tag`
- 需要认证：是（仅作者）

---

## 五、评论 (Comment)

### 1. 评论列表
- **GET** `/comments`
- 查询参数：`filter`, `page`, `per_page`

### 2. 发表评论
- **POST** `/comments`
- 需要认证：是
- 请求体：`{ content, postId, ... }`

### 3. 回复评论
- **POST** `/comments/:commentId/reply`
- 需要认证：是
- 请求体：`{ content }`

### 4. 修改评论
- **PATCH** `/comments/:commentId`
- 需要认证：是（仅作者）

### 5. 删除评论
- **DELETE** `/comments/:commentId`
- 需要认证：是（仅作者）

### 6. 回复列表
- **GET** `/comments/:commentId/replies`
- 需要认证：否

---

## 六、点赞 (Like)

### 1. 点赞内容
- **POST** `/posts/:postId/like`
- 需要认证：是

### 2. 取消点赞
- **DELETE** `/posts/:postId/like`
- 需要认证：是

---

## 七、收藏 (Save)

### 1. 收藏内容
- **POST** `/posts/:postId/save`
- 需要认证：是

### 2. 取消收藏
- **DELETE** `/posts/:postId/save`
- 需要认证：是

---

## 八、标签 (Tag)

### 1. 创建标签
- **POST** `/tags`
- 需要认证：是
- 请求体：`{ name }`

---

## 九、分类 (Classification)

### 1. 分类列表
- **GET** `/classifications`
- 需要认证：否

### 2. 获取分类子项
- **GET** `/classifications/category` - 获取类别列表
- **GET** `/classifications/grade` - 获取年级列表
- **GET** `/classifications/version` - 获取版本列表
- **GET** `/classifications/subject` - 获取学科列表

---

## 十、教材管理 (Textbook)

### 1. 获取所有教材目录骨架
- **GET** `/textbook-catalog` 或 `/api/textbook-catalog`
- 需要认证：否

### 2. 绑定资源与教材目录
- **POST** `/resources/:id/bind-textbook` 或 `/api/resources/:id/bind-textbook`
- 需要认证：是
- 请求体：`{ textbookId, chapterId, ... }`

### 3. 获取教材信息
- **GET** `/textbooks/:id` 或 `/api/textbooks/:id`
- 需要认证：否

### 4. 根据资源ID获取教材信息
- **GET** `/textbooks/by-resource/:resourceId` 或 `/api/textbooks/by-resource/:resourceId`
- 需要认证：否

---

## 十一、文件管理 (File)

### 1. 上传文件
- **POST** `/files`
- 需要认证：是
- 请求体：multipart/form-data，字段名：`file`

### 2. 删除文件
- **DELETE** `/files/:fileId`
- 需要认证：是

### 3. 文件服务
- **GET** `/files/:fileId/`
- 需要认证：否
- 返回：文件内容

### 4. 文件信息
- **GET** `/files/:fileId/metadata`
- 需要认证：否
- 返回：文件元数据

---

## 十二、封面管理 (Cover)

### 1. 上传封面
- **POST** `/covers`
- 需要认证：是
- 请求体：multipart/form-data，字段名：`cover`

### 2. 删除封面
- **DELETE** `/covers/:coverId`
- 需要认证：是

### 3. 封面服务
- **GET** `/covers/:coverId`
- 需要认证：否
- 返回：封面图片

### 4. 封面信息
- **GET** `/covers/:coverId/metadata`
- 需要认证：否
- 返回：封面元数据

---

## 十三、头像管理 (Avatar)

### 1. 上传头像
- **POST** `/avatar`
- 需要认证：是
- 请求体：multipart/form-data，字段名：`avatar`

### 2. 删除头像
- **DELETE** `/avatar/:avatarId`
- 需要认证：是

### 3. 头像服务
- **GET** `/users/:userId/avatar`
- 需要认证：否
- 返回：用户头像

---

## 响应格式

### 成功响应
```json
{
  "code": "SUCCESS",
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "code": "ERROR_CODE",
  "message": "错误信息"
}
```

---

## 认证方式

在请求头中添加：
```
Authorization: Bearer <token>
```

---

## 静态文件

上传的文件可通过以下路径访问：
- 资源文件：`http://localhost:3000/uploads/files/{filename}`
- 封面图片：`http://localhost:3000/uploads/cover/{filename}`
- 头像图片：`http://localhost:3000/uploads/avatar/{filename}`


