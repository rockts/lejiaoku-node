# 资源编辑页面教材目录绑定功能说明

## 功能概述

在资源编辑页面（`/resources/:id/edit`）添加教材目录绑定功能，允许用户手动选择并绑定教材目录。

## 接口说明

### 1. 获取资源详情（用于编辑页面）

**接口**: `GET /api/resources/:id`

**说明**: 资源详情接口已经返回 `catalog_info` 字段（如果资源已绑定教材目录）。

**返回示例**:
```json
{
  "id": 49,
  "title": "数学六年级下册",
  "subject": "数学",
  "grade": "三年级下册",
  "textbook": "人教版",
  "catalog_info": {
    "education_level": "小学",
    "grade": "3",
    "subject": "数学",
    "textbook_version": "人教版",
    "volume": "下册"
  }
}
```

**注意**: 
- 如果资源未绑定教材目录，`catalog_info` 字段不存在
- `catalog_info` 中的 `grade` 是数字格式（如 "3"），而 `resource.grade` 可能是字符串格式（如 "三年级下册"）

---

### 2. 获取教材目录列表（用于下拉选择）

**接口**: `GET /api/catalogs`

**权限要求**: 需要登录，角色为 `contributor`、`editor` 或 `admin`

**查询参数**:
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20
- `education_level`: 学段筛选（`'小学'`、`'初中'`、`'elementary'`、`'middle'`）
- `grade`: 年级筛选（如 `'1'`、`'2'`）
- `subject`: 学科筛选（如 `'数学'`、`'语文'`）
- `textbook_version`: 版本筛选（如 `'人教版'`、`'苏教版'`）

**返回示例**:
```json
{
  "data": [
    {
      "id": 113,
      "education_level": "小学",
      "grade": "3",
      "subject": "数学",
      "textbook_version": "人教版",
      "volume": "下册"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 922,
    "total_pages": 47
  }
}
```

---

### 3. 更新资源（包含教材目录绑定）

**接口**: `PUT /api/resources/:id`

**新增参数**: `catalog_id`（可选）

**请求示例**:
```javascript
// 更新资源并绑定教材目录
const response = await fetch(`/api/resources/49`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: "数学六年级下册",
    subject: "数学",
    grade: "三年级下册",
    textbook: "人教版",
    catalog_id: 113,  // 新增：教材目录ID
    unit: "第一单元",  // 如果绑定了 catalog，建议同时填写 unit
    unit_index: 1
  })
});
```

**说明**:
- `catalog_id`: 教材目录ID（可选）
  - 如果提供，会将资源绑定到指定的教材目录
  - 如果为 `null` 或空字符串，会解除绑定（如果之前已绑定）
  - 绑定后，资源详情接口会返回 `catalog_info` 字段
- `unit`: 单元名称（可选，但建议在绑定 catalog 时填写）
- `unit_index`: 单元序号（可选）

**重要约束**:
- 如果资源已绑定教材目录，`unit` 字段不能为空
- 如果绑定了教材目录但没有填写 `unit`，系统会警告但不强制要求（用户可能稍后填写）

---

## 前端实现建议

### 1. 教材目录选择器

在资源编辑页面添加教材目录选择器：

```vue
<template>
  <div class="catalog-binding-section">
    <h3>教材目录绑定（可选）</h3>
    
    <!-- 当前绑定的教材目录 -->
    <div v-if="resource.catalog_info" class="current-catalog">
      <p>当前绑定：</p>
      <p>
        {{ resource.catalog_info.education_level }}
        {{ resource.catalog_info.subject }}
        {{ resource.catalog_info.grade }}年级
        {{ resource.catalog_info.volume }}
        {{ resource.catalog_info.textbook_version }}
      </p>
      <button @click="unbindCatalog">解除绑定</button>
    </div>
    
    <!-- 教材目录选择器 -->
    <div class="catalog-selector">
      <label>选择教材目录：</label>
      <select v-model="selectedCatalogId" @change="onCatalogChange">
        <option value="">-- 请选择 --</option>
        <optgroup 
          v-for="level in catalogGroups" 
          :key="level.name"
          :label="level.name"
        >
          <option 
            v-for="catalog in level.catalogs" 
            :key="catalog.id"
            :value="catalog.id"
          >
            {{ catalog.subject }} {{ catalog.grade }}年级 {{ catalog.volume }} {{ catalog.textbook_version }}
          </option>
        </optgroup>
      </select>
    </div>
    
    <!-- 单元信息（绑定教材目录后显示） -->
    <div v-if="selectedCatalogId || resource.catalog_info" class="unit-info">
      <label>所属单元 *：</label>
      <input 
        v-model="formData.unit" 
        placeholder="如：第一单元"
        required
      />
      <input 
        v-model="formData.unit_index" 
        type="number"
        placeholder="单元序号（可选）"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const resource = ref({});
const catalogs = ref([]);
const selectedCatalogId = ref(null);

// 按学段分组
const catalogGroups = computed(() => {
  const groups = {
    '小学': [],
    '初中': []
  };
  
  catalogs.value.forEach(catalog => {
    const level = catalog.education_level;
    if (groups[level]) {
      groups[level].push(catalog);
    }
  });
  
  return [
    { name: '小学', catalogs: groups['小学'] },
    { name: '初中', catalogs: groups['初中'] }
  ];
});

// 加载资源详情
const loadResource = async () => {
  const response = await fetch(`/api/resources/${resourceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  resource.value = await response.json();
  
  // 如果已绑定教材目录，设置选中值
  if (resource.value.catalog_info) {
    // 需要通过 catalog_info 找到对应的 catalog_id
    // 可以调用接口搜索匹配的 catalog
    await findCatalogIdByInfo(resource.value.catalog_info);
  }
};

// 根据 catalog_info 查找 catalog_id
const findCatalogIdByInfo = async (catalogInfo) => {
  const params = new URLSearchParams({
    education_level: catalogInfo.education_level === '小学' ? 'elementary' : 'middle',
    grade: catalogInfo.grade,
    subject: catalogInfo.subject,
    textbook_version: catalogInfo.textbook_version,
    volume: catalogInfo.volume,
    limit: '1'
  });
  
  const response = await fetch(`/api/catalogs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  if (result.data && result.data.length > 0) {
    selectedCatalogId.value = result.data[0].id;
  }
};

// 加载教材目录列表（可以根据当前资源的 subject/grade 筛选）
const loadCatalogs = async () => {
  const params = new URLSearchParams({
    limit: '1000'  // 获取所有，或根据 subject/grade 筛选
  });
  
  if (resource.value.subject) {
    params.append('subject', resource.value.subject);
  }
  
  const response = await fetch(`/api/catalogs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  catalogs.value = result.data || [];
};

// 保存资源（包含 catalog_id）
const saveResource = async () => {
  const formData = {
    title: resource.value.title,
    subject: resource.value.subject,
    grade: resource.value.grade,
    textbook: resource.value.textbook,
    catalog_id: selectedCatalogId.value || null,
    unit: formData.unit,
    unit_index: formData.unit_index
  };
  
  const response = await fetch(`/api/resources/${resourceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });
  
  if (response.ok) {
    alert('保存成功！');
    // 重新加载资源详情
    await loadResource();
  }
};

// 解除绑定
const unbindCatalog = () => {
  selectedCatalogId.value = null;
  formData.unit = '';
  formData.unit_index = null;
};

onMounted(async () => {
  await loadResource();
  await loadCatalogs();
});
</script>
```

### 2. 简化版本（使用搜索）

如果教材目录列表太长，可以使用搜索功能：

```vue
<template>
  <div class="catalog-search">
    <input 
      v-model="catalogSearch" 
      placeholder="搜索教材目录..."
      @input="searchCatalogs"
    />
    <select v-model="selectedCatalogId" v-if="searchResults.length > 0">
      <option value="">-- 请选择 --</option>
      <option 
        v-for="catalog in searchResults" 
        :key="catalog.id"
        :value="catalog.id"
      >
        {{ catalog.education_level }} {{ catalog.subject }} {{ catalog.grade }}年级 {{ catalog.volume }} {{ catalog.textbook_version }}
      </option>
    </select>
  </div>
</template>
```

---

## 注意事项

1. **权限要求**: 所有接口都需要登录，且角色为 `contributor`、`editor` 或 `admin`，`editor`和 `admin`可以编辑其他人的资源，`contributor`只能编辑自己发布的资源
2. **单元字段**: 绑定教材目录后，建议同时填写 `unit` 字段
3. **数据格式**: `catalog_info.grade` 是数字格式（如 "3"），而 `resource.grade` 可能是字符串格式（如 "三年级下册"）
4. **解除绑定**: 将 `catalog_id` 设置为 `null` 或空字符串可以解除绑定

---

## 测试示例

```bash
# 1. 获取资源详情
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/resources/49

# 2. 更新资源并绑定教材目录
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "数学六年级下册",
    "catalog_id": 113,
    "unit": "第一单元",
    "unit_index": 1
  }' \
  http://localhost:8080/api/resources/49

# 3. 解除绑定
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "catalog_id": null
  }' \
  http://localhost:8080/api/resources/49
```

