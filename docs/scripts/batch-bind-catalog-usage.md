# 批量绑定教材目录脚本使用说明

## 功能说明

批量将所有已审核资源的 `auto_meta_result` 固化为教材目录绑定，自动匹配 `textbook_catalog` 表并写入 `resource_textbook_map` 表。

---

## 使用方法

```bash
node scripts/batch-bind-catalog-from-auto-meta.js
```

---

## 处理流程

1. **查询资源**：获取所有 `status='approved'` 的资源
2. **遍历处理**：对每条资源：
   - 检查是否有 `auto_meta_result`
   - 提取必要字段（`education_level`, `subject`, `grade`, `volume`, `textbook_version`）
   - 转换 `grade` 格式（"二年级" → "2"）
   - 匹配 `textbook_catalog` 表
   - 写入 `resource_textbook_map`（`source='ai'`）
3. **幂等性保证**：如果资源已绑定到相同的教材目录，跳过不重复写入

---

## 字段匹配规则

### Grade 转换

| auto_meta_result | textbook_catalog |
|------------------|------------------|
| "一年级" | "1" |
| "二年级" | "2" |
| "三年级" | "3" |
| ... | ... |
| "九年级" | "9" |

### 匹配字段

- `education_level` → `education_level`
- `subject` → `subject`
- `grade` (转换后) → `grade`
- `volume` → `volume`
- `textbook_version` → `textbook_version`

---

## 输出示例

```
🚀 开始批量绑定教材目录...

✓ 数据库连接成功

📊 找到 10 条已审核资源

处理资源 ID: 1 - 测试资源1
  ✅ 资源 1 成功绑定到教材目录 129

处理资源 ID: 2 - 测试资源2
  ✓ 资源 2 已绑定到教材目录 130，跳过

处理资源 ID: 3 - 测试资源3
  ⚠️  资源 3 的 auto_meta_result 缺少必要字段

==================================================
📈 批量绑定统计结果
==================================================
总资源数: 10
✅ 成功绑定: 8
⏭️  已存在跳过: 1
❌ 绑定失败: 1
  - 缺少 auto_meta_result: 0
  - 缺少必要字段: 1
  - 未找到匹配目录: 0
  - 其他错误: 0
==================================================

✅ 批量绑定完成！

✓ 数据库连接已关闭
```

---

## 验证方式

### 1. 执行脚本

```bash
node scripts/batch-bind-catalog-from-auto-meta.js
```

### 2. 验证绑定结果

检查任意资源的详情接口，确认 `catalog_info` 字段已存在：

```bash
# 检查资源 ID=3
curl http://localhost:3333/api/resources/3

# 确认返回中包含 catalog_info
curl http://localhost:3333/api/resources/3 | grep -A 8 "catalog_info"
```

### 3. 确认 catalog_info 字段

响应中应该包含标准化的 `catalog_info`：

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

1. **必要字段**：资源的 `auto_meta_result` 必须包含所有必要字段
2. **匹配失败**：如果 `textbook_catalog` 表中没有匹配的记录，绑定会失败
3. **幂等性**：可以安全地重复执行脚本，不会创建重复的绑定记录
4. **数据来源**：绑定的记录 `source` 字段为 `'ai'`
5. **仅处理已审核资源**：只处理 `status='approved'` 的资源

---

## 故障排查

### 问题：未找到匹配的教材目录

**原因**：
- `auto_meta_result` 中的字段值与 `textbook_catalog` 表中的数据不匹配
- 可能的原因：
  - `grade` 格式不匹配（如 "二年级" vs "2"）
  - `subject` 名称不一致
  - `textbook_version` 名称不一致

**解决**：
- 检查 `auto_meta_result` 中的字段值
- 确认 `textbook_catalog` 表中是否有对应的记录
- 手动检查字段匹配情况

### 问题：缺少必要字段

**原因**：`auto_meta_result` 中缺少以下任一字段：
- `education_level`
- `subject`
- `grade`
- `volume`
- `textbook_version`

**解决**：需要先完善资源的 `auto_meta_result` 数据

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

