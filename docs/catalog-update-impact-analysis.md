# 教材目录更新对已绑定资源的影响分析

## 数据关系

```
resource (资源表)
  ↓ (通过 resource_textbook_map)
textbook_catalog (教材目录表)
```

- `resource_textbook_map` 表只存储 `resource_id` 和 `textbook_catalog_id` 的关联关系
- `catalog_info` 是通过 JOIN `textbook_catalog` 表**动态查询**的

## 影响分析

### 如果更新 `textbook_catalog` 表的 `subject` 或 `textbook_version`

**会影响：**
- ✅ 资源的 `catalog_info` 会**立即改变**（因为它是动态查询的）
  - 资源详情接口返回的 `catalog_info.subject` 会变成新的值
  - 资源详情接口返回的 `catalog_info.textbook_version` 会变成新的值

**不会影响：**
- ✅ `resource_textbook_map` 表中的绑定关系**不会改变**（因为只存储了 `catalog_id`）
- ✅ 资源的 `resource.subject` 和 `resource.textbook` 字段**不会改变**（这些是资源自己的字段）

## 潜在问题

### 问题 1：数据不一致

**场景：**
- 资源 A 原本绑定到 catalog 4310（学科：数学，版本：人教版）
- 如果 catalog 4310 的 `subject` 被改成了"语文"
- 资源 A 的 `catalog_info.subject` 会显示"语文"
- 但资源 A 的 `resource.subject` 可能还是"数学"

**影响：**
- 前端显示可能不一致
- 查询时可能找不到资源（如果查询条件是基于 catalog 的 subject）

### 问题 2：查询失效

**场景：**
- 资源 A 绑定到 catalog 4310（学科：数学）
- 如果 catalog 4310 的 `subject` 被改成了"语文"
- 使用 `catalog_id=4310` 查询时，资源 A 仍然会出现
- 但如果使用 `subject=数学` + `catalog_id=4310` 查询，可能找不到资源 A

## 建议

### 1. 禁止直接更新 `textbook_catalog` 表

**原因：**
- `textbook_catalog` 表有 `UNIQUE KEY unique_catalog (education_level, grade, subject, textbook_version, volume)`
- 如果更新了 `subject` 或 `textbook_version`，可能会违反唯一约束
- 即使不违反约束，也会导致已绑定资源的数据不一致

**建议：**
- 不要直接 `UPDATE textbook_catalog SET subject = ...`
- 如果需要修改，应该：
  1. 创建新的 catalog 记录
  2. 将资源重新绑定到新的 catalog
  3. 删除旧的 catalog（如果不再使用）

### 2. 如果需要修改 catalog 信息

**正确的流程：**

```sql
-- 1. 查找需要修改的资源
SELECT r.id, r.title, m.textbook_catalog_id
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
WHERE m.textbook_catalog_id = 4310;

-- 2. 创建新的 catalog（如果需要）
INSERT INTO textbook_catalog (education_level, grade, subject, textbook_version, volume)
VALUES ('elementary', '6', '语文', '部编版', '上册');

-- 3. 获取新 catalog 的 ID（假设是 5000）
-- 4. 将资源重新绑定到新 catalog
UPDATE resource_textbook_map
SET textbook_catalog_id = 5000
WHERE textbook_catalog_id = 4310;

-- 5. 删除旧的 catalog（如果不再使用）
DELETE FROM textbook_catalog WHERE id = 4310;
```

### 3. 添加数据一致性检查

**建议添加一个检查脚本：**

```sql
-- 检查资源与 catalog 的数据一致性
SELECT 
  r.id AS resource_id,
  r.title,
  r.subject AS resource_subject,
  r.textbook AS resource_textbook,
  c.id AS catalog_id,
  c.subject AS catalog_subject,
  c.textbook_version AS catalog_textbook_version,
  CASE 
    WHEN r.subject != c.subject THEN '学科不一致'
    WHEN r.textbook != c.textbook_version THEN '版本不一致'
    ELSE '一致'
  END AS consistency_status
FROM resource r
INNER JOIN resource_textbook_map m ON m.resource_id = r.id
INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
WHERE r.subject IS NOT NULL 
  AND r.textbook IS NOT NULL
  AND (r.subject != c.subject OR r.textbook != c.textbook_version);
```

## 总结

**直接回答你的问题：**

> 如果更新学科或教材版本，会不会影响已绑定的数据？

**答案：**
- ✅ **会影响**：资源的 `catalog_info` 会立即改变（因为它是动态查询的）
- ✅ **不会影响**：`resource_textbook_map` 表中的绑定关系不会改变
- ⚠️ **可能导致问题**：资源显示的信息可能与实际内容不一致

**建议：**
- 不要直接更新 `textbook_catalog` 表的 `subject` 或 `textbook_version`
- 如果需要修改，应该创建新的 catalog 并重新绑定资源

