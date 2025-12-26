# Catalog 任务系统故障排查

## 问题：前端获取不到数据，点击"补充教材资源"或"整理教材单元"报错

### 可能原因

1. **`catalog_tasks` 表不存在**（最常见）
   - 数据库迁移脚本未执行
   - 表名拼写错误

2. **服务未重启**
   - 新代码未生效
   - 需要重启 Node.js 服务

3. **数据库连接问题**
   - 数据库服务未启动
   - 连接配置错误

---

## 解决方案

### 步骤 1：检查表是否存在

```sql
-- 连接到数据库
mysql -u root -p lejiaoku_node

-- 检查表是否存在
SHOW TABLES LIKE 'catalog_tasks';

-- 如果表不存在，会返回空结果
```

### 步骤 2：执行数据库迁移

如果表不存在，执行迁移脚本：

```bash
# 方法 1：使用 mysql 命令行
mysql -u root -p lejiaoku_node < scripts/create-catalog-tasks-table.sql

# 方法 2：在 MySQL 客户端中执行
mysql -u root -p lejiaoku_node
source scripts/create-catalog-tasks-table.sql;
```

### 步骤 3：验证表结构

```sql
-- 查看表结构
DESCRIBE catalog_tasks;

-- 应该看到以下字段：
-- id, task_type, catalog_id, unit, created_by, status, created_at, updated_at
```

### 步骤 4：重启服务

```bash
# 停止当前服务（Ctrl+C）
# 然后重新启动
npm start
# 或
npm run dev
```

---

## 错误信息对照

### 错误 1：`ER_NO_SUCH_TABLE`

**错误信息**：
```
Table 'lejiaoku_node.catalog_tasks' doesn't exist
```

**解决方案**：
执行数据库迁移脚本 `scripts/create-catalog-tasks-table.sql`

---

### 错误 2：`ER_NO_REFERENCED_ROW_2`

**错误信息**：
```
Cannot add or update a child row: a foreign key constraint fails
```

**解决方案**：
- 检查 `catalog_id` 是否存在于 `textbook_catalog` 表中
- 检查 `created_by` 是否存在于 `user` 表中

---

### 错误 3：`401 Unauthorized`

**错误信息**：
```
未授权，请先登录
```

**解决方案**：
- 确保前端已登录
- 检查 Authorization header 是否正确传递

---

## 测试接口

### 1. 创建任务

```bash
curl -X POST "http://localhost:3333/api/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "add_resources",
    "catalog_id": 1,
    "unit": "第一单元"
  }'
```

**预期返回**：
```json
{
  "success": true,
  "message": "任务创建成功",
  "data": {
    "id": 1,
    "task_type": "add_resources",
    "catalog_id": 1,
    "unit": "第一单元",
    "created_by": 1,
    "status": "pending",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. 获取我的任务

```bash
curl -X GET "http://localhost:3333/api/tasks/mine" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期返回**：
```json
{
  "success": true,
  "data": [...],
  "count": 0,
  "message": "成功获取 0 个待处理任务"
}
```

---

## 快速检查清单

- [ ] `catalog_tasks` 表已创建
- [ ] 表结构正确（包含所有必需字段）
- [ ] 服务已重启
- [ ] 数据库连接正常
- [ ] 用户已登录（有有效的 token）
- [ ] `catalog_id` 存在于 `textbook_catalog` 表中

---

## 如果问题仍然存在

1. **查看服务日志**
   - 检查控制台输出的错误信息
   - 查看错误堆栈

2. **检查数据库连接**
   ```bash
   # 测试数据库连接
   mysql -u root -p lejiaoku_node -e "SELECT 1;"
   ```

3. **验证 SQL 脚本**
   ```bash
   # 检查 SQL 脚本语法
   mysql -u root -p lejiaoku_node --execute="source scripts/create-catalog-tasks-table.sql;"
   ```

4. **查看详细错误**
   - 打开浏览器开发者工具
   - 查看 Network 标签页中的请求和响应
   - 查看 Console 标签页中的错误信息

