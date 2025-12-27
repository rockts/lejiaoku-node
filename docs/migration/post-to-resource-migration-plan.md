# Post → Resource 迁移收敛计划

## 一、当前状态分析

### 1.1 Post 模块核心功能
Post 模块提供以下接口：
- `GET /posts` - 资源列表
- `POST /posts` - 创建资源
- `PATCH /posts/:postId` - 更新资源
- `DELETE /posts/:postId` - 删除资源
- `GET /posts/:postId` - 单个资源详情
- `POST /posts/:postId/tag` - 添加标签
- `DELETE /posts/:postId/tag` - 移除标签

### 1.2 Resource 模块核心功能（已实现）
Resource 模块提供以下接口：
- `GET /api/resources` - 资源列表 ✅
- `POST /api/resources` - 创建资源 ✅
- `GET /api/resources/:id` - 单个资源详情 ✅
- `GET /api/my/resources` - 我的资源列表 ✅
- `GET /api/admin/resources` - 管理员资源列表 ✅
- `PATCH /api/admin/resources/:id/status` - 审核资源状态 ✅
- `GET /api/resources/:id/download` - 下载资源 ✅
- `POST /api/resources/:id/auto-parse` - 自动解析资源结构 ✅

### 1.3 依赖 Post 的其他模块

#### 直接依赖 Post 路由的模块：
1. **Like 模块** - `/posts/:postId/like` (POST/DELETE)
   - 用途：点赞/取消点赞
   - 状态：需要迁移到 `/api/resources/:id/like`
   - 优先级：中（功能完整，但使用频率高）

2. **Save 模块** - `/posts/:postId/save` (POST/DELETE)
   - 用途：收藏/取消收藏
   - 状态：需要迁移到 `/api/resources/:id/save`
   - 优先级：中（功能完整，但使用频率高）

3. **Comment 模块** - 使用 `postId` 字段关联
   - 用途：评论功能
   - 状态：需要迁移到 `resourceId`
   - 优先级：高（核心社交功能）

4. **File 模块** - 使用 `postId` 字段关联
   - 用途：文件上传和管理
   - 状态：**已部分迁移**（resource 已有 file_url，但 file 表仍使用 postId）
   - 优先级：低（resource 已直接存储文件）

5. **Cover 模块** - 使用 `postId` 字段关联
   - 用途：封面图片上传
   - 状态：**已部分迁移**（resource 已有 cover_url，但 cover 表仍使用 postId）
   - 优先级：低（resource 已直接存储封面）

6. **Classification 模块** - 从 `post` 表查询分类
   - 用途：获取分类列表（category, grade, subject, version）
   - 状态：需要迁移到从 `resource` 表查询
   - 优先级：高（前端依赖的分类数据）

## 二、迁移清单

### 2.1 可立即废弃（不删除，标注 deprecated）

#### Post 路由模块 (`src/post/post.router.ts`)
- ✅ **状态**：标记为 deprecated，保留代码
- ✅ **原因**：Resource 模块已完整替代
- ✅ **操作**：添加 `@deprecated` 注释，不删除代码

#### Post 控制器 (`src/post/post.controller.ts`)
- ✅ **状态**：标记为 deprecated，保留代码
- ✅ **原因**：Resource 控制器已完整替代
- ✅ **操作**：添加 `@deprecated` 注释

#### Post 服务 (`src/post/post.service.ts`)
- ✅ **状态**：标记为 deprecated，保留代码
- ✅ **原因**：Resource 服务已完整替代
- ⚠️ **注意**：部分类型定义被其他模块引用，需保留

#### Post 中间件 (`src/post/post.middleware.ts`)
- ✅ **状态**：标记为 deprecated，保留代码
- ⚠️ **注意**：类型定义被 `types/express.d.ts` 引用，需保留

### 2.2 需迁移后删除（保留到迁移完成）

#### Like 模块
- **文件**：`src/like/like.router.ts`, `src/like/like.service.ts`, `src/like/like.controller.ts`
- **当前路由**：`/posts/:postId/like`
- **目标路由**：`/api/resources/:id/like`
- **数据库表**：`user_like_post` 需要支持 `resourceId`（或创建 `user_like_resource`）
- **优先级**：中

#### Save 模块
- **文件**：`src/save/save.router.ts`, `src/save/save.service.ts`, `src/save/save.controller.ts`
- **当前路由**：`/posts/:postId/save`
- **目标路由**：`/api/resources/:id/save`
- **数据库表**：`user_save_post` 需要支持 `resourceId`（或创建 `user_save_resource`）
- **优先级**：中

#### Comment 模块
- **文件**：`src/comment/comment.*.ts`
- **当前关联**：`comment.postId`
- **目标关联**：`comment.resourceId`
- **数据库表**：`comment` 表需要添加 `resourceId` 字段
- **优先级**：高
- **注意事项**：
  - `comment.provider.ts` 中引用了 `post.service.ts` 的类型
  - `comment.middleware.ts` 中使用 `post` 查询参数
  - `comment.service.ts` 中引用了 `post.service.ts` 的类型定义

#### Classification 模块
- **文件**：`src/classification/classification.service.ts`
- **当前查询**：从 `post` 表查询 DISTINCT 值
- **目标查询**：从 `resource` 表查询 DISTINCT 值
- **优先级**：高
- **影响**：前端依赖的分类筛选数据

#### File 模块
- **文件**：`src/file/file.controller.ts`, `src/file/file.model.ts`, `src/file/file.service.ts`
- **当前关联**：`file.postId`
- **目标关联**：`file.resourceId`（可选，resource 已有 file_url）
- **优先级**：低（resource 已直接存储文件路径）
- **建议**：保留支持，但新资源优先使用 resource.file_url

#### Cover 模块
- **文件**：`src/cover/cover.controller.ts`, `src/cover/cover.model.ts`, `src/cover/cover.service.ts`
- **当前关联**：`cover.postId`
- **目标关联**：`cover.resourceId`（可选，resource 已有 cover_url）
- **优先级**：低（resource 已直接存储封面路径）
- **建议**：保留支持，但新资源优先使用 resource.cover_url

### 2.3 可长期保留但不使用（类型定义等）

#### 类型定义
- **文件**：`types/express.d.ts`
- **用途**：Express Request 类型扩展
- **状态**：需更新以支持 Resource，但保留 Post 类型定义以向后兼容
- **操作**：添加 Resource 类型，保留 Post 类型（标记为 deprecated）

#### Post Model
- **文件**：`src/post/post.model.ts`
- **用途**：类型定义
- **状态**：保留（可能被其他代码引用）

#### Post Provider
- **文件**：`src/post/post.provider.ts`
- **用途**：SQL 片段定义
- **状态**：保留（被 comment 等模块间接引用）

## 三、数据库迁移计划

### 3.1 需要新增字段的表
1. **comment 表**
   ```sql
   ALTER TABLE comment ADD COLUMN resource_id INT NULL COMMENT '关联的资源ID';
   ```

2. **user_like_post 表**（可选方案）
   - 方案A：添加 `resource_id` 字段
   - 方案B：创建新表 `user_like_resource`

3. **user_save_post 表**（可选方案）
   - 方案A：添加 `resource_id` 字段
   - 方案B：创建新表 `user_save_resource`

### 3.2 可选迁移的表
1. **file 表**：添加 `resource_id`（resource 已有 file_url，可选）
2. **cover 表**：添加 `resource_id`（resource 已有 cover_url，可选）

### 3.3 不需要迁移的表
- **post_tag 表**：post 专用的标签关联表，保留即可
- **post 表**：保留历史数据，不删除

## 四、迁移步骤建议

### Phase 1: 标注 Deprecated（本次任务）✅
- [x] 标注 post 路由为 deprecated
- [x] 更新 app/index.ts 注释
- [x] 生成迁移清单文档

### Phase 2: 核心功能迁移（后续）
1. **Classification 迁移**（优先级：高）
   - 修改 `classification.service.ts` 从 resource 表查询
   - 测试分类数据正确性

2. **Comment 迁移**（优先级：高）
   - 数据库：添加 `comment.resource_id` 字段
   - 代码：更新 comment 模块支持 resourceId
   - 路由：保持不变（comment 不依赖 post 路由）

3. **Like/Save 迁移**（优先级：中）
   - 数据库：创建 `user_like_resource` 和 `user_save_resource` 表（或添加字段）
   - 路由：新增 `/api/resources/:id/like` 和 `/api/resources/:id/save`
   - 代码：更新 like/save 模块

### Phase 3: 可选功能迁移（低优先级）
1. File/Cover 表迁移（如果确实需要）

### Phase 4: 数据迁移（最后）
1. 将现有 post 数据迁移到 resource（如需要）
2. 迁移关联数据（comment, like, save 等）

## 五、风险与注意事项

### 5.1 风险点
1. **类型定义依赖**：`types/express.d.ts` 中引用了 Post 相关类型，需同时支持
2. **Comment 模块依赖**：`comment.service.ts` 和 `comment.provider.ts` 引用了 Post 类型
3. **前端兼容性**：前端可能仍在使用 `/posts` 接口，需逐步迁移

### 5.2 注意事项
1. **不删除历史代码**：本次任务仅标注 deprecated，不删除代码
2. **向后兼容**：保留 Post 类型定义和接口，确保现有功能可用
3. **数据库安全**：数据库迁移需谨慎，建议先备份
4. **测试覆盖**：迁移后需充分测试相关功能

## 六、完成标准

- ✅ Post 路由已标注为 deprecated
- ✅ App 路由配置已更新注释
- ✅ 迁移清单文档已生成
- ✅ 不影响现有接口可用性
- ✅ Resource 成为唯一业务模型（新功能）

---

**更新时间**：2024-12-24
**状态**：Phase 1 进行中

