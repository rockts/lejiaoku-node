# 前端对接示例

## 一、接口调用示例

### 1.1 获取资源列表

```typescript
// TypeScript 示例
interface ResourceListItem {
  id: number;
  title: string;
  category: string;
  file_url: string;
  file_format: string;
  description?: string;
  subject?: string;
  grade?: string | number;
  textbook?: string;
  chapter_info?: string;
  cover_url?: string;
  download_count: number;
  auto_meta_status?: 'pending' | 'done' | 'failed';
  auto_meta_result?: {
    education_level?: string;
    subject?: string;
    grade?: string;
    volume?: string;
    textbook_version?: string;
    structure?: Array<{
      unit?: string;
      title?: string;
    }>;
  };
  catalog_info?: {
    education_level: string;
    grade: string;
    subject: string;
    textbook_version: string;
    volume: string;
  };
  created_at: string;
  updated_at: string;
}

// 调用示例
async function getResourceList(page = 1, limit = 30) {
  const response = await fetch(`/api/resources?limit=${limit}&offset=${(page - 1) * limit}`);
  const resources: ResourceListItem[] = await response.json();
  return resources;
}
```

### 1.2 获取资源详情

```typescript
// TypeScript 示例
interface ResourceDetail extends ResourceListItem {
  // 详情接口字段与列表接口一致
}

// 调用示例
async function getResourceDetail(id: number) {
  const response = await fetch(`/api/resources/${id}`);
  const resource: ResourceDetail = await response.json();
  return resource;
}
```

---

## 二、教材信息获取（优先级处理）

### 2.1 获取教材信息的辅助函数

```typescript
/**
 * 获取资源的教材信息（按优先级）
 * 优先级：catalog_info > auto_meta_result > resource 直接字段
 */
function getTextbookInfo(resource: ResourceListItem | ResourceDetail) {
  // 优先级 1: catalog_info（权威数据）
  if (resource.catalog_info) {
    return {
      educationLevel: resource.catalog_info.education_level,
      grade: resource.catalog_info.grade,
      subject: resource.catalog_info.subject,
      textbookVersion: resource.catalog_info.textbook_version,
      volume: resource.catalog_info.volume,
      source: 'catalog_info',
      isAuthoritative: true,
    };
  }

  // 优先级 2: auto_meta_result（辅助数据）
  if (resource.auto_meta_result) {
    return {
      educationLevel: resource.auto_meta_result.education_level,
      grade: resource.auto_meta_result.grade,
      subject: resource.auto_meta_result.subject,
      textbookVersion: resource.auto_meta_result.textbook_version,
      volume: resource.auto_meta_result.volume,
      structure: resource.auto_meta_result.structure,
      source: 'auto_meta_result',
      isAuthoritative: false,
    };
  }

  // 优先级 3: resource 直接字段（兜底数据）
  return {
    grade: resource.grade,
    subject: resource.subject,
    textbookVersion: resource.textbook,
    source: 'resource_fields',
    isAuthoritative: false,
  };
}
```

### 2.2 字段级兜底（推荐）

```typescript
/**
 * 字段级兜底，确保每个字段都有值
 */
function getCompleteTextbookInfo(resource: ResourceListItem | ResourceDetail) {
  return {
    educationLevel: resource.catalog_info?.education_level 
                 || resource.auto_meta_result?.education_level 
                 || null,
    
    grade: resource.catalog_info?.grade 
        || resource.auto_meta_result?.grade 
        || resource.grade 
        || null,
    
    subject: resource.catalog_info?.subject 
          || resource.auto_meta_result?.subject 
          || resource.subject 
          || null,
    
    textbookVersion: resource.catalog_info?.textbook_version 
                  || resource.auto_meta_result?.textbook_version 
                  || resource.textbook 
                  || null,
    
    volume: resource.catalog_info?.volume 
         || resource.auto_meta_result?.volume 
         || null,
    
    structure: resource.auto_meta_result?.structure || null,
    
    source: resource.catalog_info ? 'catalog_info' 
         : (resource.auto_meta_result ? 'auto_meta_result' : 'resource_fields'),
  };
}
```

---

## 三、UI 展示示例

### 3.1 资源卡片组件

```typescript
// React 示例
function ResourceCard({ resource }: { resource: ResourceListItem }) {
  const textbookInfo = getTextbookInfo(resource);
  
  return (
    <div className="resource-card">
      <h3>{resource.title}</h3>
      
      {/* 教材信息展示 */}
      {textbookInfo.subject && (
        <div className="textbook-info">
          <span className="badge badge-{textbookInfo.source}">
            {textbookInfo.source === 'catalog_info' ? '已关联教材' : 
             textbookInfo.source === 'auto_meta_result' ? 'AI 识别' : 
             '基础信息'}
          </span>
          <span>{textbookInfo.grade}年级 {textbookInfo.subject}</span>
          {textbookInfo.textbookVersion && (
            <span>{textbookInfo.textbookVersion}</span>
          )}
        </div>
      )}
      
      {/* 章节结构展示 */}
      {textbookInfo.structure && (
        <div className="structure">
          {textbookInfo.structure.map((item, index) => (
            <div key={index}>
              {item.unit} - {item.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.2 资源详情页组件

```typescript
// React 示例
function ResourceDetailPage({ resourceId }: { resourceId: number }) {
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  
  useEffect(() => {
    getResourceDetail(resourceId).then(setResource);
  }, [resourceId]);
  
  if (!resource) return <div>加载中...</div>;
  
  const textbookInfo = getCompleteTextbookInfo(resource);
  
  return (
    <div className="resource-detail">
      <h1>{resource.title}</h1>
      
      {/* 教材信息 */}
      <section className="textbook-section">
        <h2>教材信息</h2>
        <div className="info-grid">
          <div>
            <label>学段：</label>
            <span>{textbookInfo.educationLevel || '未设置'}</span>
          </div>
          <div>
            <label>年级：</label>
            <span>{textbookInfo.grade || '未设置'}</span>
          </div>
          <div>
            <label>学科：</label>
            <span>{textbookInfo.subject || '未设置'}</span>
          </div>
          <div>
            <label>版本：</label>
            <span>{textbookInfo.textbookVersion || '未设置'}</span>
          </div>
          <div>
            <label>册次：</label>
            <span>{textbookInfo.volume || '未设置'}</span>
          </div>
        </div>
        
        {/* 数据来源标识 */}
        <div className="source-badge">
          {textbookInfo.source === 'catalog_info' && (
            <span className="badge-success">已关联教材（权威数据）</span>
          )}
          {textbookInfo.source === 'auto_meta_result' && (
            <span className="badge-info">AI 识别（辅助数据）</span>
          )}
          {textbookInfo.source === 'resource_fields' && (
            <span className="badge-default">基础信息</span>
          )}
        </div>
      </section>
      
      {/* 章节结构 */}
      {textbookInfo.structure && (
        <section className="structure-section">
          <h2>章节结构</h2>
          <ul>
            {textbookInfo.structure.map((item, index) => (
              <li key={index}>
                {item.unit} - {item.title}
              </li>
            ))}
          </ul>
        </section>
      )}
      
      {/* 非结构化章节信息（兜底） */}
      {resource.chapter_info && !textbookInfo.structure && (
        <section className="chapter-info">
          <h2>章节信息</h2>
          <p>{resource.chapter_info}</p>
        </section>
      )}
    </div>
  );
}
```

---

## 四、cURL 测试命令

### 4.1 列表接口测试

```bash
# 获取资源列表（前5条）
curl -s "http://localhost:3333/api/resources?limit=5" | python3 -m json.tool

# 检查 catalog_info
curl -s "http://localhost:3333/api/resources?limit=5" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); \
  print('有 catalog_info 的资源:', sum(1 for r in data if r.get('catalog_info')))"
```

### 4.2 详情接口测试

```bash
# 获取资源详情
curl -s "http://localhost:3333/api/resources/3" | python3 -m json.tool

# 检查 catalog_info 和 auto_meta_result
curl -s "http://localhost:3333/api/resources/3" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); \
  print('catalog_info:', '存在' if d.get('catalog_info') else '不存在'); \
  print('auto_meta_result:', '存在' if d.get('auto_meta_result') else '不存在')"
```

---

## 五、错误处理示例

```typescript
// 错误处理示例
async function getResourceDetailSafe(id: number) {
  try {
    const response = await fetch(`/api/resources/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('资源不存在');
      }
      throw new Error(`请求失败: ${response.status}`);
    }
    
    const resource: ResourceDetail = await response.json();
    
    // 验证必填字段
    if (!resource.id || !resource.title || !resource.category) {
      throw new Error('资源数据不完整');
    }
    
    return resource;
  } catch (error) {
    console.error('获取资源详情失败:', error);
    throw error;
  }
}
```

---

## 六、性能优化建议

### 6.1 列表接口优化

如果资源数量很大，建议：

1. **分页加载**：使用 `limit` 和 `offset` 参数
2. **虚拟滚动**：前端使用虚拟滚动处理大量数据
3. **缓存 catalog_info**：如果数据变化不频繁，可以缓存

### 6.2 详情接口优化

1. **按需加载**：只在需要时获取详情
2. **缓存策略**：使用浏览器缓存或内存缓存

---

**文档版本**: v1.0  
**更新日期**: 2024-12-24

