# AI 自动识别脚本使用说明

## 一、脚本文件路径

```
scripts/auto-meta-generate.js
```

## 二、运行方式

### 方式 1：直接运行（推荐）

```bash
node scripts/auto-meta-generate.js
```

### 方式 2：使用 npm script（如果已配置）

```bash
npm run auto-meta-generate
```

## 三、功能说明

### 3.1 处理范围

脚本会处理 `resource` 表中满足以下条件的资源：

- `auto_meta_status = 'pending'`
- `file_format` ∈ `['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX']`

### 3.2 识别字段

脚本会尝试识别以下字段：

1. **title** - 标题（如原标题不规范，可给推荐标题）
2. **subject** - 学科（语文 / 数学 / 英语 / 物理 / 化学 / 生物 / 历史 / 地理 / 政治 / 科学）
3. **grade** - 年级（如 一年级上册 / 七年级下册 / 高一）
4. **textbook** - 教材版本（人教版 / 苏教版 / 北师大版 / 华师大版 / 外研版等）
5. **chapter_info** - 章节信息（如 第一单元 春天来了 / 第3章 函数）
6. **description** - 描述（≤120 字，提取文档前部分内容）

### 3.3 识别依据

1. **文件名**：从文件名中提取关键词（学科、年级、版本、章节等）
2. **文档内容**：从文档前 1～3 页文本中提取信息
   - PDF：使用 `pdf-parse` 提取前 6000 字符
   - DOCX：使用 `mammoth` 提取前 6000 字符
   - DOC：暂不支持（需要转换为 DOCX）
   - PPT/PPTX：暂不支持文本提取

### 3.4 结果存储

**成功时**：
- `auto_meta_status = 'done'`
- `auto_meta_result` 存储识别结果的 JSON

**失败时**：
- `auto_meta_status = 'failed'`
- `auto_meta_result` 存储错误信息

## 四、auto_meta_result JSON 示例

### 4.1 成功识别示例

```json
{
  "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "description": "本教案适用于人教版小学语文一年级上册第一单元《春天来了》，包含教学目标、教学重难点、教学过程设计等内容。",
  "confidence": {
    "title": "medium",
    "subject": "high",
    "grade": "high",
    "textbook": "high",
    "chapter_info": "high",
    "description": "high"
  },
  "recognized_at": "2025-12-23T10:30:00.000Z"
}
```

### 4.2 部分识别示例

```json
{
  "title": null,
  "subject": "数学",
  "grade": "三年级",
  "textbook": null,
  "chapter_info": "第3章 函数",
  "description": "本章节主要介绍函数的概念、性质和应用。",
  "confidence": {
    "title": "low",
    "subject": "medium",
    "grade": "medium",
    "textbook": "low",
    "chapter_info": "high",
    "description": "high"
  },
  "recognized_at": "2025-12-23T10:30:00.000Z"
}
```

### 4.3 识别失败示例

```json
{
  "error_reason": "文件不存在: /uploads/resources/xxx.pdf"
}
```

## 五、字段可信度说明

### 5.1 置信度等级

- **high**：从文档文本内容中提取，可信度高
- **medium**：仅从文件名中提取，可信度中等
- **low**：未识别或不确定

### 5.2 哪些字段"可信"、哪些只是"建议"

#### 可信字段（confidence = 'high'）

以下字段如果 confidence 为 'high'，表示从文档文本内容中提取，**可信度较高**，可以作为参考：

- **subject**（学科）：如果从文档内容中提取，可信度高
- **grade**（年级）：如果从文档内容中提取，可信度高
- **textbook**（版本）：如果从文档内容中提取，可信度高
- **chapter_info**（章节）：如果从文档内容中提取，可信度高
- **description**（描述）：从文档内容提取，可信度高

#### 建议字段（confidence = 'medium' 或 'low'）

以下字段如果 confidence 为 'medium' 或 'low'，表示**仅从文件名提取或未识别**，**可信度较低**，**建议人工确认**：

- **title**：通常可信度较低，建议保留原标题或人工确认
- **subject**（如果 confidence = 'medium'）：仅从文件名提取，建议人工确认
- **grade**（如果 confidence = 'medium'）：仅从文件名提取，建议人工确认
- **textbook**（如果 confidence = 'medium'）：仅从文件名提取，建议人工确认

### 5.3 使用建议

1. **confidence = 'high'** 的字段：可以作为**辅助参考**，但仍需人工确认
2. **confidence = 'medium'** 的字段：**建议人工确认**，可能是从文件名推测的
3. **confidence = 'low'** 的字段：**必须人工填写**

**重要提示**：这是第一版 AI 能力，用于"辅助人工确认"，不是自动发布。所有识别结果都应该经过人工审核后再使用。

## 六、技术实现

### 6.1 识别算法

当前版本使用**规则 + 正则 + 关键词匹配**：

1. **关键词匹配**：使用预定义的学科、年级、版本关键词进行匹配
2. **正则表达式**：提取章节信息（如"第一单元"、"第3章"等）
3. **文本分析**：从文档前部分内容提取描述信息

### 6.2 可扩展性

脚本预留了 AI 接口的位置（可注释看到），未来可以：

1. 接入外部 AI API（如 OpenAI、Claude 等）
2. 使用本地 AI 模型（如 Ollama）
3. 集成 OCR 识别图片中的文字

### 6.3 可重复执行

脚本支持**可重复执行**：

- 已处理完成的资源（`auto_meta_status = 'done'`）会被跳过
- 只处理 `auto_meta_status = 'pending'` 的资源
- 如果之前处理失败（`auto_meta_status = 'failed'`），可以重新运行脚本再次尝试

## 七、注意事项

1. **文件路径**：确保 `file_url` 对应的文件真实存在且可访问
2. **文件格式**：当前支持 PDF 和 DOCX，DOC 格式暂不支持
3. **性能**：大量资源处理可能需要较长时间，建议分批处理
4. **错误处理**：如果文件不存在或格式不支持，会标记为 `failed` 并记录错误原因
5. **数据安全**：脚本不会修改 `resource` 表的原有字段，只更新 `auto_meta_result` 和 `auto_meta_status`

## 八、依赖库

脚本依赖以下 npm 包（应已在项目中安装）：

- `mysql2` - 数据库连接
- `dotenv` - 环境变量加载
- `pdf-parse` - PDF 文本提取
- `mammoth` - DOCX 文本提取

如果未安装，请运行：

```bash
npm install mysql2 dotenv pdf-parse mammoth
```


