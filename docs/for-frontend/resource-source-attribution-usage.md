# 资源出处字段使用指南

## 概述

`source_attribution` 字段用于标注资源的原始来源，如"xx教育"、"某某出版社"等。这是一个可选字段，用于标明资源的出处。

## API 使用

### 1. 创建资源时添加出处

**接口**：`POST /api/resources`

**请求示例**：

```javascript
const formData = new FormData();
formData.append('title', '小学数学一年级上册第一单元练习');
formData.append('category', '习题');
formData.append('file', fileInput.files[0]);
formData.append('subject', '数学');
formData.append('grade', '一年级');
formData.append('source_attribution', 'xx教育'); // 添加出处

const response = await fetch('/api/resources', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**cURL 示例**：

```bash
curl -X POST http://localhost:3333/api/resources \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=小学数学一年级上册第一单元练习" \
  -F "category=习题" \
  -F "file=@/path/to/file.pdf" \
  -F "subject=数学" \
  -F "grade=一年级" \
  -F "source_attribution=xx教育"
```

### 2. 编辑资源时更新出处

**接口**：`PUT /api/resources/:id`

**请求示例**：

```javascript
const response = await fetch(`/api/resources/${resourceId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    source_attribution: '某某出版社' // 更新出处
  })
});
```

**cURL 示例**：

```bash
curl -X PUT http://localhost:3333/api/resources/26 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_attribution": "某某出版社"
  }'
```

### 3. 查询资源时获取出处

**接口**：`GET /api/resources/:id`

**响应示例**：

```json
{
  "id": 26,
  "title": "小学数学一年级上册第一单元练习",
  "description": "这是一份完整的练习",
  "category": "习题",
  "subject": "数学",
  "grade": "一年级",
  "source_attribution": "xx教育",
  "file_url": "http://localhost:3333/uploads/resources/xxx.pdf",
  "cover_url": "http://localhost:3333/uploads/cover/xxx.jpg",
  "download_count": 0,
  "created_at": "2025-01-23T10:00:00.000Z",
  "updated_at": "2025-01-23T10:00:00.000Z"
}
```

## 前端使用示例

### Vue 3 示例

#### 1. 资源创建表单

```vue
<template>
  <form @submit.prevent="submitResource">
    <div class="form-group">
      <label>资源标题</label>
      <input v-model="form.title" required />
    </div>
    
    <div class="form-group">
      <label>资源出处（可选）</label>
      <input 
        v-model="form.source_attribution" 
        placeholder="如：xx教育、某某出版社等"
        maxlength="100"
      />
      <small>用于标注资源的原始来源</small>
    </div>
    
    <button type="submit">提交</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/services/api';

const authStore = useAuthStore();
const form = ref({
  title: '',
  category: '',
  source_attribution: '', // 出处字段
  // ... 其他字段
});

const submitResource = async () => {
  const formData = new FormData();
  formData.append('title', form.value.title);
  formData.append('category', form.value.category);
  if (form.value.source_attribution) {
    formData.append('source_attribution', form.value.source_attribution);
  }
  // ... 添加其他字段
  
  try {
    const response = await apiClient.post('/resources', formData, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    console.log('资源创建成功', response.data);
  } catch (error) {
    console.error('资源创建失败', error);
  }
};
</script>
```

#### 2. 资源编辑表单

```vue
<template>
  <form @submit.prevent="updateResource">
    <div class="form-group">
      <label>资源出处</label>
      <input 
        v-model="resource.source_attribution" 
        placeholder="如：xx教育、某某出版社等"
        maxlength="100"
      />
    </div>
    
    <button type="submit">保存</button>
  </form>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/services/api';

const route = useRoute();
const resource = ref({
  source_attribution: '',
  // ... 其他字段
});

const updateResource = async () => {
  try {
    const response = await apiClient.put(
      `/resources/${route.params.id}`,
      {
        source_attribution: resource.value.source_attribution
      }
    );
    console.log('资源更新成功', response.data);
  } catch (error) {
    console.error('资源更新失败', error);
  }
};
</script>
```

#### 3. 资源详情页显示

```vue
<template>
  <div class="resource-detail">
    <h1>{{ resource.title }}</h1>
    
    <!-- 资源出处 -->
    <div v-if="resource.source_attribution" class="source-attribution">
      <span class="label">资源出处：</span>
      <span class="value">{{ resource.source_attribution }}</span>
    </div>
    
    <!-- 其他资源信息 -->
    <div class="resource-info">
      <p>学科：{{ resource.subject }}</p>
      <p>年级：{{ resource.grade }}</p>
      <!-- ... -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/services/api';

const route = useRoute();
const resource = ref({});

onMounted(async () => {
  try {
    const response = await apiClient.get(`/resources/${route.params.id}`);
    resource.value = response.data;
  } catch (error) {
    console.error('获取资源详情失败', error);
  }
});
</script>

<style scoped>
.source-attribution {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.source-attribution .label {
  font-weight: 500;
  color: #666;
}

.source-attribution .value {
  color: #333;
  margin-left: 8px;
}
</style>
```

#### 4. 资源列表显示

```vue
<template>
  <div class="resource-list">
    <div 
      v-for="resource in resources" 
      :key="resource.id"
      class="resource-card"
    >
      <h3>{{ resource.title }}</h3>
      
      <!-- 资源出处（可选显示） -->
      <div v-if="resource.source_attribution" class="source-badge">
        📌 {{ resource.source_attribution }}
      </div>
      
      <!-- 其他信息 -->
      <div class="resource-meta">
        <span>{{ resource.subject }}</span>
        <span>{{ resource.grade }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.source-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: #e8f4f8;
  color: #1890ff;
  border-radius: 12px;
  font-size: 12px;
  margin-top: 8px;
}
</style>
```

## 字段说明

### 字段属性

- **字段名**：`source_attribution`
- **类型**：`string | null`
- **长度限制**：最多 100 个字符
- **是否必填**：否（可选字段）
- **默认值**：`null`

### 使用场景

1. **标注资源来源**：标明资源来自哪个教育机构、出版社等
2. **版权声明**：用于标注资源的版权归属
3. **资源追踪**：帮助追踪资源的原始来源

### 示例值

- `"xx教育"`
- `"某某出版社"`
- `"XX 教育出版社"`
- `"XX 市第一小学"`
- `"XX 省教育厅"`

## 注意事项

1. **字段可选**：`source_attribution` 是可选字段，可以为空
2. **长度限制**：最多 100 个字符，前端应做长度验证
3. **自动去空格**：后端会自动去除首尾空格
4. **显示位置**：建议在资源详情页的明显位置显示，列表页可选择性显示

## 完整示例

### 创建带出处的资源

```javascript
// 使用 FormData（包含文件上传）
const formData = new FormData();
formData.append('title', '小学数学一年级上册第一单元练习');
formData.append('category', '习题');
formData.append('file', fileInput.files[0]);
formData.append('subject', '数学');
formData.append('grade', '一年级');
formData.append('source_attribution', 'xx教育');

const response = await fetch('/api/resources', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('创建的资源：', result);
// 返回的资源对象包含 source_attribution 字段
```

### 更新资源出处

```javascript
// 只更新出处字段
const response = await fetch('/api/resources/26', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    source_attribution: '某某出版社'
  })
});

const result = await response.json();
console.log('更新后的资源：', result);
```

### 清空资源出处

```javascript
// 将 source_attribution 设置为 null 或空字符串即可清空
const response = await fetch('/api/resources/26', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    source_attribution: null // 或 ''
  })
});
```

## 总结

`source_attribution` 字段的使用非常简单：

1. **创建时**：在 `POST /api/resources` 请求中添加 `source_attribution` 参数
2. **编辑时**：在 `PUT /api/resources/:id` 请求中添加 `source_attribution` 参数
3. **查询时**：`GET /api/resources/:id` 和列表接口会自动返回该字段
4. **显示时**：前端在资源详情页或列表页显示该字段即可

字段已完全集成到系统中，可以直接使用！

