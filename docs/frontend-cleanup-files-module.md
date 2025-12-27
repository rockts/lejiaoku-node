# 前端清理 File 模块的 Prompt

## 任务说明

后端已移除废弃的 File 模块，统一使用 Resource 模块进行文件管理。前端需要清理所有与 File 模块相关的代码和 API 调用。

---

## 需要清理的内容

### 1. API 接口调用

**废弃的接口**（需要删除）：
- `POST /files` - 文件上传接口
- `GET /files/:fileId/` - 文件服务接口
- `GET /files/:fileId/metadata` - 文件信息接口
- `DELETE /files/:fileId` - 删除文件接口

**替代方案**：
- 使用 `POST /resources` 接口上传资源文件（支持同时上传资源文件和封面）
- 使用 `GET /resources/:id` 获取资源信息（包含 file_url）
- 使用 `GET /resources/:id/download` 下载资源文件
- 使用 `DELETE /resources/:id` 删除资源（会同时删除关联的文件）

### 2. 代码文件

需要检查并删除以下相关代码：
- File 相关的 API 服务文件（如 `api/file.ts`, `services/fileService.ts` 等）
- File 相关的类型定义（如 `types/file.ts`, `interfaces/File.ts` 等）
- File 相关的组件（如 `FileUpload.vue`, `FileList.vue` 等，如果只用于 File 模块）
- File 相关的工具函数（如 `utils/fileHelper.ts` 等，如果只用于 File 模块）

### 3. 路由和页面

需要检查并删除：
- File 相关的路由配置
- File 相关的页面组件（如文件列表页、文件上传页等，如果只用于 File 模块）

### 4. 状态管理

需要检查并清理：
- File 相关的 Vuex/Redux store 模块
- File 相关的状态管理代码

---

## 迁移指南

### 文件上传迁移

**旧代码（File 模块）**：
```javascript
// 上传文件
const formData = new FormData();
formData.append('file', file);
const response = await api.post('/files', formData);
const fileId = response.data.id;
```

**新代码（Resource 模块）**：
```javascript
// 上传资源（支持同时上传文件和封面）
const formData = new FormData();
formData.append('file', resourceFile);
formData.append('cover', coverFile); // 可选
formData.append('title', '资源标题');
formData.append('category', '教案');
// ... 其他资源字段

const response = await api.post('/resources', formData);
const resourceId = response.data.id;
```

### 文件下载迁移

**旧代码（File 模块）**：
```javascript
// 下载文件
window.open(`/files/${fileId}/`);
```

**新代码（Resource 模块）**：
```javascript
// 下载资源文件
window.open(`/resources/${resourceId}/download`);
```

### 文件信息获取迁移

**旧代码（File 模块）**：
```javascript
// 获取文件信息
const response = await api.get(`/files/${fileId}/metadata`);
const fileInfo = response.data;
```

**新代码（Resource 模块）**：
```javascript
// 获取资源信息（包含文件信息）
const response = await api.get(`/resources/${resourceId}`);
const resource = response.data;
// resource.file_url 包含文件URL
// resource.file_format 包含文件格式
```

---

## 检查清单

- [ ] 删除所有 File 模块的 API 调用
- [ ] 删除 File 相关的类型定义
- [ ] 删除 File 相关的组件（如果只用于 File 模块）
- [ ] 删除 File 相关的路由配置
- [ ] 删除 File 相关的状态管理代码
- [ ] 将所有文件上传功能迁移到 Resource 模块
- [ ] 将所有文件下载功能迁移到 Resource 模块
- [ ] 测试文件上传功能
- [ ] 测试文件下载功能
- [ ] 测试资源列表显示
- [ ] 测试资源详情显示

---

## 注意事项

1. **数据兼容性**：如果数据库中还有旧的 File 数据，需要确认是否需要迁移
2. **URL 变更**：File 模块的文件 URL 格式为 `/files/:fileId/`，Resource 模块的文件 URL 格式为 `/uploads/resources/:filename`
3. **权限验证**：Resource 模块的文件上传需要用户登录（authGuard）
4. **文件大小限制**：Resource 模块的文件大小限制为 20MB

---

## 相关文档

- Resource 模块 API 文档：`docs/API.md`
- Resized 图片 API 文档：`docs/resized-api-documentation.md`
