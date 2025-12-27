# 后端开发规则（backend-rules-for-agent.md）

> 本文档适用于：lejiaoku-node 仓库  
> 所有 Agent 在编写或修改后端代码前，必须完整阅读并严格遵守。

---

## 一、技术栈与边界

- 运行环境：Node.js
- Web 框架：Express
- 数据库：MySQL
- 架构模式：单体应用
- 不引入微服务
- 不引入未经说明的新框架或中间件

---

## 二、总体架构规则

1. 使用模块化结构按业务拆分
2. 每个业务模块必须遵循三层结构：
   - Route（路由层）
   - Controller（控制层）
   - Service（业务层）
3. 各层职责必须严格区分，不得混用

---

## 三、目录结构规范（必须遵守）

```text
src/
├── modules/
│   └── {module_name}/
│       ├── {module_name}.route.js
│       ├── {module_name}.controller.js
│       └── {module_name}.service.js
├── common/
│   ├── db/              # 数据库连接与配置
│   ├── middleware/      # 通用中间件
│   └── utils/           # 工具函数
└── app.js
```

## 四、分层职责说明
### 1. Route（路由层）
* 只负责：  
  * 路由定义
  * 中间件挂载

* 不允许：
  * 编写业务逻辑
  * 直接操作数据库

### 2. Controller（控制层）
* 只负责：
  * 接收请求参数
  * 参数校验
  * 调用 service
  * 返回 HTTP 响应

* 不允许：
  * 编写复杂业务逻辑
  * 直接操作数据库
  * 直接拼装 SQL

### 3. Service（业务层）
* 负责：
  * 核心业务逻辑
  * 数据库读写
  * 业务规则判断

* 不允许：
  * 使用 req / res
  * 返回 HTTP Response
  * 操作 Express 对象

## 五、数据库设计规则
1. 数据库类型：MySQL
2. 表名、字段名统一使用 snake_case
3. 所有字段必须具备明确业务含义
4. 禁止隐式字段或“临时字段”
5. 不允许动态创建或修改表结构
6. 数据库变更必须可追溯（通过 SQL 文件或迁移）

## 六、API 设计规则
1. 采用 REST 风格
2. 使用明确的 HTTP 方法：
  * GET：查询
  * POST：创建
  * PUT / PATCH：更新
  * DELETE：删除

3. API 返回格式统一：
    ```json
    复制代码
    {
      "code": "SUCCESS",
      "data": {},
      "message": ""
    }
    ```

4. 错误返回示例：
    ```json
    复制代码
    {
      "code": "INVALID_PARAM",
      "message": "参数不合法"
    }
    ```
## 七、安全与质量底线（必须遵守）
* 禁止 SQL 字符串拼接
* 禁止在 controller 中直接访问数据库
* 禁止在 service 中返回 HTTP 响应
* 禁止在业务代码中随意使用 console.log
* 禁止忽略异常或吞掉错误

## 八、代码风格要求
* 函数职责单一
* 文件内容清晰可读
* 不写“魔法值”，需定义常量
* 变量、函数命名必须体现业务含义

## 九、Agent 行为约束（非常重要）
* 不擅自新增业务字段
* 不修改已有业务语义
* 不假设“后续会重构”
* 所有实现必须可运行、可落库

# 十、优先级说明
当本规则与其他说明冲突时，优先级如下：
1. blueprint-for-agent.md
2. backend-rules-for-agent.md
3. 代码实现
