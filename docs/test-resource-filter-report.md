# 资源筛选字段测试报告

## 测试数据样例

### 1. resource 表基础字段（前20条）

| ID | subject | grade | textbook |
|----|---------|-------|----------|
| 25 | 道德与法治 | 三年级下册 | 人教版 |
| 26 | 数学 | 二年级下册 | 人教版 |
| 27 | 数学 | 二年级下册 | 人教版 |
| 29 | 数学 | 二年级下册 | 人教版 |
| 30 | 数学 | 二年级下册 | 人教版 |
| 31 | 数学 | 四年级下册 | 人教版 |
| 32 | 数学 | 三年级上册 | 人教版 |
| 33 | 数学 | 三年级下册 | 人教版 |
| 34 | 数学 | 三年级下册 | 人教版 |
| 35 | 语文 | 一年级下册 | NULL |
| 36 | 语文 | 二年级下册 | NULL |
| 37 | 数学 | 四年级上册 | 人教版 |
| 38 | 道德与法治 | 二年级下册 | 人教版 |
| 39 | 道德与法治 | 五年级下册 | 人教版 |
| 44 | 道德与法治 | 四年级下册 | 人教版 |
| 47 | 数学 | 三年级下册 | 人教版 |

**字段值格式：**
- `subject`: 中文格式（如：语文、数学、道德与法治）
- `grade`: 中文格式（如：三年级下册、二年级下册）
- `textbook`: 中文格式（如：人教版）或 NULL

### 2. catalog_info 数据（通过关联表查询）

**测试结果：前20条资源中，所有资源的 catalog_info 均为 NULL**

- 所有资源都没有绑定到 `textbook_catalog` 表
- `resource_textbook_map` 表中没有对应的关联记录
- **结论：catalog_info 在当前系统中不可用**

### 3. auto_meta_result 数据

**测试结果：系统中没有 auto_meta_result 数据**

- 查询结果：`COUNT(*) = 0`
- 所有资源的 `auto_meta_result` 字段为 NULL
- **结论：auto_meta_result 在当前系统中不可用**

### 4. 字段值格式对比

**resource.grade 的所有值：**
- "一年级下册"
- "三年级上册"
- "三年级下册"
- "二年级下册"
- "五年级下册"
- "四年级上册"
- "四年级下册"

**textbook_catalog.grade 的所有值：**
- "1"
- "2"
- "3"
- "4"
- "5"
- "6"
- "7"
- "8"
- "9"

**关键发现：**
- `resource.grade` 使用中文格式（如："三年级下册"）
- `textbook_catalog.grade` 使用数字格式（如："3"）
- **格式完全不统一，无法直接匹配**

## 筛选命中结果

### A. 按 catalog_info.subject = '语文'
- **命中资源ID：无**
- **原因：没有资源绑定到教材目录**

### B. 按 auto_meta_result.subject = '语文'
- **命中资源ID：无**
- **原因：auto_meta_result 数据为空**

### C. 按 resource.subject = '语文'
- **命中资源ID：35, 36**
- **结果：✓ 可以筛选出数据**

### D. 按 catalog_info.grade = '2'
- **命中资源ID：无**
- **原因：没有资源绑定到教材目录**

### E. 按 auto_meta_result.grade = '二年级'
- **命中资源ID：无**
- **原因：auto_meta_result 数据为空**

### F. 按 resource.grade LIKE '%二年级%'
- **命中资源ID：26, 27, 29, 30, 36, 38**
- **结果：✓ 可以筛选出数据**

### G. 按 catalog_info.volume = '上册'
- **命中资源ID：无**
- **原因：没有资源绑定到教材目录**

### H. 按 auto_meta_result.volume = '上册'
- **命中资源ID：无**
- **原因：auto_meta_result 数据为空**

### 组合筛选测试

**测试：subject=语文, grade=二年级, volume=上册**
- **命中资源ID：无**
- **原因：没有同时满足这三个条件的资源**

**测试：subject=数学, grade=三年级, volume=下册**
- **命中资源ID：33, 34**
- **结果：✓ 可以筛选出数据**

## 问题定位结论

### 1️⃣ 当前系统「真正可用于筛选的字段是哪一个？」

**答案：resource 原始字段（resource.subject, resource.grade, resource.textbook）**

**原因：**
- `catalog_info`：所有资源都没有绑定到教材目录，数据为 NULL
- `auto_meta_result`：系统中没有该字段的数据（COUNT = 0）
- `resource` 原始字段：有实际数据，且可以筛选出结果

### 2️⃣ 哪些字段【值不统一】导致筛选必然失败？

**答案：**

1. **grade 字段格式不统一：**
   - `resource.grade`：中文格式（"三年级下册"）
   - `textbook_catalog.grade`：数字格式（"3"）
   - **无法直接匹配**

2. **volume 字段位置不同：**
   - `resource.grade`：包含册别信息（"三年级下册"中的"下册"）
   - `textbook_catalog.volume`：独立字段（"上册"、"下册"）
   - **需要从 grade 字段中提取册别信息**

3. **textbook_version 字段名不同：**
   - `resource.textbook`：字段名
   - `textbook_catalog.textbook_version`：字段名
   - **字段名不一致，但值格式相同（都是中文）**

### 3️⃣ 如果现在前端传：?subject=语文&grade=二年级&volume=上册

**后端是否【一定能查到数据】？为什么？**

**答案：不一定能查到数据**

**原因：**

1. **当前筛选逻辑（resource.middleware.ts）：**
   ```typescript
   // 按学科过滤
   if (subject) {
     sql += ' AND resource.subject = ?';  // ✓ 可以工作
   }
   
   // 按年级过滤
   if (grade) {
     sql += ' AND resource.grade LIKE ?';  // ✓ 可以工作（如：%二年级%）
   }
   
   // 按册次过滤
   if (volume) {
     sql += ' AND resource.grade LIKE ?';  // ✓ 可以工作（如：%上册%）
   }
   ```

2. **筛选逻辑分析：**
   - `subject=语文`：可以筛选出资源 35, 36
   - `grade=二年级`：可以筛选出资源 26, 27, 29, 30, 36, 38
   - `volume=上册`：当前没有"二年级上册"的资源，所以组合筛选结果为"无"

3. **能否查到数据取决于：**
   - 数据库中是否存在同时满足这三个条件的资源
   - 当前测试：没有"语文 + 二年级 + 上册"的资源，所以查不到
   - 但如果存在"数学 + 三年级 + 下册"的资源，可以查到（测试结果：33, 34）

## 是否支持当前前端筛选（是 / 否 + 原因）

### 答案：**部分支持**

### 支持的情况：

1. **subject（学科）筛选：✓ 支持**
   - 使用 `resource.subject` 字段
   - 值格式统一（中文）
   - 可以筛选出数据

2. **grade（年级）筛选：✓ 支持**
   - 使用 `resource.grade LIKE '%年级%'` 模式
   - 可以筛选出数据

3. **textbook_version（教材版本）筛选：✓ 支持**
   - 使用 `resource.textbook` 字段
   - 值格式统一（中文）
   - 可以筛选出数据

### 不支持的情况：

1. **volume（册别）筛选：⚠️ 部分支持**
   - 当前逻辑：使用 `resource.grade LIKE '%上册%'` 或 `'%下册%'`
   - **问题：** 如果 grade 字段是"三年级下册"，可以匹配"下册"
   - **问题：** 如果 grade 字段是"三年级上册"，可以匹配"上册"
   - **但：** 如果前端传 `volume=上册`，但资源 grade 是"三年级下册"，则无法匹配
   - **结论：** 逻辑上可以工作，但需要确保 grade 字段包含册别信息

2. **catalog_info 相关筛选：✗ 不支持**
   - 原因：没有资源绑定到教材目录
   - catalog_info 数据全部为 NULL

3. **auto_meta_result 相关筛选：✗ 不支持**
   - 原因：系统中没有 auto_meta_result 数据
   - 所有资源的 auto_meta_result 为 NULL

### 总结：

**当前系统只支持基于 `resource` 表原始字段的筛选：**
- ✓ subject（学科）
- ✓ grade（年级，使用 LIKE 模式）
- ✓ textbook（教材版本）
- ⚠️ volume（册别，从 grade 字段中提取，使用 LIKE 模式）

**不支持基于 `catalog_info` 或 `auto_meta_result` 的筛选，因为：**
- catalog_info：没有数据（资源未绑定教材目录）
- auto_meta_result：没有数据（AI识别结果为空）

