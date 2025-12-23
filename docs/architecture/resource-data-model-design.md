# 资源数据模型设计文档

## 一、设计目标

在不强制统一全国教材结构的前提下，设计一个**最小但可扩展**的资源数据模型，支持：
- 小学/初中教学资源管理
- 前期资源来源杂乱，字段可能缺失
- 后期 AI 批量生成与补全
- 章节/单元/课的非结构化表达

## 二、核心设计原则

1. **最小化必填字段**：只要求最核心的字段
2. **允许字段缺失**：前期资源可以缺失非核心字段
3. **非结构化表达**：章节信息使用文本描述，不强制层级
4. **AI 友好**：为 AI 补全预留字段和结构
5. **向后兼容**：不破坏现有接口和前端展示

## 三、表结构设计

### 3.1 resource 表（主表）

```sql
CREATE TABLE IF NOT EXISTS resource (
  -- 基础标识
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- === 核心必填字段（上传时必须） ===
  title VARCHAR(500) NOT NULL COMMENT '资源标题（必填）',
  category VARCHAR(50) NOT NULL COMMENT '教学用途分类：教材/教案/课件/习题/其他（必填）',
  file_url VARCHAR(500) NOT NULL COMMENT '资源文件URL（必填）',
  file_format VARCHAR(20) NOT NULL COMMENT '文件格式：PDF/DOC/PPT/图片/其他（必填）',
  user_id INT NOT NULL COMMENT '创建者ID（必填）',
  
  -- === 可空但重要的字段（推荐填写，AI可补全） ===
  description TEXT NULL COMMENT '资源介绍/说明（AI可补全）',
  subject VARCHAR(50) NULL COMMENT '学科：语文/数学/英语等（AI可补全）',
  grade VARCHAR(50) NULL COMMENT '年级：一年级上册/七年级下册/高一等（AI可补全）',
  textbook VARCHAR(100) NULL COMMENT '教材版本：人教版/苏教版等（AI可补全，与现有字段名保持一致）',
  cover_url VARCHAR(500) NULL COMMENT '封面图URL（AI可生成）',
  
  -- === 章节信息（非结构化，允许自由表达） ===
  chapter_info TEXT NULL COMMENT '章节信息（非结构化文本，如：第一单元 春天来了 / 第3章 函数 / Unit 1 Hello等）',
  
  -- === 元数据字段 ===
  source_type VARCHAR(20) NOT NULL DEFAULT 'official' COMMENT '资源来源：official(平台)/user(用户)',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending/approved/rejected',
  download_count INT DEFAULT 0 COMMENT '下载次数',
  
  -- === 时间戳 ===
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- === 索引 ===
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_subject (subject),
  INDEX idx_grade (grade),
  INDEX idx_textbook (textbook),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教学资源主表';
```

### 3.2 resource_auto_meta 表（AI自动解析元数据，已存在）

用于存储 AI 解析的结果，不直接修改主表，避免覆盖人工填写的内容。

```sql
-- 已存在，用于存储AI解析的补充信息
-- 字段包括：auto_title, auto_subject, auto_grade, auto_version, auto_description等
```

### 3.3 resource_textbook_map 表（资源与教材骨架关联，已存在）

用于资源与标准化教材目录的关联（可选）。

```sql
-- 已存在，用于资源与textbook_catalog的关联
-- 支持一个资源关联多个教材目录
```

### 3.4 resource_tags 表（可选，用于标签）

```sql
CREATE TABLE IF NOT EXISTS resource_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  tag VARCHAR(50) NOT NULL COMMENT '标签名称（如：重点/难点/同步练习/复习等）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_resource_tag (resource_id, tag),
  INDEX idx_resource_id (resource_id),
  INDEX idx_tag (tag),
  FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资源标签表（可选）';
```

## 四、字段分类说明

### 4.1 必填字段（NOT NULL）

上传时必须提供，否则接口返回错误：

- `title`: 资源标题
- `category`: 教学用途分类（教材/教案/课件/习题/其他）
- `file_url`: 资源文件URL
- `file_format`: 文件格式
- `user_id`: 创建者ID

### 4.2 可空但重要的字段（NULL，AI可补全）

推荐填写，但不强制。AI 可以自动识别和补全：

- `description`: 资源介绍/说明
- `subject`: 学科（语文/数学/英语/物理等）
- `grade`: 年级（支持"一年级上册"、"七年级下册"、"高一"等格式）
- `textbook`: 教材版本（人教版/苏教版/北师大版等，与现有字段名保持一致）
- `cover_url`: 封面图URL（AI可生成）
- `chapter_info`: 章节信息（非结构化文本）

### 4.3 系统字段（自动管理）

- `source_type`: 资源来源（默认'official'）
- `status`: 审核状态（默认'pending'）
- `download_count`: 下载次数（默认0）
- `created_at`, `updated_at`: 时间戳

## 五、完整资源 JSON 示例

### 5.1 最小化示例（只包含必填字段）

```json
{
  "id": 1,
  "title": "小学数学一年级上册第一单元练习",
  "category": "习题",
  "file_url": "/uploads/resources/1234567890-exercise.pdf",
  "file_format": "PDF",
  "user_id": 1,
  "source_type": "official",
  "status": "approved",
  "download_count": 0,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z"
}
```

### 5.2 完整示例（包含所有字段）

```json
{
  "id": 2,
  "title": "人教版小学语文一年级上册第一单元《春天来了》教案",
  "category": "教案",
  "file_url": "/uploads/resources/1234567891-teaching-plan.docx",
  "file_format": "DOC",
  "description": "本教案适用于人教版小学语文一年级上册第一单元《春天来了》，包含教学目标、教学重难点、教学过程设计等内容。",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "cover_url": "/uploads/cover/1234567891-cover.png",
  "user_id": 1,
  "source_type": "official",
  "status": "approved",
  "download_count": 15,
  "created_at": "2025-12-23T10:00:00Z",
  "updated_at": "2025-12-23T10:00:00Z",
  
  // 可选：AI解析的补充信息（来自 resource_auto_meta）
  "auto_meta": {
    "auto_title": "人教版小学语文一年级上册第一单元《春天来了》教案",
    "auto_subject": "语文",
    "auto_grade": "一年级上册",
    "auto_version": "人教版",
    "auto_description": "本教案适用于...",
    "confidence": 0.95
  },
  
  // 注意：auto_meta.auto_version 对应 resource.textbook 字段
  
  // 可选：关联的教材目录（来自 resource_textbook_map）
  "textbooks": [
    {
      "id": 123,
      "education_level": "elementary",
      "grade": "1",
      "subject": "语文",
      "textbook": "人教版",
      "volume": "上册"
    }
  ],
  
  // 可选：标签（来自 resource_tags）
  "tags": ["重点", "同步练习", "教学设计"]
}
```

### 5.3 非结构化章节信息示例

`chapter_info` 字段允许自由表达，不强制层级结构：

```json
// 示例1：简单描述
{
  "chapter_info": "第一单元 春天来了"
}

// 示例2：包含多个层级
{
  "chapter_info": "第二单元 第3课 小动物"
}

// 示例3：更详细的描述
{
  "chapter_info": "Unit 1 Hello (第一单元 你好) - Lesson 1"
}

// 示例4：数学章节
{
  "chapter_info": "第三章 函数 - 3.1 函数的概念 - 3.1.1 函数的定义"
}

// 示例5：可以是空（允许缺失）
{
  "chapter_info": null
}
```

## 六、为什么这样设计适合 AI 批量生成与补全

### 6.1 字段分层设计

1. **必填字段最少**：只有 5 个核心字段必须填写，降低了上传门槛
2. **可空字段明确**：AI 可以专注于补全 `subject`、`grade`、`textbook`、`description`、`chapter_info` 等字段
3. **独立 AI 元数据表**：`resource_auto_meta` 表存储 AI 解析结果，避免覆盖人工填写的内容

### 6.2 非结构化章节信息

1. **灵活性**：`chapter_info` 使用 `TEXT` 类型，支持任意格式的描述
2. **不强制层级**：避免了不同教材结构的差异问题
3. **AI 友好**：AI 可以识别并提取章节信息，直接存储为文本，无需复杂的结构化处理
4. **后期可扩展**：如果需要结构化，可以在此基础上解析 `chapter_info` 文本

### 6.3 可扩展性

1. **关联表设计**：
   - `resource_textbook_map`：支持资源与标准化教材目录的关联（可选）
   - `resource_tags`：支持标签系统（可选）
   - `resource_auto_meta`：支持 AI 补全信息（已有）

2. **字段可空**：所有非核心字段都是可空的，允许渐进式完善

3. **索引优化**：为常用查询字段建立索引，支持高效检索

### 6.4 AI 补全流程

1. **上传阶段**：用户只需填写必填字段（title, category, file_url等）
2. **AI 解析**：后台异步解析文件，提取 `subject`、`grade`、`textbook`、`description`、`chapter_info` 等信息
3. **结果存储**：AI 解析结果存储在 `resource_auto_meta` 表中
4. **人工审核**：管理员可以查看 AI 解析结果，决定是否采纳
5. **批量处理**：可以对历史资源批量运行 AI 解析，补全缺失字段

### 6.5 与现有系统的兼容性

1. **不破坏现有接口**：现有接口继续工作，只是增加了可选字段
2. **前端兼容**：前端可以逐步使用新字段，旧字段仍然支持
3. **数据迁移**：现有数据无需修改，新字段为 NULL 即可

## 七、数据迁移建议

如果需要为现有 `resource` 表添加 `chapter_info` 字段：

```sql
ALTER TABLE resource 
ADD COLUMN chapter_info TEXT NULL COMMENT '章节信息（非结构化文本）' 
AFTER textbook;
```

## 八、API 接口建议

### 8.1 创建资源接口（POST /api/resources）

**请求体（最小化）**：
```json
{
  "title": "资源标题",
  "category": "教案",
  "file": <文件>,
  "cover": <封面文件，可选>
}
```

**请求体（完整）**：
```json
{
  "title": "资源标题",
  "category": "教案",
  "description": "资源介绍",
  "subject": "语文",
  "grade": "一年级上册",
  "textbook": "人教版",
  "chapter_info": "第一单元 春天来了",
  "file": <文件>,
  "cover": <封面文件，可选>
}
```

### 8.2 获取资源详情接口（GET /api/resources/:id）

返回数据包含：
- 资源主表字段
- `auto_meta`（如果存在 AI 解析结果）
- `textbooks`（如果关联了教材目录）
- `tags`（如果有关联标签）

## 九、总结

这个设计实现了：

1. ✅ **最小化必填字段**：只有 5 个核心字段必须填写
2. ✅ **允许字段缺失**：所有非核心字段可空，支持前期资源来源杂乱的情况
3. ✅ **非结构化章节信息**：`chapter_info` 使用文本，不强制层级
4. ✅ **AI 友好**：为 AI 补全预留了字段和结构（`resource_auto_meta` 表）
5. ✅ **向后兼容**：不破坏现有接口和前端展示
6. ✅ **可扩展性**：支持关联表扩展（教材目录、标签等）

这样的设计既满足了当前的需求，又为未来的 AI 批量生成与补全提供了良好的基础。

