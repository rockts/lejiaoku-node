# 教材目录页前端实现指南

## 📋 页面功能定位

**教材目录页是一个"可驱动行动的页面"，不是纯信息展示页。**

核心目标：通过状态提示和操作按钮，引导用户补充资源或整理单元。

**⚠️ 权限要求**：
- 仅 **contributor（贡献者）**、**editor（编辑）**、**admin（管理员）** 可访问
- 普通用户（user）无法访问教材目录页面
- 所有接口都需要登录并具有相应角色权限

---

## 🎯 页面路由设计

### 路由结构

```
/catalog                          → 教材目录列表页（选择教材）
/catalog/:catalogId               → 具体教材目录页（显示详细信息）
/catalog/:catalogId/unit/:unit   → 单元资源列表页（显示该单元的资源）
```

---

## 📄 页面 1：教材目录列表页 (`/catalog`)

### 功能
显示所有可用的教材目录，让用户选择具体教材。

### 接口调用
```
GET /api/catalogs?page=1&limit=20&education_level=小学&grade=2&subject=数学
```

**权限要求**：
- 需要登录（Authorization header 中携带 JWT token）
- 需要角色：`contributor`、`editor` 或 `admin`
- 普通用户（`user`）无法访问

**查询参数**（全部可选）：
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20（建议 20-50）
- `education_level`: 学段筛选，支持 `'小学'`、`'初中'`、`'elementary'`、`'middle'`
- `grade`: 年级筛选，如 `'1'`、`'2'`
- `subject`: 学科筛选，如 `'数学'`、`'语文'`

**重要提示**：
- 接口返回的是**对象**，包含 `data` 和 `pagination` 字段
- 数据已经按学段、年级、学科、版本、册别排序（小学在前，初中在后）
- **强烈建议使用分页**，避免一次性加载过多记录
- **未登录或权限不足**会返回 `401 Unauthorized` 或 `403 Forbidden`

### 返回数据结构
```json
{
  "data": [
    {
      "id": 113,
      "education_level": "小学",      // 已转换为中文
      "grade": "1",
      "subject": "体育",
      "textbook_version": "人教版",
      "volume": "上册",
      "created_at": "2025-12-22T16:29:26.000Z",
      "updated_at": "2025-12-25T22:38:16.000Z"
    },
    {
      "id": 114,
      "education_level": "小学",
      "grade": "1",
      "subject": "体育",
      "textbook_version": "人教版",
      "volume": "下册",
      "created_at": "2025-12-22T16:29:26.000Z",
      "updated_at": "2025-12-25T22:38:16.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1344,
    "total_pages": 68
  }
}
```

### 显示要求

1. **排序规则**（后端已处理，前端无需排序）：
   - 小学在前，初中在后
   - 每个学段内按：年级 → 学科 → 版本 → 册别排序

2. **展示方式**：
   - **必须显示所有教材列表**，不能只显示学段选择器
   - 可以按学段分组展示（小学一组，初中一组）
   - 每个教材显示：`{学科} {年级}{册别} {版本}`
   - 例如：`数学 二年级上册 人教版`

3. **交互**：
   - 点击某个教材 → 跳转到 `/catalog/:catalogId`

### ⚠️ 常见问题排查

**问题：只显示"选择的教育阶段"，看不到教材列表**

可能原因：
1. **前端没有正确调用接口**
   - 检查是否调用了 `GET /api/catalogs`
   - 检查接口返回的数据格式是否正确（应该是数组）

2. **前端没有正确渲染数据**
   - 检查是否遍历了返回的数组
   - 检查是否有条件渲染导致数据不显示

3. **前端只显示了学段选择器**
   - 必须显示完整的教材列表，不能只显示学段选择器
   - 学段选择器可以作为筛选功能，但不能替代教材列表

**正确的实现示例**（带分页和筛选）：
```vue
<template>
  <div class="catalog-list-page">
    <!-- 筛选器 -->
    <div class="filters">
      <select v-model="filters.education_level" @change="handleFilterChange">
        <option value="">全部学段</option>
        <option value="小学">小学</option>
        <option value="初中">初中</option>
      </select>
      <select v-model="filters.grade" @change="handleFilterChange">
        <option value="">全部年级</option>
        <option value="1">一年级</option>
        <option value="2">二年级</option>
        <!-- ... 其他年级 -->
      </select>
      <select v-model="filters.subject" @change="handleFilterChange">
        <option value="">全部学科</option>
        <option value="数学">数学</option>
        <option value="语文">语文</option>
        <!-- ... 其他学科 -->
      </select>
    </div>

    <!-- 教材列表 -->
    <div class="catalog-list">
      <div 
        v-for="catalog in catalogs" 
        :key="catalog.id"
        class="catalog-item"
        @click="goToCatalog(catalog.id)"
      >
        {{ catalog.subject }} 
        {{ catalog.grade }}{{ catalog.volume }} 
        {{ catalog.textbook_version }}
      </div>
    </div>

    <!-- 分页器 -->
    <div class="pagination">
      <button 
        @click="changePage(pagination.page - 1)"
        :disabled="pagination.page <= 1"
      >
        上一页
      </button>
      <span>第 {{ pagination.page }} / {{ pagination.total_pages }} 页（共 {{ pagination.total }} 条）</span>
      <button 
        @click="changePage(pagination.page + 1)"
        :disabled="pagination.page >= pagination.total_pages"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const catalogs = ref([]);
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
});

const filters = ref({
  education_level: '',
  grade: '',
  subject: '',
});

const fetchCatalogs = async () => {
  try {
    // 构建查询参数
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    });
    
    if (filters.value.education_level) {
      params.append('education_level', filters.value.education_level);
    }
    if (filters.value.grade) {
      params.append('grade', filters.value.grade);
    }
    if (filters.value.subject) {
      params.append('subject', filters.value.subject);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`/api/catalogs?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // 添加 Authorization header
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // 未登录，跳转到登录页
        router.push('/login');
        return;
      }
      if (response.status === 403) {
        // 权限不足，提示用户
        alert('您没有权限访问教材目录，需要贡献者、编辑或管理员权限');
        return;
      }
    }
    
    const result = await response.json();
    
    // 注意：接口返回的是对象，包含 data 和 pagination
    catalogs.value = result.data || [];
    pagination.value = result.pagination || pagination.value;
  } catch (error) {
    console.error('获取教材列表失败:', error);
  }
};

const handleFilterChange = () => {
  // 筛选时重置到第一页
  pagination.value.page = 1;
  fetchCatalogs();
};

const changePage = (newPage) => {
  pagination.value.page = newPage;
  fetchCatalogs();
};

onMounted(() => {
  fetchCatalogs();
});
</script>
```

---

## 📄 页面 2：具体教材目录页 (`/catalog/:catalogId`)

### 功能
显示指定教材的详细信息、单元列表和行为提示。

### 接口调用

#### 1. 获取 Catalog 基本信息
```
GET /api/catalogs/:catalogId/info
```

**权限要求**：
- 需要登录（Authorization header 中携带 JWT token）
- 需要角色：`contributor`、`editor` 或 `admin`

**返回数据结构**：
```json
{
  "success": true,
  "data": {
    "catalog_id": 1,
    "subject": "数学",
    "grade": "2",
    "volume": "上册",
    "textbook_version": "人教版",
    "education_level": "小学",           // 已转换为中文
    "unit_total": 5,                    // 单元总数
    "resource_total": 15,               // 资源总数
    "quality_state": "healthy",         // 质量状态
    "action_type": "no_action",         // 行动类型
    "view_state": "no_action",          // 前端使用的状态（重要！）
    "action_hint": "该教材内容充足，无需行动"  // 行为提示
  },
  "message": "成功获取 catalog 1 的信息"
}
```

#### 2. 获取 Unit 列表
```
GET /api/catalogs/:catalogId/units
```

**权限要求**：
- 需要登录（Authorization header 中携带 JWT token）
- 需要角色：`contributor`、`editor` 或 `admin`

**返回数据结构**：
```json
{
  "success": true,
  "data": [
    {
      "unit": "第一单元",
      "unit_index": 1,
      "resource_count": 3,
      "unit_state": "healthy"           // 单元健康度（重要！）
    },
    {
      "unit": "第二单元",
      "unit_index": 2,
      "resource_count": 1,
      "unit_state": "sparse"
    },
    {
      "unit": "第三单元",
      "unit_index": 3,
      "resource_count": 0,
      "unit_state": "empty"
    }
  ],
  "catalog_id": 1,
  "count": 3,
  "message": "成功获取 catalog 1 下 3 个 unit"
}
```

### 页面结构

#### 顶部：Catalog 基本信息卡片

```
┌─────────────────────────────────────────┐
│  小学 数学 二年级 上册 人教版            │
│  单元总数：5  |  资源总数：15            │
└─────────────────────────────────────────┘
```

**显示字段**：
- `education_level` + `subject` + `grade` + `volume` + `textbook_version`
- `unit_total` 和 `resource_total`

---

#### 行为提示区域（根据 `view_state` 显示）

**重要：前端只需要关心 `view_state` 字段，不要使用 `action_type`！**

##### view_state = "add_resources"

```html
<div class="action-prompt add-resources">
  <p>该教材暂无资源，建议优先补充内容</p>
  <!-- 或 -->
  <p>该教材资源密度不足，建议补充更多资源</p>
  <button>补充资源</button>
</div>
```

**显示规则**：
- 如果 `resource_total = 0`：显示"该教材暂无资源，建议优先补充内容"
- 如果 `resource_total > 0`：显示"该教材资源密度不足，建议补充更多资源"
- 显示"补充资源"按钮，点击后引导用户上传资源

##### view_state = "organize_units"

```html
<div class="action-prompt organize-units">
  <p>该教材有资源但缺少单元信息，建议整理单元</p>
  <button v-if="isAdmin">整理单元</button>  <!-- 仅管理员可见 -->
</div>
```

**显示规则**：
- 显示提示文字："该教材有资源但缺少单元信息，建议整理单元"
- 显示"整理单元"按钮（仅管理员可见）

##### view_state = "no_action"

```html
<div class="action-prompt no-action">
  <p>该教材内容充足，无需行动</p>
  <span class="badge">内容充足</span>
</div>
```

**显示规则**：
- 显示提示文字："该教材内容充足，无需行动"
- 显示"内容充足"标识（绿色徽章）

---

#### 主体：Unit 列表

**重要：根据 `unit_state` 显示不同的 UI！**

##### unit_state = "empty" (resource_count = 0)

```html
<div class="unit-item unit-empty">
  <div class="unit-header">
    <h3>第一单元</h3>
    <span class="badge badge-empty">空</span>
  </div>
  <p class="unit-description">该单元暂无资源</p>
  <button class="btn-primary">为该单元上传资源</button>
</div>
```

**显示规则**：
- 突出显示（红色边框或背景）
- 显示"空"标识
- 显示"为该单元上传资源"按钮
- 点击按钮引导用户上传资源

##### unit_state = "sparse" (resource_count = 1)

```html
<div class="unit-item unit-sparse">
  <div class="unit-header">
    <h3>第二单元</h3>
    <span class="badge badge-sparse">稀疏</span>
  </div>
  <p class="unit-description">该单元资源较少，建议补充</p>
  <p class="resource-count">1 个资源</p>
  <button class="btn-secondary">补充资源</button>
</div>
```

**显示规则**：
- 弱化显示（黄色边框或背景）
- 显示"稀疏"标识
- 显示"该单元资源较少，建议补充"提示
- 显示资源数量
- 显示"补充资源"按钮

##### unit_state = "healthy" (resource_count >= 2)

```html
<div class="unit-item unit-healthy">
  <div class="unit-header">
    <h3>第三单元</h3>
    <span class="badge badge-healthy">健康</span>
  </div>
  <p class="unit-description">该单元内容充足</p>
  <p class="resource-count">3 个资源</p>
</div>
```

**显示规则**：
- 正常显示（绿色边框或背景）
- 显示"健康"标识
- 显示"该单元内容充足"提示
- 显示资源数量
- 不显示操作按钮

---

#### 交互行为

1. **点击单元**：
   - 跳转到 `/catalog/:catalogId/unit/:unit`
   - 显示该单元的资源列表

2. **点击"补充资源"按钮**：
   - 引导用户上传资源（可以预填 catalog_id 和 unit）

3. **点击"为该单元上传资源"按钮**：
   - 引导用户上传资源（预填 catalog_id 和 unit）

---

## 📄 页面 3：单元资源列表页 (`/catalog/:catalogId/unit/:unit`)

### 功能
显示指定单元下的所有资源。

### 接口调用
```
GET /api/catalogs/:catalogId/units/:unit/resources?page=1&limit=30
```

**权限要求**：
- 需要登录（Authorization header 中携带 JWT token）
- 需要角色：`contributor`、`editor` 或 `admin`

### 返回数据结构
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "第一单元课件",
      "description": "第一单元的教学课件",
      "category": "课件",
      "subject": "数学",
      "grade": "2",
      "textbook": "人教版",
      "unit": "第一单元",
      "unit_index": 1,
      "file_format": "PPT",
      "file_url": "http://localhost:8080/api/files/xxx",
      "cover_url": "http://localhost:8080/api/covers/xxx",
      "download_count": 10,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "catalog_id": 1,
  "unit": "第一单元",
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 3,
    "total_pages": 1
  },
  "message": "成功获取 catalog 1 的 unit \"第一单元\" 下 3 条资源"
}
```

### 显示要求

1. **页面标题**：
   - 显示：`{学科} {年级}{册别} {版本} - {单元名称}`
   - 例如：`数学 二年级上册 人教版 - 第一单元`

2. **资源列表**：
   - 以卡片或列表形式展示资源
   - 显示资源标题、描述、分类、封面等
   - 支持分页

3. **面包屑导航**：
   ```
   教材目录 > 数学 二年级上册 人教版 > 第一单元
   ```

---

## 🎨 UI/UX 建议

### 颜色方案

- **empty（空）**：红色系（#f44336）
- **sparse（稀疏）**：黄色系（#ff9800）
- **healthy（健康）**：绿色系（#4caf50）
- **no_action**：绿色系（#4caf50）
- **add_resources**：蓝色系（#2196f3）
- **organize_units**：橙色系（#ff9800）

### 图标建议

- **empty**：⚠️ 或 🚫
- **sparse**：⚠️ 或 📉
- **healthy**：✅ 或 📊
- **补充资源**：📤 或 ➕
- **整理单元**：📝 或 🔧

---

## ⚠️ 重要注意事项

### 1. 状态字段使用

**✅ 正确**：
```javascript
// 使用 view_state（前端专用）
if (catalogInfo.view_state === 'add_resources') {
  // 显示补充资源按钮
}
```

**❌ 错误**：
```javascript
// 不要直接使用 action_type
if (catalogInfo.action_type === 'prioritize_upload') {
  // 错误！应该用 view_state
}
```

### 2. 学段显示

**✅ 正确**：
```javascript
// 后端已转换为中文，直接显示
<div>{catalogInfo.education_level}</div>  // 显示"小学"或"初中"
```

**❌ 错误**：
```javascript
// 不要在前端再次转换
const levelMap = { 'elementary': '小学', 'middle': '初中' };
// 后端已经转换好了，不需要再转换
```

### 3. 排序

**✅ 正确**：
```javascript
// 后端已排序，前端直接使用
units.forEach(unit => {
  // 直接渲染，无需排序
});
```

**❌ 错误**：
```javascript
// 不要在前端重新排序
units.sort((a, b) => {
  // 后端已经排序好了
});
```

### 4. 数据获取顺序

**✅ 正确**：
```javascript
// 并行获取两个接口
const [catalogInfo, units] = await Promise.all([
  fetch(`/api/catalogs/${catalogId}/info`),
  fetch(`/api/catalogs/${catalogId}/units`)
]);
```

---

## 📝 完整示例代码（Vue 3）

```vue
<template>
  <div class="catalog-page">
    <!-- 顶部：Catalog 基本信息 -->
    <div class="catalog-header">
      <h1>
        {{ catalogInfo.education_level }} 
        {{ catalogInfo.subject }} 
        {{ catalogInfo.grade }}{{ catalogInfo.volume }} 
        {{ catalogInfo.textbook_version }}
      </h1>
      <div class="catalog-stats">
        <span>单元总数：{{ catalogInfo.unit_total }}</span>
        <span>资源总数：{{ catalogInfo.resource_total }}</span>
      </div>
    </div>

    <!-- 行为提示区域 -->
    <div class="action-prompt" :class="catalogInfo.view_state">
      <p>{{ catalogInfo.action_hint }}</p>
      <button 
        v-if="catalogInfo.view_state === 'add_resources'"
        @click="handleAddResources"
      >
        补充资源
      </button>
      <button 
        v-if="catalogInfo.view_state === 'organize_units' && isAdmin"
        @click="handleOrganizeUnits"
      >
        整理单元
      </button>
      <span 
        v-if="catalogInfo.view_state === 'no_action'"
        class="badge badge-success"
      >
        内容充足
      </span>
    </div>

    <!-- Unit 列表 -->
    <div class="unit-list">
      <div 
        v-for="unit in units" 
        :key="unit.unit"
        class="unit-item"
        :class="`unit-${unit.unit_state}`"
        @click="goToUnitResources(unit.unit)"
      >
        <div class="unit-header">
          <h3>{{ unit.unit }}</h3>
          <span class="badge" :class="`badge-${unit.unit_state}`">
            {{ getUnitStateLabel(unit.unit_state) }}
          </span>
        </div>
        <p class="unit-description">
          {{ getUnitDescription(unit.unit_state) }}
        </p>
        <p class="resource-count">{{ unit.resource_count }} 个资源</p>
        <button 
          v-if="unit.unit_state === 'empty'"
          class="btn-primary"
          @click.stop="handleUploadForUnit(unit.unit)"
        >
          为该单元上传资源
        </button>
        <button 
          v-else-if="unit.unit_state === 'sparse'"
          class="btn-secondary"
          @click.stop="handleAddResources"
        >
          补充资源
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const catalogId = route.params.catalogId;

const catalogInfo = ref(null);
const units = ref([]);
const isAdmin = ref(false); // 从用户信息获取

// 获取 Catalog 信息
const fetchCatalogInfo = async () => {
  const token = localStorage.getItem('token'); // 从本地存储获取 token
  const response = await fetch(`/api/catalogs/${catalogId}/info`, {
    headers: {
      'Authorization': `Bearer ${token}`, // 添加 Authorization header
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // 未登录，跳转到登录页
      router.push('/login');
      return;
    }
    if (response.status === 403) {
      // 权限不足，提示用户
      alert('您没有权限访问教材目录，需要贡献者、编辑或管理员权限');
      return;
    }
  }
  
  const data = await response.json();
  catalogInfo.value = data.data;
};

// 获取 Unit 列表
const fetchUnits = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/catalogs/${catalogId}/units`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      router.push('/login');
      return;
    }
    if (response.status === 403) {
      alert('您没有权限访问教材目录，需要贡献者、编辑或管理员权限');
      return;
    }
  }
  
  const data = await response.json();
  units.value = data.data;
};

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchCatalogInfo(),
    fetchUnits()
  ]);
});

// 辅助函数
const getUnitStateLabel = (state) => {
  const labels = {
    'empty': '空',
    'sparse': '稀疏',
    'healthy': '健康'
  };
  return labels[state] || '';
};

const getUnitDescription = (state) => {
  const descriptions = {
    'empty': '该单元暂无资源',
    'sparse': '该单元资源较少，建议补充',
    'healthy': '该单元内容充足'
  };
  return descriptions[state] || '';
};

// 交互处理
const goToUnitResources = (unit) => {
  router.push(`/catalog/${catalogId}/unit/${encodeURIComponent(unit)}`);
};

const handleAddResources = () => {
  // 跳转到上传页面，预填 catalog_id
  router.push(`/upload?catalog_id=${catalogId}`);
};

const handleOrganizeUnits = () => {
  // 跳转到整理单元页面
  router.push(`/admin/catalog/${catalogId}/organize`);
};

const handleUploadForUnit = (unit) => {
  // 跳转到上传页面，预填 catalog_id 和 unit
  router.push(`/upload?catalog_id=${catalogId}&unit=${encodeURIComponent(unit)}`);
};
</script>

<style scoped>
.unit-empty {
  border-left: 4px solid #f44336;
  background-color: #ffebee;
}

.unit-sparse {
  border-left: 4px solid #ff9800;
  background-color: #fff3e0;
}

.unit-healthy {
  border-left: 4px solid #4caf50;
  background-color: #e8f5e9;
}

.action-prompt.add-resources {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.action-prompt.organize-units {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
}

.action-prompt.no-action {
  background-color: #e8f5e9;
  border-left: 4px solid #4caf50;
}
</style>
```

---

## ✅ 检查清单

实现完成后，请确认：

- [ ] `/catalog` 页面显示所有教材目录列表（小学在前，初中在后）
- [ ] `/catalog/:catalogId` 页面显示完整的教材信息
- [ ] 根据 `view_state` 正确显示行为提示
- [ ] 根据 `unit_state` 正确显示单元状态
- [ ] 点击单元跳转到资源列表页
- [ ] 按钮点击后正确跳转到上传页面
- [ ] 学段显示为中文（"小学"/"初中"）
- [ ] 所有数据来自后端接口，前端不进行转换或排序

---

## 📚 相关接口文档

- [Catalog Info 和第一条教材搜索 SQL 规范](../catalog-info-and-first-search.md)
- [教材目录页行为规范](../catalog-page-behavior.md)
- [Catalog 行动系统规范](../catalog-action-system.md)

