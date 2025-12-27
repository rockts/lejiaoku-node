# 资源搜索、上传和编辑接口文档

## 一、搜索接口优化

### GET /api/resources

支持查询参数进行资源搜索和筛选。

#### 查询参数

| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `grade` | string | 年级（模糊匹配） | `grade=二年级` |
| `subject` | string | 学科（精确匹配） | `subject=语文` |
| `textbook_version` | string | 教材版本（精确匹配，兼容 `textbook` 参数） | `textbook_version=人教版` |
| `textbook` | string | 教材版本（兼容参数，同 `textbook_version`） | `textbook=人教版` |
| `volume` | string | 册次（模糊匹配，搜索 grade 或 auto_meta_result.volume） | `volume=上册` |
| `chapter_keyword` | string | 章节关键词（模糊匹配 chapter_info 或 auto_meta_result.structure） | `chapter_keyword=春天` |
| `keyword` | string | 标题和描述关键词（模糊匹配） | `keyword=测试` |
| `category` | string | 资源分类（精确匹配） | `category=课件` |
| `limit` | number | 每页数量（默认 30） | `limit=10` |
| `page` | number | 页码（默认 1） | `page=2` |

#### 返回字段

返回 approved 资源列表，包含以下字段：

- **必须字段**：`id`, `title`, `category`, `file_url`, `file_format`
- **可选字段**：`description`, `subject`, `grade`, `textbook`, `chapter_info`, `cover_url`, `download_count`
- **AI 字段**：`auto_meta_status`, `auto_meta_result`
- **扩展字段**：`catalog_info`（资源有绑定时存在）

#### 请求示例

```bash
# 按学科和年级搜索
curl "http://localhost:3333/api/resources?subject=语文&grade=二年级&limit=10"

# 按章节关键词搜索
curl "http://localhost:3333/api/resources?chapter_keyword=春天&limit=10"

# 按教材版本和册次搜索
curl "http://localhost:3333/api/resources?textbook_version=人教版&volume=上册&limit=10"
```

#### 返回示例

```json
[
  {
    "id": 3,
    "title": "开发环境测试资源",
    "category": "课件",
    "subject": "语文",
    "grade": "二年级上册",
    "textbook": null,
    "chapter_info": "第一单元 春天来了",
    "file_format": "PDF",
    "file_url": "https://example.com/dev-test.pdf",
    "cover_url": null,
    "download_count": 0,
    "auto_meta_status": "done",
    "auto_meta_result": {
      "education_level": "elementary",
      "subject": "语文",
      "grade": "二年级",
      "volume": "上册",
      "textbook_version": "人教版",
      "structure": [
        {
          "unit": "第一单元",
          "title": "春天来了"
        }
      ]
    },
    "catalog_info": {
      "education_level": "elementary",
      "grade": "2",
      "subject": "语文",
      "textbook_version": "人教版",
      "volume": "上册"
    },
    "created_at": "2025-12-23T00:45:10.000Z",
    "updated_at": "2025-12-23T07:29:17.000Z"
  }
]
```

---

## 二、单条上传接口优化

### POST /api/resources

支持只上传必填字段，可选字段可后续补充。

#### 请求参数

**必填字段**：
- `title` (string): 资源标题
- `category` (string): 资源分类
- `file_format` (string): 文件格式（如 PDF、DOC、PPT）
- `file_url` (string): 文件 URL（如果不上传文件）

**可选字段**：
- `description` (string): 资源描述
- `subject` (string): 学科
- `grade` (string | number): 年级
- `textbook` (string): 教材版本
- `chapter_info` (string): 章节信息（非结构化文本）
- `cover_url` (string): 封面 URL

**文件上传**：
- `file` (file): 资源文件（支持 PDF、DOC、DOCX、PPT、PPTX、图片）
- `cover` (file): 封面图片（可选）

#### 上传后自动解析

上传完成后，可以调用 `POST /api/resources/:id/auto-parse` 接口自动解析教材信息：

```bash
# 1. 上传资源
curl -X POST http://localhost:3333/api/resources \
  -F "title=测试资源" \
  -F "category=课件" \
  -F "file=@/path/to/file.pdf"

# 2. 自动解析教材信息（使用返回的 resource_id）
curl -X POST http://localhost:3333/api/resources/:id/auto-parse
```

#### 请求示例

```bash
# 最小必填字段上传
curl -X POST http://localhost:3333/api/resources \
  -F "title=测试资源" \
  -F "category=课件" \
  -F "file_format=PDF" \
  -F "file_url=https://example.com/file.pdf"

# 完整字段上传
curl -X POST http://localhost:3333/api/resources \
  -F "title=测试资源" \
  -F "category=课件" \
  -F "description=这是一个测试资源" \
  -F "subject=语文" \
  -F "grade=二年级" \
  -F "textbook=人教版" \
  -F "chapter_info=第一单元" \
  -F "file=@/path/to/file.pdf" \
  -F "cover=@/path/to/cover.jpg"
```

#### 返回示例

```json
{
  "id": 40,
  "title": "测试资源",
  "category": "课件",
  "file_format": "PDF",
  "file_url": "/uploads/resources/1234567890-file.pdf",
  "status": "pending",
  "created_at": "2024-12-24T10:00:00.000Z"
}
```

---

## 三、资源编辑接口

### PUT /api/resources/:id

更新资源信息，仅创建者或 admin 可修改。

#### 请求参数

**可修改字段**：
- `title` (string): 资源标题
- `category` (string): 资源分类
- `description` (string): 资源描述
- `subject` (string): 学科
- `grade` (string | number): 年级
- `textbook` (string): 教材版本
- `chapter_info` (string): 章节信息
- `cover_url` (string): 封面 URL

**不可修改字段**：
- `id`: 资源 ID（不可修改）
- `status`: 资源状态（需要通过审核接口修改）
- `created_at`: 创建时间
- `auto_meta_status`: AI 识别状态（由系统管理）
- `auto_meta_result`: AI 识别结果（由系统管理）

#### 权限验证

- **创建者**：可以修改自己创建的资源
- **Admin**：可以修改所有资源
- **其他用户**：无权修改（返回 403）

#### 请求示例

```bash
# 更新资源标题和描述
curl -X PUT http://localhost:3333/api/resources/3 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题",
    "description": "更新后的描述"
  }'

# 更新学科和年级
curl -X PUT http://localhost:3333/api/resources/3 \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "数学",
    "grade": "三年级"
  }'
```

#### 返回示例

```json
{
  "id": 3,
  "title": "更新后的标题",
  "description": "更新后的描述",
  "category": "课件",
  "subject": "数学",
  "grade": "三年级",
  "textbook": null,
  "chapter_info": "第一单元 春天来了",
  "file_format": "PDF",
  "file_url": "https://example.com/dev-test.pdf",
  "cover_url": null,
  "download_count": 0,
  "auto_meta_status": "done",
  "auto_meta_result": {
    "education_level": "elementary",
    "subject": "语文",
    "grade": "二年级",
    "volume": "上册",
    "textbook_version": "人教版"
  },
  "catalog_info": {
    "education_level": "elementary",
    "grade": "2",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册"
  },
  "created_at": "2025-12-23T00:45:10.000Z",
  "updated_at": "2025-12-24T10:00:00.000Z"
}
```

#### 错误响应

```json
// 403 - 无权修改
{
  "success": false,
  "message": "无权修改此资源"
}

// 404 - 资源不存在
{
  "success": false,
  "message": "资源不存在"
}

// 400 - 没有提供更新字段
{
  "success": false,
  "message": "没有提供要更新的字段"
}
```

---

## 四、字段说明

### catalog_info 与 auto_meta_result 的同步

- **编辑资源后**：`catalog_info` 和 `auto_meta_result` 保持不变
- **如需更新 catalog_info**：需要修改 `subject`、`grade`、`textbook` 等字段后，调用 `POST /api/resources/:id/bind-catalog-from-auto-meta` 重新绑定
- **auto_meta_result**：由 AI 解析接口管理，不能直接修改

---

## 五、向后兼容性

### 搜索接口

- ✅ 保持原有查询参数（`keyword`, `category`, `subject`, `grade`, `textbook`）
- ✅ 新增查询参数不影响现有功能
- ✅ 返回字段结构与之前一致

### 上传接口

- ✅ 保持原有必填字段要求
- ✅ 可选字段不强制要求
- ✅ 返回字段结构与之前一致

### 编辑接口

- ✅ 新接口，不影响现有功能
- ✅ 返回字段结构与详情接口一致

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

