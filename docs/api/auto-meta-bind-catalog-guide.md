# AI 解析结果绑定教材目录功能说明

## 功能概述

将资源的 `auto_meta_result`（AI 解析结果）固化为教材目录绑定，自动匹配 `textbook_catalog` 表并写入 `resource_textbook_map` 表。

---

## 接口信息

**路径**: `POST /api/resources/:id/bind-catalog-from-auto-meta`  
**方法**: `POST`  
**参数**: `id` (路径参数，资源ID)

---

## 功能说明

### 处理流程

1. **读取资源**：根据 `resourceId` 获取资源的 `auto_meta_result`
2. **提取字段**：从 `auto_meta_result` 中提取以下字段：
   - `education_level` (学段)
   - `subject` (学科)
   - `grade` (年级)
   - `volume` (册次)
   - `textbook_version` (教材版本)
3. **格式转换**：将 `grade` 从中文（如 "二年级"）转换为数字（如 "2"）以匹配 `textbook_catalog` 表
4. **匹配目录**：在 `textbook_catalog` 表中查找唯一匹配的记录
5. **写入绑定**：将绑定关系写入 `resource_textbook_map` 表（`source='ai'`）

### 幂等性保证

- 如果资源已经绑定到相同的教材目录，不会重复写入
- 可以安全地重复执行绑定操作

---

## 字段映射

### Grade 转换规则

| auto_meta_result | textbook_catalog |
|------------------|------------------|
| "一年级" | "1" |
| "二年级" | "2" |
| "三年级" | "3" |
| ... | ... |
| "九年级" | "9" |

### 匹配字段

| auto_meta_result 字段 | textbook_catalog 字段 |
|----------------------|---------------------|
| `education_level` | `education_level` |
| `subject` | `subject` |
| `grade` (转换后) | `grade` |
| `volume` | `volume` |
| `textbook_version` | `textbook_version` |

---

## 使用示例

### 请求

```bash
curl -X POST http://localhost:3333/api/resources/3/bind-catalog-from-auto-meta
```

### 成功响应

```json
{
  "success": true,
  "message": "绑定成功",
  "resource_id": 3,
  "textbook_catalog_id": 129
}
```

### 失败响应

```json
{
  "success": false,
  "message": "无法绑定：资源缺少 auto_meta_result 或未找到匹配的教材目录"
}
```

---

## 验证方式

### 1. 执行绑定

```bash
curl -X POST http://localhost:3333/api/resources/3/bind-catalog-from-auto-meta
```

### 2. 检查结果

```bash
curl http://localhost:3333/api/resources/3
```

### 3. 确认返回数据

响应中应该包含 `catalog_info` 字段：

```json
{
  "id": 3,
  "title": "...",
  "catalog_info": {
    "education_level": "elementary",
    "grade": "2",
    "subject": "语文",
    "textbook_version": "人教版",
    "volume": "上册"
  },
  ...
}
```

---

## 注意事项

1. **必要字段**：`auto_meta_result` 必须包含所有必要字段（`education_level`, `subject`, `grade`, `volume`, `textbook_version`）
2. **匹配失败**：如果 `textbook_catalog` 表中没有匹配的记录，绑定会失败
3. **数据来源**：绑定的记录 `source` 字段为 `'ai'`，区别于手动绑定的 `'manual'`
4. **幂等性**：重复执行不会创建重复的绑定记录

---

## 实现位置

- **Service**: `src/textbook/textbook.service.ts` - `bindResourceToCatalogByAutoMeta()`
- **Controller**: `src/textbook/textbook.controller.ts` - `bindResourceToCatalogFromAutoMeta()`
- **Router**: `src/textbook/textbook.router.ts` - `POST /api/resources/:id/bind-catalog-from-auto-meta`

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

