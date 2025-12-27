# 教材目录绑定问题诊断指南

## 问题描述

资源已审核通过，但在 `/catalog/:catalogId` 页面不显示。

## 诊断步骤

### 方法 1：使用 SQL 脚本诊断（推荐）

1. 打开 MySQL 客户端，连接到数据库
2. 执行诊断脚本：
   ```bash
   mysql -u root -p ravent < scripts/diagnose-catalog-binding.sql
   ```
   或者直接在 MySQL 客户端中执行 `scripts/diagnose-catalog-binding.sql` 文件内容

3. 查看诊断结果：
   - **步骤 1**：确认 catalog 是否存在
   - **步骤 2**：查看所有绑定到该 catalog 的资源
   - **步骤 3**：查看资源状态统计
   - **步骤 4**：模拟查询（不限制状态）
   - **步骤 5**：模拟查询（只显示已审核）
   - **步骤 6**：诊断总结

### 方法 2：使用 Node.js 脚本诊断

```bash
node scripts/check-catalog-binding.js
```

**注意**：需要确保 `.env` 文件中的数据库配置正确。

## 常见问题及解决方案

### 问题 1：没有资源绑定到 catalog

**症状**：步骤 2 返回空结果

**原因**：
- 资源编辑时绑定操作失败
- 资源被解绑了
- 绑定到了错误的 catalog_id

**解决方案**：
1. 重新编辑资源，确保 `catalog_id` 正确
2. 保存后检查后端日志，确认有 `✅ [更新资源] 已绑定资源` 的日志
3. 如果绑定失败，检查后端日志中的错误信息

### 问题 2：资源状态不是 'approved'

**症状**：步骤 3 显示资源状态为 'pending' 或其他状态

**原因**：
- 资源还未审核
- 资源被拒绝了

**解决方案**：
1. 在后台审核资源，将状态改为 'approved'
2. 或者使用 SQL 直接更新：
   ```sql
   UPDATE resource SET status = 'approved' WHERE id = <资源ID>;
   ```

### 问题 3：资源是视频格式

**症状**：步骤 4 或 5 返回空结果，但步骤 2 有数据

**原因**：
- 资源的 `file_format` 或 `category` 是 '视频' 或 'VIDEO'
- 查询逻辑会排除视频资源

**解决方案**：
1. 这是正常行为，视频资源不会显示在 catalog 页面
2. 如果需要显示视频，需要修改查询逻辑（不推荐）

### 问题 4：JOIN 条件不匹配

**症状**：步骤 2 有数据，但步骤 4 和 5 都返回空结果

**原因**：
- `resource_textbook_map` 表中的 `textbook_catalog_id` 与 `textbook_catalog.id` 不匹配
- 数据不一致

**解决方案**：
1. 检查 `resource_textbook_map` 表中的数据：
   ```sql
   SELECT * FROM resource_textbook_map WHERE textbook_catalog_id = 3656;
   ```
2. 检查 `textbook_catalog` 表中是否存在对应的 catalog：
   ```sql
   SELECT * FROM textbook_catalog WHERE id = 3656;
   ```
3. 如果数据不一致，需要修复绑定关系

## 快速修复脚本

如果确认是绑定问题，可以使用以下 SQL 手动绑定：

```sql
-- 将资源绑定到 catalog（替换 <资源ID> 和 <catalog_id>）
INSERT INTO resource_textbook_map (resource_id, textbook_catalog_id, source)
VALUES (<资源ID>, <catalog_id>, 'manual')
ON DUPLICATE KEY UPDATE 
  textbook_catalog_id = VALUES(textbook_catalog_id),
  source = 'manual',
  updated_at = CURRENT_TIMESTAMP;
```

## 验证修复

修复后，重新执行诊断脚本，确认：
1. 步骤 2 显示资源已绑定
2. 步骤 5 显示已审核的资源
3. 前端页面能正常显示资源

## 联系支持

如果以上方法都无法解决问题，请提供：
1. 诊断脚本的完整输出
2. 后端日志（包含查询相关的日志）
3. 前端控制台日志

