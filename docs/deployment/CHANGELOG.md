# 更新日志

## 2025-12-28 - 资源编辑和教材目录绑定修复

### 修复内容

#### 1. 资源编辑接口修复
- ✅ 修复 `PUT /api/resources/:id` 响应中缺少 `catalog_id` 和 `unit` 字段的问题
- ✅ 修复 `getResourceByIdForAdmin` 回退 SQL 中缺少 `unit` 和 `unit_index` 字段的问题
- ✅ 修复 `updateResource` 函数中缺少 `unit`、`unit_index`、`source_attribution` 字段的问题

#### 2. 教材目录绑定修复
- ✅ 修复资源解绑后重新绑定失败的问题
  - 绑定新目录前先删除所有旧绑定，确保解绑后重新绑定正常工作
- ✅ 修复相同名称单元不合并的问题
  - 规范化 `unit` 字段：去除首尾空格，合并多个连续空格
  - SQL 层和应用层双重保障，彻底解决空格差异导致的重复显示

#### 3. 统计信息修复
- ✅ 修复统计信息不一致的问题
  - 统计信息只统计 `unit` 不为空的资源，与单元列表保持一致

#### 4. 新增功能
- ✅ 新增资源出处字段 (`source_attribution`)
  - 添加数据库字段和迁移脚本
  - 更新资源创建、更新、查询接口
  - 更新 API 文档

### 新增文档

- `docs/for-frontend/resource-detail-unit-display-guide.md` - 资源详情页单元信息显示指南
- `docs/for-frontend/resource-source-attribution-usage.md` - 资源出处字段使用指南
- `docs/migration/add-source-attribution-field.md` - 数据库迁移文档

### 数据库迁移

需要执行以下迁移脚本（如果尚未执行）：

```bash
# 添加 source_attribution 字段
node scripts/add-source-attribution-field.js

# 或手动执行 SQL
mysql -u用户名 -p数据库名 < scripts/add-source-attribution-to-resource.sql
```

### 部署注意事项

1. **数据库迁移**：确保已执行 `source_attribution` 字段的迁移
2. **单元规范化**：修复后的代码会自动规范化单元名称，但历史数据中的空格差异可能需要手动清理
3. **API 兼容性**：所有修复都保持向后兼容，不影响现有前端代码

### 测试建议

1. 测试资源编辑功能，确认 `catalog_id` 和 `unit` 字段正确返回
2. 测试资源解绑后重新绑定功能
3. 测试教材目录页，确认相同名称的单元已正确合并
4. 测试统计信息，确认资源总数与单元列表一致

