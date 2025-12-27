# 资源详情页教材目录展示指南

## 概述

资源详情接口 `GET /api/resources/:id` 提供了两种教材目录数据源，前端需要根据优先级选择合适的字段。

---

## 一、字段说明

### catalog_info（优先使用）✨

**数据来源**：人工或脚本绑定的标准教材目录（权威数据）

**存在条件**：资源已绑定教材目录时存在

**结构**：
```json
{
  "education_level": "elementary",      // 学段：elementary(小学) / middle(初中)
  "grade": "二年级",
  "subject": "语文",
  "textbook_version": "人教版",
  "volume": "上册"                      // 上册 / 下册 / 全一册
}
```

---

### auto_meta_result（辅助使用）🤖

**数据来源**：AI 自动识别结果（辅助数据）

**存在条件**：`auto_meta_status === 'done'` 时存在

**结构**：
```json
{
  "education_level": "elementary",
  "subject": "语文",
  "grade": "二年级",
  "volume": "上册",
  "textbook_version": "人教版",
  "structure": [                        // 章节结构（可能为空）
    { "unit": "第一单元", "title": "春天来了" }
  ]
}
```

---

## 二、使用策略

### 优先级规则

```
优先级 1: catalog_info        （权威数据，优先使用）
优先级 2: auto_meta_result    （辅助数据，作为补充）
优先级 3: resource 直接字段   （兜底数据：subject, grade, textbook）
```

### 实现示例（TypeScript）

```typescript
function getTextbookDisplayInfo(resource: ResourceDetail) {
  // 优先级 1: catalog_info（权威数据）
  if (resource.catalog_info) {
    return {
      ...resource.catalog_info,
      source: 'catalog_info',
      isAuthoritative: true,
    };
  }

  // 优先级 2: auto_meta_result（辅助数据）
  if (resource.auto_meta_result && resource.auto_meta_status === 'done') {
    return {
      education_level: resource.auto_meta_result.education_level,
      grade: resource.auto_meta_result.grade,
      subject: resource.auto_meta_result.subject,
      textbook_version: resource.auto_meta_result.textbook_version,
      volume: resource.auto_meta_result.volume,
      structure: resource.auto_meta_result.structure,
      source: 'auto_meta_result',
      isAuthoritative: false,
    };
  }

  // 优先级 3: resource 直接字段（兜底）
  return {
    grade: resource.grade,
    subject: resource.subject,
    textbook_version: resource.textbook,  // 注意字段名映射
    source: 'resource_fields',
    isAuthoritative: false,
  };
}
```

---

## 三、字段映射关系

| 含义 | catalog_info | auto_meta_result | resource 直接字段 |
|------|-------------|------------------|------------------|
| 学段 | `education_level` | `education_level` | - |
| 年级 | `grade` | `grade` | `grade` |
| 学科 | `subject` | `subject` | `subject` |
| 教材版本 | `textbook_version` | `textbook_version` | `textbook` ⚠️ |
| 册次 | `volume` | `volume` | - |

**注意**：`catalog_info.textbook_version` 和 `resource.textbook` 表示同一个含义

---

## 四、兜底策略

### 字段级兜底（推荐）

对每个字段单独做优先级判断：

```typescript
function getCompleteTextbookInfo(resource: ResourceDetail) {
  return {
    educationLevel: resource.catalog_info?.education_level 
                 || resource.auto_meta_result?.education_level 
                 || null,
    
    grade: resource.catalog_info?.grade 
        || resource.auto_meta_result?.grade 
        || resource.grade 
        || null,
    
    subject: resource.catalog_info?.subject 
          || resource.auto_meta_result?.subject 
          || resource.subject 
          || null,
    
    textbookVersion: resource.catalog_info?.textbook_version 
                  || resource.auto_meta_result?.textbook_version 
                  || resource.textbook 
                  || null,
    
    volume: resource.catalog_info?.volume 
         || resource.auto_meta_result?.volume 
         || null,
    
    structure: resource.auto_meta_result?.structure || null,
    
    source: resource.catalog_info ? 'catalog_info' 
         : (resource.auto_meta_result ? 'auto_meta_result' : 'resource_fields'),
  };
}
```

---

## 五、UI 展示建议

### 数据来源标识

根据数据来源显示不同标识：

- `catalog_info` → 显示 "已关联教材"（绿色，权威数据）
- `auto_meta_result` → 显示 "AI 识别"（蓝色，辅助数据）
- `resource_fields` → 显示 "基础信息"（灰色，兜底数据）

### 章节结构展示

1. **优先使用 `auto_meta_result.structure`**：如果存在，直接展示 AI 识别的章节结构
2. **其次使用 `catalog_info`**：如果存在，可提示用户查看完整教材结构（需额外接口）
3. **最后使用 `resource.chapter_info`**：非结构化文本作为兜底

---

## 六、最佳实践

### ✅ 推荐做法

1. **优先使用 `catalog_info`**：数据最权威
2. **辅助使用 `auto_meta_result`**：当 `catalog_info` 不存在时使用
3. **兜底使用 `resource` 直接字段**：当上述两个都不存在时使用
4. **字段级兜底**：对每个字段单独做优先级判断
5. **数据来源标识**：在 UI 上标识数据来源

### ❌ 不推荐做法

1. ❌ 同时显示 `catalog_info` 和 `auto_meta_result`，造成信息冲突
2. ❌ 忽略 `catalog_info`，直接使用 `auto_meta_result`
3. ❌ 假设字段一定存在，不做空值检查

---

## 七、示例场景

### 场景 1：资源已绑定教材目录（最佳）

```json
{
  "catalog_info": {
    "education_level": "elementary",
    "grade": "二年级",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册"
  }
}
```

**处理**：使用 `catalog_info`

---

### 场景 2：资源未绑定但已 AI 识别

```json
{
  "auto_meta_status": "done",
  "auto_meta_result": {
    "grade": "二年级",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册",
    "structure": [{ "unit": "第一单元", "title": "春天来了" }]
  }
}
```

**处理**：使用 `auto_meta_result`

---

### 场景 3：仅有基础字段（兜底）

```json
{
  "subject": "语文",
  "grade": "二年级",
  "textbook": "人教版"
}
```

**处理**：使用 `resource` 直接字段

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24
