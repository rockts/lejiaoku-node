# uploads 目录结构说明

## 目录用途

### 1. `uploads/avatar/resized/` 目录

**用途**：存储调整尺寸后的头像图片

**生成尺寸**：
- `large`: 256x256 像素（正方形）
- `medium`: 128x128 像素（正方形）
- `small`: 64x64 像素（正方形）

**目的**：优化性能，不同场景使用不同尺寸的图片，减少带宽和加载时间

**代码位置**：`src/avatar/avatar.middleware.ts` 的 `avatarProcessor` 函数

---

### 2. `uploads/cover/resized/` 目录

**用途**：存储调整尺寸后的封面图片

**生成尺寸**：
- `large`: 1280px 宽度（自动高度）
- `medium`: 640px 宽度（自动高度）
- `thumbnail`: 320px 宽度（自动高度）

**目的**：优化性能，不同场景使用不同尺寸的图片

**代码位置**：`src/cover/cover.service.ts` 的 `imageResizer` 函数

---

### 3. `uploads/files/` 目录

**用途**：存储通用文件上传（图片、PDF、Office文档等）

**支持的文件类型**：
- 图片：PNG, JPEG, JPG, GIF, BMP
- PDF：application/pdf
- Office文档：DOC, DOCX, PPT, PPTX, XLS, XLSX

**问题**：文件没有扩展名，所以无法直接打开

**原因**：
- `file.middleware.ts` 中使用了 `multer({ dest: 'uploads/files' })`
- 这种配置会生成随机文件名（如 `77869c7c5765ebc0452768a3e6d7ee23`），不保留原始文件名和扩展名
- 虽然数据库中保存了 `originalname` 和 `mimetype`，但实际文件没有扩展名

**解决方案**：
- 修改 `file.middleware.ts`，使用 `diskStorage` 配置，保留文件扩展名
- 或者通过文件服务接口下载文件时，根据 `mimetype` 添加正确的扩展名

---

### 4. `uploads/resources/` 目录

**用途**：存储教学资源文件（PDF、PPT、DOC等）

**特点**：
- 使用自定义文件名：`时间戳-原始文件名.扩展名`
- 保留了文件扩展名，可以直接打开

**代码位置**：`src/resource/resource.middleware.ts`
