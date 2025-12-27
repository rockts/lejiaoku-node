# 资源数据模型设计摘要

## 核心设计理念

**最小但可扩展**：在保证系统可用性的前提下，最大化灵活性，支持不同地区、不同学科教材结构的差异性。

## 表结构核心字段

### resource 表（主表）

#### 必填字段（5个）
- `title` - 资源标题
- `category` - 教学用途分类（教材/教案/课件/习题/其他）
- `file_url` - 资源文件URL
- `file_format` - 文件格式（PDF/DOC/PPT/图片/其他）
- `user_id` - 创建者ID

#### AI可补全字段（6个，可空）
- `description` - 资源介绍/说明
- `subject` - 学科（语文/数学/英语等）
- `grade` - 年级（支持"一年级上册"等格式）
- `textbook` - 教材版本（人教版/苏教版等）
- `chapter_info` - 章节信息（**非结构化文本**）
- `cover_url` - 封面图URL

#### 系统字段
- `source_type` - 资源来源（official/user）
- `status` - 审核状态（pending/approved/rejected）
- `download_count` - 下载次数
- `created_at`, `updated_at` - 时间戳

## 关键设计点

### 1. 非结构化章节信息

`chapter_info` 字段使用 `TEXT` 类型，支持自由表达，不强制层级：

```
"第一单元 春天来了"
"第3章 函数 - 3.1 函数的概念"
"Unit 1 Hello (第一单元 你好)"
"第三章 函数"
null (允许缺失)
```

**为什么这样设计**：
- 不同地区、不同学科的教材结构差异很大
- 强制层级结构会导致数据录入困难
- 非结构化文本为AI提供了灵活的表达空间
- 未来如果需要结构化，可以在此基础上解析

### 2. AI友好的数据结构

- **独立AI元数据表**：`resource_auto_meta` 存储AI解析结果，不覆盖人工填写
- **字段可空**：允许AI渐进式补全，不影响现有数据
- **明确的分层**：必填字段最少，AI专注补全可空字段

### 3. 扩展性设计

- **关联表**：`resource_textbook_map`（教材目录关联）、`resource_tags`（标签）
- **字段可空**：所有非核心字段可空，支持渐进式完善
- **索引优化**：为常用查询字段建立索引

## 完整资源 JSON 示例

```json
{
  "id": 2,
  "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
  "category": "教案",
  "file_url": "/uploads/resources/xxx.docx",
  "file_format": "DOC",
  "user_id": 1,
  "description": "本教案适用于人教版小学语文一年级上册第一单元...",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "cover_url": "/uploads/cover/xxx.png",
  "source_type": "official",
  "status": "approved",
  "download_count": 15,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z"
}
```

## 为什么适合AI批量生成与补全

1. **字段明确分层**：必填/可空，AI专注补全可空字段
2. **独立存储机制**：AI解析结果存储在 `resource_auto_meta`，不覆盖人工填写
3. **非结构化设计**：AI识别章节信息后直接存储文本，无需复杂结构化处理
4. **渐进式完善**：允许字段缺失，AI可以批量补全历史数据
5. **向后兼容**：新增字段可空，不破坏现有接口和数据

