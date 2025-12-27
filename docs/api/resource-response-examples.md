# 资源接口返回数据示例

## 一、实际修改的表字段

### resource 表

**新增字段**（已添加）：
- `chapter_info` TEXT NULL - 章节信息（非结构化文本）

**说明**：使用现有的 `resource_textbook_map` 表来处理资源与教材目录的关联，不需要在 resource 表中新增 `textbook_catalog_id` 字段。

## 二、接口返回 JSON 示例

### 2.1 GET /api/resources（列表接口）

#### 最少字段示例（无教材信息）

```json
[
  {
    "id": 1,
    "title": "小学数学练习题",
    "category": "习题",
    "file_url": "/uploads/resources/xxx.pdf",
    "file_format": "PDF",
    "status": "approved",
    "created_at": "2025-12-23T10:00:00Z",
    "chapter_info": null,
    "subject": null,
    "grade": null,
    "textbook": null,
    "description": null,
    "cover_url": null
  }
]
```

#### 完整字段示例（有 chapter_info，无教材目录关联）

```json
[
  {
    "id": 2,
    "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
    "category": "教案",
    "file_url": "/uploads/resources/xxx.docx",
    "file_format": "DOC",
    "status": "approved",
    "description": "本教案适用于人教版小学语文一年级上册第一单元...",
    "subject": "语文",
    "grade": "一年级上册",
    "textbook": "人教版",
    "chapter_info": "第一单元 春天来了",
    "cover_url": "/uploads/cover/xxx.png",
    "download_count": 15,
    "created_at": "2025-12-23T10:00:00Z",
    "updated_at": "2025-12-23T10:00:00Z"
  }
]
```

#### 完整字段示例（有 chapter_info + 教材目录关联）

```json
[
  {
    "id": 3,
    "title": "人教版小学语文一年级上册第一单元《春天来了》课件",
    "category": "课件",
    "file_url": "/uploads/resources/xxx.pptx",
    "file_format": "PPT",
    "status": "approved",
    "description": "本课件适用于人教版小学语文一年级上册第一单元...",
    "subject": "语文",
    "grade": "一年级上册",
    "textbook": "人教版",
    "chapter_info": "第一单元 春天来了",
    "cover_url": "/uploads/cover/xxx.png",
    "download_count": 20,
    "created_at": "2025-12-23T10:00:00Z",
    "updated_at": "2025-12-23T10:00:00Z",
    
    "catalog_info": {
      "education_level": "elementary",
      "grade": "1",
      "subject": "语文",
      "textbook_version": "人教版",
      "volume": "上册"
    }
  }
]
```

### 2.2 GET /api/resources/:id（详情接口）

#### 最少字段示例

```json
{
  "id": 1,
  "title": "小学数学练习题",
  "category": "习题",
  "file_url": "/uploads/resources/xxx.pdf",
  "file_format": "PDF",
  "status": "approved",
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z",
  "chapter_info": null,
  "subject": null,
  "grade": null,
  "textbook": null,
  "description": null,
  "cover_url": null
}
```

#### 完整字段示例（有 chapter_info + 教材目录关联）

```json
{
  "id": 3,
  "title": "人教版小学语文一年级上册第一单元《春天来了》课件",
  "category": "课件",
  "file_url": "/uploads/resources/xxx.pptx",
  "file_format": "PPT",
  "status": "approved",
  "description": "本课件适用于人教版小学语文一年级上册第一单元...",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "cover_url": "/uploads/cover/xxx.png",
  "download_count": 20,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z",
  
  "catalog_info": {
    "education_level": "elementary",
    "grade": "1",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册"
  },
  
  "textbooks": [
    {
      "id": 123,
      "education_level": "elementary",
      "grade": "1",
      "subject": "语文",
      "textbook_version": "人教版",
      "volume": "上册",
      "source": "manual",
      "bind_time": "2025-12-23T10:00:00Z"
    }
  ]
}
```

### 2.3 POST /api/resources（创建接口）

#### 请求体（最少字段）

```json
{
  "title": "小学数学练习题",
  "category": "习题",
  "file": <文件>
}
```

#### 请求体（完整字段，包含 chapter_info）

```json
{
  "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
  "category": "教案",
  "description": "本教案适用于...",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "file": <文件>,
  "cover": <封面文件，可选>
}
```

#### 响应

```json
{
  "id": 123,
  "status": "approved"
}
```

## 三、前端使用建议

### 3.1 章节信息展示

前端可以直接使用 `chapter_info` 字段：

```javascript
// 显示章节信息
if (resource.chapter_info) {
  displayChapterInfo(resource.chapter_info);
} else {
  displayPlaceholder('暂无章节信息');
}
```

### 3.2 教材目录信息展示

如果存在 `catalog_info`，可以使用标准化信息；否则使用 `chapter_info`：

```javascript
// 优先使用 catalog_info（标准化），否则使用 chapter_info（自由文本）
const displayInfo = resource.catalog_info 
  ? `${resource.catalog_info.textbook_version} ${resource.catalog_info.subject} ${resource.catalog_info.grade}${resource.catalog_info.volume}`
  : resource.chapter_info || '暂无章节信息';

displayChapterInfo(displayInfo);
```

### 3.3 搜索和过滤

前端可以基于以下字段进行搜索和过滤：

- `chapter_info`: 文本搜索（模糊匹配）
- `catalog_info`: 精确匹配（如果有）
- `subject`, `grade`, `textbook`: 精确匹配

```javascript
// 搜索示例
const searchResults = resources.filter(r => 
  r.chapter_info?.includes(keyword) || 
  r.title?.includes(keyword) ||
  r.description?.includes(keyword)
);

// 过滤示例
const filteredResults = resources.filter(r => 
  r.subject === selectedSubject &&
  r.grade === selectedGrade
);
```

### 3.4 三种资源状态的处理

#### 状态1：完全无教材信息

```javascript
{
  chapter_info: null,
  catalog_info: undefined
}
// 前端处理：显示"暂无章节信息"或隐藏章节区域
```

#### 状态2：仅有 chapter_info 文本

```javascript
{
  chapter_info: "第一单元 春天来了",
  catalog_info: undefined
}
// 前端处理：直接显示 chapter_info 文本
```

#### 状态3：chapter_info + catalog_info

```javascript
{
  chapter_info: "第一单元 春天来了",
  catalog_info: {
    education_level: "elementary",
    grade: "1",
    subject: "语文",
    textbook_version: "人教版",
    volume: "上册"
  }
}
// 前端处理：优先使用 catalog_info 进行标准化展示，chapter_info 作为补充
```

### 3.5 创建资源时填写 chapter_info

前端可以在上传表单中添加 `chapter_info` 输入框（可选）：

```html
<input 
  type="text" 
  name="chapter_info" 
  placeholder="章节信息，如：第一单元 春天来了"
  optional
/>
```

## 四、字段说明

### chapter_info

- **类型**：`string | null`
- **说明**：章节信息（非结构化文本）
- **示例**：
  - `"第一单元 春天来了"`
  - `"第3章 函数 - 3.1 函数的概念"`
  - `"Unit 1 Hello"`
  - `null`（允许缺失）

### catalog_info（仅当关联了教材目录时存在）

- **类型**：`object | undefined`
- **说明**：简化的教材目录信息（从 `resource_textbook_map` 关联的 `textbook_catalog` 中提取）
- **字段**：
  - `education_level`: 学段（`"elementary"` | `"middle"`）
  - `grade`: 年级（`"1"` ~ `"9"`）
  - `subject`: 学科
  - `textbook_version`: 教材版本
  - `volume`: 册别（`"上册"` | `"下册"`）

## 五、注意事项

1. **chapter_info 始终返回**：即使为 `null`，也会在返回数据中
2. **catalog_info 仅在详情接口返回**：只有当资源关联了教材目录时才会存在（列表接口不包含，避免性能问题）
3. **向后兼容**：现有接口继续工作，新增字段为可选
4. **关联教材目录**：通过 `POST /api/resources/:id/bind-textbook` 接口关联，使用现有的 `resource_textbook_map` 表

