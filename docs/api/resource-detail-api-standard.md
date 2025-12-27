# Resource 详情接口标准规范

## 接口信息

- **路径**: `GET /api/resources/:id`
- **方法**: `GET`
- **版本**: `v1.0` (冻结日期: 2024-12-24)
- **稳定性承诺**: 6个月内不破坏性变更

---

## 一、标准返回字段

### 1.1 必须字段（Always Present）

以下字段在响应中**始终存在**，前端可长期依赖：

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | `number` | 资源唯一标识符 | `123` |
| `title` | `string` | 资源标题 | `"小学语文一年级上册教案"` |
| `category` | `string` | 资源分类 | `"教案"`, `"课件"`, `"试卷"` |
| `file_url` | `string` | 资源文件完整URL（已处理为绝对路径） | `"http://example.com/uploads/resources/xxx.pdf"` |
| `file_format` | `string` | 文件格式 | `"PDF"`, `"DOC"`, `"PPT"`, `"图片"` |

**注意**：
- `status` 字段**不在此接口返回**（因为此接口仅返回已审核资源，隐式 status = "approved"）
- 如需获取资源状态，请使用管理员接口 `GET /api/admin/resources/:id`
- `file_url` 和 `cover_url` 会自动转换为完整URL（如果原值为相对路径）

### 1.2 可选字段（Conditionally Present）

以下字段**可能为空或不存在**，前端需做空值处理：

| 字段名 | 类型 | 说明 | 可能为空 | 示例 |
|--------|------|------|----------|------|
| `description` | `string \| null` | 资源描述 | ✅ | `"这是一份完整的教案"` |
| `subject` | `string \| null` | 学科 | ✅ | `"语文"`, `"数学"`, `"英语"` |
| `grade` | `string \| number \| null` | 年级（支持数字或字符串） | ✅ | `"一年级"`, `1`, `"四年级下册"` |
| `textbook` | `string \| null` | 教材版本 | ✅ | `"人教版"`, `"苏教版"`, `"北师大版"` |
| `chapter_info` | `string \| null` | 章节信息（非结构化文本） | ✅ | `"第一单元 春天来了"` |
| `source_attribution` | `string \| null` | 资源出处/来源标注 | ✅ | `"xx教育"`, `"某某出版社"` |
| `unit` | `string \| null` | 资源所属单元（显式字段，唯一合法来源） | ✅ | `"第一单元"`, `"整本教材"` |
| `unit_index` | `number \| null` | 单元序号（用于排序） | ✅ | `1`, `2`, `3` |
| `cover_url` | `string \| null` | 封面图片完整URL | ✅ | `"http://example.com/uploads/cover/xxx.jpg"` |
| `download_count` | `number` | 下载次数 | ❌ (默认 0) | `42` |
| `created_at` | `string` | 创建时间（ISO 8601格式） | ❌ | `"2024-12-24T10:00:00.000Z"` |
| `updated_at` | `string` | 更新时间（ISO 8601格式） | ❌ | `"2024-12-24T10:00:00.000Z"` |

### 1.3 AI 字段（Read-Only）

以下字段由系统自动生成，前端**只读**，不应修改：

| 字段名 | 类型 | 说明 | 稳定性 |
|--------|------|------|--------|
| `auto_meta_status` | `'pending' \| 'done' \| 'failed'` | AI元数据识别状态 | ✅ 稳定 |
| `auto_meta_result` | `object \| null` | AI识别结果（JSON格式） | ⚠️ 结构可能增强 |

**`auto_meta_result` 结构说明**：
- 当前结构（示例）：
  ```json
  {
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
  }
  ```
- **兼容性承诺**：未来可能增加新字段，但**不会删除现有字段**，**不会改变现有字段类型**

### 1.4 扩展字段（Optional Extensions）

以下字段**仅在特定条件下存在**，前端应做存在性检查：

| 字段名 | 类型 | 存在条件 | 说明 |
|--------|------|----------|------|
| ~~`textbooks`~~ | ~~`array`~~ | ~~资源已关联教材时~~ | ~~已废弃，使用 `catalog_info` 替代~~ |
| `catalog_info` | `object` | 资源已关联教材时 | 简化的教材目录信息 |

**`catalog_info` 结构**（当存在时）：
```json
{
  "education_level": "elementary",
  "grade": "二年级",
  "subject": "语文",
  "textbook_version": "人教版",
  "volume": "上册"
}
```

---

## 二、字段稳定性分类

### 2.1 长期稳定字段（6个月+）

以下字段**前端可长期依赖**，6个月内不会变更：

- ✅ `id` - 资源ID
- ✅ `title` - 资源标题
- ✅ `category` - 资源分类
- ✅ `file_url` - 文件URL
- ✅ `file_format` - 文件格式
- ✅ `description` - 资源描述
- ✅ `subject` - 学科
- ✅ `grade` - 年级
- ✅ `textbook` - 教材版本
- ✅ `chapter_info` - 章节信息
- ✅ `source_attribution` - 资源出处/来源标注
- ✅ `cover_url` - 封面URL
- ✅ `download_count` - 下载次数
- ✅ `created_at` - 创建时间
- ✅ `updated_at` - 更新时间
- ✅ `auto_meta_status` - AI识别状态

### 2.2 可能增强但不破坏兼容的字段

以下字段**未来可能增强**，但保证向后兼容：

- ⚠️ `auto_meta_result` - AI识别结果
  - **增强方式**：可能增加新字段，但不会删除或修改现有字段
  - **兼容性**：前端应忽略未知字段，仅使用已知字段

- ~~⚠️ `textbooks` - 教材信息数组~~（已废弃，使用 `catalog_info` 替代）
  - **增强方式**：可能增加新字段，但不会删除或修改现有字段
  - **兼容性**：前端应忽略未知字段

- ⚠️ `catalog_info` - 教材目录信息
  - **增强方式**：可能增加新字段，但不会删除或修改现有字段
  - **兼容性**：前端应忽略未知字段

### 2.3 可能变更的字段（需关注）

以下字段**未来可能调整**，前端应做防御性处理：

- 🔄 `status` - 资源状态
  - **当前值**：`"approved"`, `"pending"`, `"rejected"`
  - **可能变更**：可能增加新状态值，但现有值不会删除
  - **建议**：前端应支持未知状态值的显示（显示为"未知状态"）

---

## 三、响应示例

### 3.1 标准响应（已审核资源）

```json
{
  "id": 123,
  "title": "小学语文一年级上册教案",
  "description": "这是一份完整的教案，包含详细的教学步骤",
  "category": "教案",
  "subject": "语文",
  "grade": "一年级",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "source_attribution": "xx教育",
  "unit": "第一单元",
  "unit_index": 1,
  "file_format": "PDF",
  "file_url": "http://example.com/uploads/resources/abc123.pdf",
  "cover_url": "http://example.com/uploads/cover/def456.jpg",
  "download_count": 42,
  "auto_meta_status": "done",
  "auto_meta_result": {
    "education_level": "elementary",
    "subject": "语文",
    "grade": "一年级",
    "volume": "上册",
    "textbook_version": "人教版",
    "structure": [
      {
        "unit": "第一单元",
        "title": "春天来了"
      }
    ]
  },
  "created_at": "2024-12-24T10:00:00.000Z",
  "updated_at": "2024-12-24T10:00:00.000Z"
}
```

### 3.2 带教材关联的响应

```json
{
  "id": 123,
  "title": "小学语文一年级上册教案",
  "category": "教案",
  "subject": "语文",
  "grade": "一年级",
  "textbook": "人教版",
  "unit": "第一单元",
  "unit_index": 1,
  "file_format": "PDF",
  "file_url": "http://example.com/uploads/resources/abc123.pdf",
  "cover_url": "http://example.com/uploads/cover/def456.jpg",
  "download_count": 42,
  "auto_meta_status": "done",
  "auto_meta_result": {
    "education_level": "elementary",
    "subject": "语文",
    "grade": "一年级",
    "volume": "上册",
    "textbook_version": "人教版"
  },
  "textbooks": [
    {
      "id": 1,
      "title": "小学语文一年级上册",
      "education_level": "elementary",
      "subject": "语文",
      "textbook_version": "人教版",
      "volume": "上册"
    }
  ],
  "catalog_info": {
    "education_level": "elementary",
    "grade": "二年级",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册"
  },
  "created_at": "2024-12-24T10:00:00.000Z",
  "updated_at": "2024-12-24T10:00:00.000Z"
}
```

### 3.3 最小响应（仅必填字段）

```json
{
  "id": 123,
  "title": "教学资源",
  "category": "教案",
  "file_format": "PDF",
  "file_url": "http://example.com/uploads/resources/abc123.pdf",
  "download_count": 0,
  "created_at": "2024-12-24T10:00:00.000Z",
  "updated_at": "2024-12-24T10:00:00.000Z"
}
```

---

## 四、错误响应

### 4.1 资源不存在

```json
{
  "error": "NOT_FOUND",
  "message": "资源不存在"
}
```

**HTTP 状态码**: `404`

### 4.2 资源未审核（普通用户访问）

普通用户只能访问 `status = "approved"` 的资源，未审核的资源会返回 404。

---

## 五、前端使用建议

### 5.1 字段访问模式

```typescript
// ✅ 推荐：安全访问可选字段
const title = resource.title || '未命名资源';
const description = resource.description || '';
const subject = resource.subject || '未分类';

// ✅ 推荐：使用 catalog_info（已优化为前端展示格式）
if (resource.catalog_info) {
  // 使用教材目录信息
  const { education_level, grade, subject, textbook_version, volume } = resource.catalog_info;
}

// ✅ 推荐：安全访问 AI 字段
if (resource.auto_meta_result) {
  const grade = resource.auto_meta_result.grade || resource.grade;
  // 使用 AI 识别结果
}
```

### 5.2 类型定义（TypeScript）

```typescript
interface ResourceDetail {
  // 必须字段
  id: number;
  title: string;
  category: string;
  file_url: string;
  file_format: string;
  download_count: number;
  created_at: string;
  updated_at: string;
  
  // 可选字段
  description?: string | null;
  subject?: string | null;
  grade?: string | number | null;
  textbook?: string | null;
  chapter_info?: string | null;
  source_attribution?: string | null;
  unit?: string | null;
  unit_index?: number | null;
  cover_url?: string | null;
  status?: string; // 仅管理员接口返回
  
  // AI 字段
  auto_meta_status?: 'pending' | 'done' | 'failed';
  auto_meta_result?: {
    education_level?: string;
    subject?: string;
    grade?: string;
    volume?: string;
    textbook_version?: string;
    structure?: Array<{
      unit?: string;
      title?: string;
      [key: string]: any; // 允许未知字段
    }>;
    [key: string]: any; // 允许未知字段
  } | null;
  
  // 扩展字段
  // textbooks?: Array<any>; // 已废弃，使用 catalog_info 替代
  catalog_info?: {
    education_level?: string;
    grade?: string;
    subject?: string;
    textbook_version?: string;
    volume?: string;
    [key: string]: any; // 允许未知字段
  };
}
```

---

## 六、变更历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2024-12-24 | 初始版本，冻结接口结构 |

---

## 七、兼容性承诺

### 7.1 向后兼容保证

- ✅ **字段不会删除**：已存在的字段不会从响应中移除
- ✅ **字段类型不会变更**：已存在字段的类型不会改变（如 `string` 不会变成 `number`）
- ✅ **必填字段不会变可选**：当前必填字段将始终保持必填
- ✅ **可选字段不会变必填**：当前可选字段将始终保持可选

### 7.2 允许的增强

- ✅ **新增可选字段**：可能增加新的可选字段
- ✅ **扩展对象字段**：`auto_meta_result`、`catalog_info` 可能增加新字段
- ✅ **新增状态值**：`status` 和 `auto_meta_status` 可能增加新值（但不会删除现有值）

### 7.3 破坏性变更

以下变更**不会发生**（6个月内）：

- ❌ 删除字段
- ❌ 改变字段类型
- ❌ 改变字段名称
- ❌ 改变必填/可选状态
- ❌ 改变字段含义

---

## 八、注意事项

1. **URL 处理**：`file_url` 和 `cover_url` 会自动转换为完整URL，前端无需额外处理
2. **空值处理**：所有可选字段都可能为 `null`，前端应做空值检查
3. **扩展字段**：`catalog_info` 仅在资源关联教材时存在（已废弃 `textbooks` 字段）
4. **AI 字段**：`auto_meta_result` 结构可能增强，前端应忽略未知字段
5. **状态字段**：普通用户接口不返回 `status` 字段（仅返回已审核资源）

---

**文档维护者**: 后端团队  
**最后更新**: 2024-12-24  
**稳定性承诺**: 6个月内不破坏性变更

