# 资源创建页面教材目录绑定功能说明

## 功能概述

在资源创建页面（`/resources/create?catalog_id=4310`）支持从 URL 查询参数读取 `catalog_id`，并在创建资源时自动绑定到对应的教材目录。

## 前端实现要点

### 1. URL 路径格式

**正确格式**：
```
http://localhost:8080/resources/create?catalog_id=4310
```

**说明**：
- `catalog_id` 作为 URL 查询参数传递
- 前端需要从 URL 中读取 `catalog_id`，并在提交表单时包含在 POST body 中

### 2. 前端代码示例（Vue 3）

```vue
<template>
  <div class="resource-create">
    <form @submit.prevent="handleSubmit">
      <!-- 其他表单字段 -->
      <input v-model="form.title" placeholder="资源标题" required />
      <input v-model="form.subject" placeholder="学科" />
      <input v-model="form.grade" placeholder="年级" />
      
      <!-- 教材目录选择（如果 URL 中有 catalog_id，自动选中） -->
      <select v-model="form.catalog_id" v-if="catalogList.length > 0">
        <option value="">请选择教材目录</option>
        <option 
          v-for="catalog in catalogList" 
          :key="catalog.id" 
          :value="catalog.id"
        >
          {{ catalog.education_level }} {{ catalog.grade }}年级 {{ catalog.subject }} {{ catalog.textbook_version }} {{ catalog.volume }}
        </option>
      </select>
      
      <!-- 单元选择（如果绑定了 catalog，必须填写） -->
      <input 
        v-model="form.unit" 
        placeholder="单元名称（如：第一单元）" 
        :required="!!form.catalog_id"
      />
      <input 
        v-model.number="form.unit_index" 
        type="number" 
        placeholder="单元序号（如：1）"
      />
      
      <button type="submit">创建资源</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/services/api'; // 你的 API 客户端

const route = useRoute();

// 表单数据
const form = ref({
  title: '',
  description: '',
  category: '',
  subject: '',
  grade: '',
  textbook: '',
  catalog_id: null, // 教材目录ID
  unit: '', // 单元名称
  unit_index: null, // 单元序号
  file: null, // 文件
  cover: null // 封面（可选）
});

// 教材目录列表
const catalogList = ref([]);

// 从 URL 查询参数读取 catalog_id
onMounted(() => {
  const catalogIdFromUrl = route.query.catalog_id;
  if (catalogIdFromUrl) {
    // 将字符串转换为数字
    form.value.catalog_id = parseInt(catalogIdFromUrl, 10);
    console.log('从 URL 读取 catalog_id:', form.value.catalog_id);
    
    // 加载教材目录信息（可选，用于显示）
    loadCatalogInfo(form.value.catalog_id);
  }
  
  // 加载教材目录列表（用于下拉选择）
  loadCatalogList();
});

// 加载教材目录信息
async function loadCatalogInfo(catalogId) {
  try {
    const response = await apiClient.get(`/api/catalogs/${catalogId}/info`);
    console.log('教材目录信息:', response.data);
    // 可以预填充表单字段
    if (response.data) {
      form.value.subject = response.data.subject || form.value.subject;
      form.value.grade = response.data.grade || form.value.grade;
      form.value.textbook = response.data.textbook_version || form.value.textbook;
    }
  } catch (error) {
    console.error('加载教材目录信息失败:', error);
  }
}

// 加载教材目录列表
async function loadCatalogList() {
  try {
    const response = await apiClient.get('/api/catalogs', {
      params: {
        page: 1,
        limit: 100
      }
    });
    catalogList.value = response.data.data || [];
  } catch (error) {
    console.error('加载教材目录列表失败:', error);
  }
}

// 提交表单
async function handleSubmit() {
  try {
    // 验证：如果绑定了 catalog，unit 必须填写
    if (form.value.catalog_id && !form.value.unit) {
      alert('已选择教材目录，必须填写单元名称');
      return;
    }
    
    // 创建 FormData（因为需要上传文件）
    const formData = new FormData();
    formData.append('title', form.value.title);
    formData.append('description', form.value.description || '');
    formData.append('category', form.value.category);
    formData.append('subject', form.value.subject || '');
    formData.append('grade', form.value.grade || '');
    formData.append('textbook', form.value.textbook || '');
    
    // 关键：将 catalog_id 包含在 FormData 中
    if (form.value.catalog_id) {
      formData.append('catalog_id', form.value.catalog_id);
      formData.append('unit', form.value.unit);
      if (form.value.unit_index) {
        formData.append('unit_index', form.value.unit_index);
      }
    }
    
    // 文件上传
    if (form.value.file) {
      formData.append('file', form.value.file);
    }
    if (form.value.cover) {
      formData.append('cover', form.value.cover);
    }
    
    // 发送 POST 请求
    const response = await apiClient.post('/api/resources', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('资源创建成功:', response.data);
    
    // 跳转到资源详情页或 catalog 页面
    if (form.value.catalog_id) {
      // 如果绑定了 catalog，跳转到 catalog 页面
      router.push(`/catalog/${form.value.catalog_id}`);
    } else {
      // 否则跳转到资源详情页
      router.push(`/resources/${response.data.id}`);
    }
  } catch (error) {
    console.error('创建资源失败:', error);
    alert('创建资源失败: ' + (error.response?.data?.message || error.message));
  }
}
</script>
```

### 3. 后端接口说明

**接口**: `POST /api/resources`

**请求格式**: `multipart/form-data`（因为需要上传文件）

**必填字段**:
- `title`: 资源标题
- `category`: 资源分类
- `file`: 资源文件

**可选字段（用于绑定教材目录）**:
- `catalog_id`: 教材目录ID（数字）
- `unit`: 单元名称（如果提供了 `catalog_id`，此字段必填）
- `unit_index`: 单元序号（可选，数字）

**请求示例**:
```javascript
const formData = new FormData();
formData.append('title', '数学六年级下册');
formData.append('category', '课件');
formData.append('subject', '数学');
formData.append('grade', '六年级下册');
formData.append('textbook', '人教版');
formData.append('catalog_id', '4310'); // 关键：从 URL 读取并包含在 FormData 中
formData.append('unit', '第一单元'); // 如果绑定了 catalog，必须填写
formData.append('unit_index', '1');
formData.append('file', fileInput.files[0]);

fetch('/api/resources', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // 注意：不要手动设置 Content-Type，浏览器会自动设置 multipart/form-data
  },
  body: formData
});
```

### 4. 后端处理逻辑

后端会自动：
1. 创建资源
2. 如果提供了 `catalog_id`，验证教材目录是否存在
3. 如果教材目录存在，自动绑定资源到该 catalog
4. 记录绑定日志（可在后端日志中查看）

**后端日志示例**:
```
✅ [创建资源] 已绑定资源 123 到教材目录 4310
  绑定结果: { affectedRows: 1, insertId: 456, changedRows: 0 }
  验证绑定: ✅ 成功
```

### 5. 注意事项

1. **URL 查询参数 vs POST body**:
   - `catalog_id` 在 URL 中（`?catalog_id=4310`）用于前端页面初始化
   - `catalog_id` 在 POST body 中用于后端处理
   - 前端需要从 URL 读取，并在提交时包含在 FormData 中

2. **单元字段必填**:
   - 如果提供了 `catalog_id`，`unit` 字段必须填写
   - 后端会验证：如果 `catalog_id` 存在但 `unit` 为空，会返回 400 错误

3. **资源状态**:
   - 新创建的资源默认状态为 `pending`（待审核）
   - 只有 `editor` 和 `admin` 角色可以自动审核（如果设置了 `AUTO_APPROVE_RESOURCES=true`）
   - 其他角色需要等待审核后才能显示

4. **绑定验证**:
   - 后端会验证 `catalog_id` 是否存在
   - 如果 `catalog_id` 不存在，会记录警告但不影响资源创建
   - 绑定失败不会影响资源创建，只会在日志中记录错误

### 6. 测试步骤

1. 访问 `http://localhost:8080/resources/create?catalog_id=4310`
2. 填写表单，确保：
   - 填写了 `unit` 字段（因为提供了 `catalog_id`）
   - 其他必填字段都已填写
3. 提交表单
4. 查看后端日志，确认绑定成功
5. 访问 `http://localhost:8080/catalog/4310`，确认资源已显示

### 7. 常见问题

**Q: 资源创建成功，但没有绑定到 catalog？**
- 检查后端日志，查看是否有绑定相关的错误
- 确认 `catalog_id` 是否正确包含在 POST body 中
- 确认 `unit` 字段是否已填写

**Q: 提示 "该资源已绑定教材，必须选择所属单元"？**
- 说明提供了 `catalog_id` 但 `unit` 为空
- 需要填写 `unit` 字段

**Q: 资源创建成功，但在 catalog 页面不显示？**
- 检查资源状态是否为 `approved`（可能需要审核）
- 检查资源格式是否为视频（视频资源会被排除）
- 查看后端查询日志，确认查询条件是否正确

