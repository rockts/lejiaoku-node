# Resized 图片 API 文档

## 概述

系统为头像和封面图片提供了自动尺寸调整功能，生成多种尺寸以优化性能和用户体验。

---

## 1. 头像图片 Resized API

### 接口地址
```
GET /avatar/:userId/?size={size}
```

### 参数说明
- `userId` (路径参数): 用户ID
- `size` (查询参数，可选): 图片尺寸
  - `large`: 256x256 像素（正方形）
  - `medium`: 128x128 像素（正方形）
  - `small`: 64x64 像素（正方形）
  - 不传 `size` 参数：返回原始头像

### 示例
```bash
# 获取大尺寸头像
GET /avatar/1/?size=large

# 获取中等尺寸头像
GET /avatar/1/?size=medium

# 获取小尺寸头像
GET /avatar/1/?size=small

# 获取原始头像
GET /avatar/1/
```

### 响应
- 成功：返回图片文件（Content-Type: image/png 或 image/jpeg）
- 失败：404 错误

---

## 2. 封面图片 Resized API（Cover 模块）

### 接口地址
```
GET /cover/:coverId/?size={size}
```

### 参数说明
- `coverId` (路径参数): 封面ID（来自 cover 表）
- `size` (查询参数，可选): 图片尺寸
  - `large`: 1280px 宽度（自动高度）
  - `medium`: 640px 宽度（自动高度）
  - `thumbnail`: 320px 宽度（自动高度）
  - 不传 `size` 参数：返回原始封面

### 示例
```bash
# 获取大尺寸封面
GET /cover/1/?size=large

# 获取中等尺寸封面
GET /cover/1/?size=medium

# 获取缩略图
GET /cover/1/?size=thumbnail

# 获取原始封面
GET /cover/1/
```

### 响应
- 成功：返回图片文件（Content-Type: image/png 或 image/jpeg）
- 失败：404 错误

---

## 3. Resource 模块封面 Resized API

### 说明
Resource 模块的封面通过静态文件服务提供，支持 resized 尺寸。

### 封面URL格式
Resource 模块的 `cover_url` 字段格式：`/uploads/cover/{filename}`

### Resized 封面URL格式
```
/uploads/cover/resized/{filename}-{size}
```

### 参数说明
- `filename`: 封面文件名（从 `cover_url` 中提取，例如：`1766517324895-cover.jpg`）
- `size`: 图片尺寸
  - `large`: 1280px 宽度（自动高度）
  - `medium`: 640px 宽度（自动高度）
  - `thumbnail`: 320px 宽度（自动高度）

### 示例

假设资源的 `cover_url` 为：`/uploads/cover/1766517324895-cover.jpg`

```bash
# 获取大尺寸封面
GET /uploads/cover/resized/1766517324895-cover.jpg-large

# 获取中等尺寸封面
GET /uploads/cover/resized/1766517324895-cover.jpg-medium

# 获取缩略图
GET /uploads/cover/resized/1766517324895-cover.jpg-thumbnail

# 获取原始封面
GET /uploads/cover/1766517324895-cover.jpg
```

### 前端使用示例

```javascript
// 从资源数据中获取封面URL
const coverUrl = resource.cover_url; // "/uploads/cover/1766517324895-cover.jpg"

// 提取文件名
const filename = coverUrl.replace('/uploads/cover/', '');

// 生成不同尺寸的封面URL
const coverLarge = `/uploads/cover/resized/${filename}-large`;
const coverMedium = `/uploads/cover/resized/${filename}-medium`;
const coverThumbnail = `/uploads/cover/resized/${filename}-thumbnail`;

// 或者使用工具函数
function getResizedCoverUrl(coverUrl, size) {
  if (!coverUrl) return null;
  const filename = coverUrl.replace('/uploads/cover/', '');
  if (size) {
    return `/uploads/cover/resized/${filename}-${size}`;
  }
  return coverUrl; // 返回原始URL
}

// 使用
const thumbnail = getResizedCoverUrl(resource.cover_url, 'thumbnail');
```

---

## 4. 尺寸规格总结

### 头像尺寸
| 尺寸 | 宽度 | 高度 | 用途 |
|------|------|------|------|
| large | 256px | 256px | 用户详情页、大尺寸显示 |
| medium | 128px | 128px | 列表页、中等尺寸显示 |
| small | 64px | 64px | 评论、小尺寸显示 |

### 封面尺寸
| 尺寸 | 宽度 | 高度 | 用途 |
|------|------|------|------|
| large | 1280px | 自动 | 详情页、大尺寸显示 |
| medium | 640px | 自动 | 列表页、中等尺寸显示 |
| thumbnail | 320px | 自动 | 缩略图、卡片显示 |

---

## 5. 注意事项

1. **自动生成**：所有 resized 图片在上传时自动生成，无需手动处理
2. **文件存在性**：如果请求的尺寸不存在，系统会返回原始图片或 404 错误
3. **性能优化**：建议根据使用场景选择合适的尺寸，避免加载过大的图片
4. **缓存策略**：建议前端实现图片缓存，减少服务器压力

---

## 6. 错误处理

- **404 Not Found**：请求的图片或尺寸不存在
- **500 Internal Server Error**：服务器处理错误

---

## 7. 更新日志

- **2025-01-XX**：为 Resource 模块封面添加 resized 功能
- **2025-01-XX**：移除废弃的 File 模块，统一使用 Resource 模块
