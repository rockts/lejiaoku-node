# AI元数据识别状态字段说明

## 一、实际修改的表字段

### resource 表

**新增字段**（已添加）：
- `auto_meta_status` VARCHAR(20) NOT NULL DEFAULT 'pending' - AI元数据识别状态
  - 允许值：`pending`（待识别）、`done`（已完成）、`failed`（失败）
  - 默认值：`pending`
- `auto_meta_result` JSON NULL - AI识别结果（JSON格式，未来用于存储封面/章节/简介等）

**说明**：
- 这两个字段为未来 AI 自动识别教材信息预留
- 当前系统不实现 AI 识别功能
- 字段默认值确保现有资源和新上传资源都能正常工作

## 二、接口返回 JSON 示例

### 2.1 GET /api/resources（列表接口）

```json
[
  {
    "id": 1,
    "title": "小学数学练习题",
    "category": "习题",
    "file_url": "/uploads/resources/xxx.pdf",
    "file_format": "PDF",
    "status": "approved",
    "auto_meta_status": "pending",
    "auto_meta_result": null,
    "created_at": "2025-12-23T10:00:00Z"
  },
  {
    "id": 2,
    "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
    "category": "教案",
    "status": "approved",
    "auto_meta_status": "done",
    "auto_meta_result": {
      "cover_url": "/uploads/cover/auto-xxx.png",
      "subject": "语文",
      "grade": "一年级上册",
      "textbook_version": "人教版",
      "description": "本教案适用于..."
    },
    "created_at": "2025-12-23T10:00:00Z"
  }
]
```

### 2.2 GET /api/resources/:id（详情接口）

```json
{
  "id": 2,
  "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
  "category": "教案",
  "file_url": "/uploads/resources/xxx.docx",
  "file_format": "DOC",
  "status": "approved",
  "description": "本教案适用于...",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "cover_url": "/uploads/cover/xxx.png",
  "auto_meta_status": "pending",
  "auto_meta_result": null,
  "download_count": 15,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z"
}
```

### 2.3 POST /api/resources（创建接口）

**请求体（最小化，auto_meta_status 可选）**：
```json
{
  "title": "小学数学练习题",
  "category": "习题",
  "file": <文件>
}
```

**请求体（包含 auto_meta_status，可选）**：
```json
{
  "title": "小学数学练习题",
  "category": "习题",
  "auto_meta_status": "pending",
  "file": <文件>
}
```

**响应**：
```json
{
  "id": 123,
  "status": "approved"
}
```

**说明**：
- `auto_meta_status` 为可选字段，如果不传则默认为 `pending`
- `auto_meta_result` 不需要在请求中传递，后端会自动设置为 `null`
- 创建成功后返回的资源会自动包含 `auto_meta_status: "pending"` 和 `auto_meta_result: null`

## 三、字段说明

### auto_meta_status

- **类型**：`'pending' | 'done' | 'failed'`
- **默认值**：`'pending'`
- **说明**：AI元数据识别状态
  - `pending`：待识别（默认状态，新上传的资源）
  - `done`：已完成（AI识别完成，结果存储在 `auto_meta_result` 中）
  - `failed`：识别失败（AI识别过程中出现错误）

### auto_meta_result

- **类型**：`any` (JSON)
- **默认值**：`null`
- **说明**：AI识别结果（JSON格式），未来可能包含：
  - `cover_url`：自动生成的封面图URL
  - `subject`：识别的学科
  - `grade`：识别的年级
  - `textbook_version`：识别的教材版本
  - `description`：自动生成的简介
  - 其他识别结果字段

## 四、系统行为说明

### 当前系统行为

1. **上传资源**：
   - 新上传的资源自动设置 `auto_meta_status = 'pending'`
   - `auto_meta_result = null`
   - 不影响现有上传、审核、下载逻辑

2. **查询资源**：
   - 所有查询接口（列表、详情）都会返回 `auto_meta_status` 和 `auto_meta_result`
   - 现有资源如果这两个字段为 NULL，MySQL 会使用默认值（`auto_meta_status = 'pending'`）

3. **向后兼容**：
   - 现有接口行为完全不变
   - 新增字段为可选，不影响前端现有逻辑
   - 前端可以选择性使用这些字段

### 未来 AI 识别流程（预留）

1. 资源上传后，`auto_meta_status = 'pending'`
2. AI 异步识别开始处理
3. 识别完成后，更新 `auto_meta_status = 'done'`，`auto_meta_result` 存储识别结果
4. 如果识别失败，更新 `auto_meta_status = 'failed'`

**注意**：当前系统**不实现**上述 AI 识别流程，仅预留字段和状态管理能力。

## 五、确认：当前系统行为与之前完全一致

✅ **完全一致**，仅多了"未来能力"：

1. ✅ **上传流程**：与之前完全相同，只是新增字段有默认值
2. ✅ **审核流程**：完全不变
3. ✅ **下载流程**：完全不变
4. ✅ **查询接口**：返回数据多了两个字段，但为可选，不影响前端
5. ✅ **前端兼容**：前端可以忽略这两个新字段，系统正常工作


