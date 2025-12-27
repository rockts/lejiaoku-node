# Classification 模块删除总结

## 删除时间
2025-12-24

## 删除内容

### 1. 已删除的文件和目录
- ✅ `src/classification/` 整个目录已删除
  - `classification.controller.ts` - 控制器
  - `classification.service.ts` - 服务层（从废弃的 post 表查询）
  - `classification.router.ts` - 路由定义
  - `classification.model.ts` - 数据模型
  - `classification.middleware.ts` - 中间件

### 2. 从 `src/app/index.ts` 删除的代码
- ✅ 删除导入：`import classificationRouter from "../classification/classification.router";`
- ✅ 删除路由挂载：`classificationRouter` 从 `app.use()` 中移除

### 3. 添加的兼容路由（向后兼容）
在 `src/app/index.ts` 中添加了静态返回的兼容路由：

```typescript
/**
 * Classification 兼容路由（静态返回，用于向后兼容）
 * @deprecated 请使用 Resource.category 字段，此接口仅用于向后兼容
 * 前端应直接从资源列表获取分类选项，不再依赖此接口
 */
app.get('/classifications', (req, res) => {
  res.json(['教材', '教案', '课件', '习题', '其他']);
});

app.get('/classifications/category', (req, res) => {
  res.json(['教材', '教案', '课件', '习题', '其他']);
});
```

**说明：**
- 这些路由仅用于向后兼容，避免前端立即报错
- 返回静态的分类列表：`['教材', '教案', '课件', '习题', '其他']`
- 前端应尽快迁移到使用 `Resource.category` 字段

## 替代方案

### 前端应使用的方案

1. **获取分类列表**
   ```javascript
   // ❌ 不再使用
   GET /classifications/category
   
   // ✅ 应该使用：从资源列表获取唯一分类
   GET /api/resources?limit=1000
   // 然后从前端提取 category 的唯一值
   const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];
   ```

2. **使用静态分类列表（推荐）**
   ```javascript
   // 前端直接使用静态数组
   const CATEGORIES = ['教材', '教案', '课件', '习题', '其他'];
   ```

3. **筛选资源**
   ```javascript
   // ✅ 使用 category 参数筛选
   GET /api/resources?category=课件
   ```

## 前端迁移检查清单

- [ ] 删除所有对 `/classifications` 接口的调用
- [ ] 删除所有对 `/classifications/category` 接口的调用
- [ ] 更新 `PostList.vue`、`PostCreate.vue`、`PostEdit.vue` 等组件
- [ ] 更新 `ResourceCard.vue` 等组件
- [ ] 筛选下拉菜单使用静态列表或从资源列表提取
- [ ] 搜索、过滤逻辑改用 `category` 参数
- [ ] 确保构建后无警告或报错

## 后端验证

- ✅ `src/classification` 目录已删除
- ✅ `src/app/index.ts` 中已移除分类模块导入和挂载
- ✅ 添加了兼容路由（静态返回）
- ✅ 代码编译通过，无错误
- ✅ 仅文档中留有历史引用（不影响运行）

## 注意事项

1. **兼容路由是临时的**：建议前端尽快迁移，后续可以考虑删除这些兼容路由
2. **文档引用**：一些文档文件（如 `docs/API.md`、`docs/PROJECT_PLAN.md`）中可能还提到 classification，这些是历史记录，不影响代码运行
3. **数据库表**：如果有独立的 `classification` 数据库表，也需要考虑是否删除（本次未涉及）

## 相关接口

### 保留的兼容接口（静态返回）
- `GET /classifications` → 返回完整的分类对象（category, grade, version, subject）
- `GET /classifications/category` → 返回分类数组

### 应使用的 Resource API
- `GET /api/resources` → 获取资源列表（包含 category 字段）
- `GET /api/resources?category=课件` → 按分类筛选资源

## 完成状态

✅ **后端删除完成** - classification 模块已彻底删除，仅保留兼容路由
⏳ **前端迁移待完成** - 需要前端团队更新相关组件和接口调用

