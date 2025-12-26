# 系统架构说明：auto_meta_result 和 Catalog 系统

## 一、auto_meta_result 是什么？

### 1.1 定义
`auto_meta_result` 是 `resource` 表中的一个 **JSON 字段**，用于存储资源的"结构化元数据"。

### 1.2 数据结构
```json
{
  "education_level": "elementary",      // 学段：elementary(小学) / junior(初中)
  "subject": "数学",                    // 学科
  "grade": "六年级",                    // 年级（文本格式）
  "grade_number": 6,                    // 年级（数字格式）
  "volume": "下册",                     // 册别：上册/下册/全一册
  "textbook_version": "人教版",         // 教材版本
  "structure": [                        // 章节结构（可选）
    {"unit": "第一单元", "title": "..."}
  ]
}
```

### 1.3 数据来源（两个途径）

#### 途径一：从 resource 原始字段生成（已实现）
**脚本：** `scripts/supplement-auto-meta-result.js`

**流程：**
1. 读取 `resource.subject`、`resource.grade`、`resource.textbook`、`resource.chapter_info`
2. 解析这些字段，生成结构化的 JSON
3. 写入 `resource.auto_meta_result`

**示例：**
- `resource.subject = "数学"`
- `resource.grade = "六年级下册"`
- `resource.textbook = "人教版"`
- ↓ 解析后生成 ↓
- `auto_meta_result = {"subject": "数学", "grade": "六年级", "grade_number": 6, "volume": "下册", "textbook_version": "人教版", "education_level": "elementary"}`

#### 途径二：从文件内容 AI 识别（占位实现，不可用）
**代码：** `src/resource/resource-parser.service.ts`

**流程：**
1. 提取文件文本（PDF/DOCX）
2. 调用 AI 识别（当前只是关键词匹配，不是真正的 AI）
3. 生成 `auto_meta_result`

**问题：** 当前只是占位实现，识别结果不可靠

---

## 二、Catalog 系统是什么？

### 2.1 核心概念

**Catalog（教材目录）** = 标准化的教材分类体系

### 2.2 数据表结构

#### 表1：`textbook_catalog`（教材目录表）
存储标准化的教材信息：
```sql
id | subject | grade | volume | textbook_version | education_level
1  | 数学    | 2     | 上册   | 人教版          | elementary
2  | 数学    | 2     | 下册   | 人教版          | elementary
3  | 语文    | 1     | 上册   | 人教版          | elementary
```

#### 表2：`resource_textbook_map`（资源-教材目录关联表）
将资源绑定到教材目录：
```sql
id | resource_id | textbook_catalog_id | source
1  | 47         | 2                   | manual  (手动绑定)
2  | 48         | 1                   | ai      (自动绑定)
```

### 2.3 Catalog 系统的作用

1. **标准化分类**：统一教材分类体系，避免"数学"、"数学课"、"数学教材"等不一致
2. **结构化筛选**：基于标准化的 catalog 进行精确筛选
3. **数据关联**：资源通过 `resource_textbook_map` 关联到标准化的 catalog

---

## 三、完整数据流程

### 3.1 资源上传流程

```
用户上传资源
  ↓
填写表单：title, subject, grade, textbook, chapter_info
  ↓
保存到 resource 表：
  - resource.subject = "数学"
  - resource.grade = "六年级下册"
  - resource.textbook = "人教版"
  - resource.auto_meta_result = NULL  (初始为空)
  ↓
【可选】运行脚本 supplement-auto-meta-result.js
  ↓
生成 auto_meta_result：
  - 从 resource.subject, grade, textbook 解析
  - 写入 resource.auto_meta_result
  ↓
【可选】运行脚本 bind-catalog-from-auto-meta.js
  ↓
匹配 textbook_catalog：
  - 根据 auto_meta_result 查找匹配的 catalog
  - 写入 resource_textbook_map
```

### 3.2 资源筛选流程

```
用户筛选：subject="数学", grade="2", volume="下册"
  ↓
后端查询：
  SELECT r.*
  FROM resource r
  INNER JOIN resource_textbook_map m ON m.resource_id = r.id
  INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
  WHERE c.subject = "数学"
    AND c.grade = "2"
    AND c.volume = "下册"
  ↓
返回匹配的资源
```

---

## 四、当前问题分析

### 4.1 问题现象

**资源 ID 49：**
- `title = "数学六年级下册"`
- `subject = NULL`（用户上传时未填写）
- `grade = NULL`（用户上传时未填写）
- `auto_meta_result = {"subject": "语文", "grade": "二年级", ...}` ❌ **错误**

### 4.2 问题原因

**可能的原因：**

1. **用户上传时未填写 subject/grade**
   - 如果 `resource.subject` 和 `resource.grade` 都是 NULL
   - `supplement-auto-meta-result.js` 无法从空字段生成正确的 `auto_meta_result`

2. **AI 识别错误（如果触发了）**
   - `resource-parser-worker.ts` 中的 AI 识别只是占位实现
   - 可能从文件内容提取到了错误的关键词

3. **数据来源混乱**
   - `auto_meta_result` 可能来自多个来源（脚本生成、AI识别、手动编辑）
   - 如果多个来源的数据不一致，会导致混乱

### 4.3 正确的数据应该是

**资源 ID 49 应该是：**
```json
{
  "education_level": "elementary",
  "subject": "数学",
  "grade": "六年级",
  "grade_number": 6,
  "volume": "下册",
  "textbook_version": "人教版"
}
```

---

## 五、系统设计总结

### 5.1 数据层次

```
第一层：resource 原始字段（用户手动填写）
  - subject, grade, textbook, chapter_info
  
第二层：auto_meta_result（结构化元数据）
  - 从第一层解析生成，或从文件内容 AI 识别
  
第三层：textbook_catalog（标准化教材目录）
  - 系统预定义的标准化分类
  
第四层：resource_textbook_map（关联关系）
  - 将资源绑定到标准化的 catalog
```

### 5.2 数据优先级

**显示优先级：**
1. `catalog_info`（从 `textbook_catalog` 获取，最权威）
2. `auto_meta_result`（结构化元数据，辅助）
3. `resource` 原始字段（兜底）

**筛选优先级：**
1. 基于 `textbook_catalog` 的筛选（最准确）
2. 基于 `auto_meta_result` 的筛选（次之）
3. 基于 `resource` 原始字段的筛选（兜底）

---

## 六、建议

### 6.1 立即行动

1. **检查资源 ID 49 的数据来源**
   - 查看 `resource.subject`、`resource.grade` 是否为空
   - 如果为空，说明用户上传时未填写

2. **修正 auto_meta_result**
   - 如果 `resource.subject` 和 `resource.grade` 为空，从 `title` 解析
   - 或者手动编辑 `auto_meta_result`

3. **强化上传表单验证**
   - 要求用户必须填写 subject、grade、textbook
   - 前端和后端都要验证

### 6.2 长期改进

1. **统一数据来源**
   - 明确 `auto_meta_result` 的唯一来源（优先从用户输入生成）
   - 避免多个来源导致的数据不一致

2. **完善 AI 识别**
   - 集成真正的 AI 服务
   - 或禁用 AI 识别，完全依赖用户输入

3. **数据校验机制**
   - 添加数据一致性检查
   - 发现不一致时自动修正或提示用户

