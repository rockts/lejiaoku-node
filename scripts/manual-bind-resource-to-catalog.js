/**
 * 手动绑定资源到教材目录
 * 用于修复绑定失败的问题
 * 
 * 使用方法：
 * node scripts/manual-bind-resource-to-catalog.js <resource_id> <catalog_id>
 * 
 * 例如：
 * node scripts/manual-bind-resource-to-catalog.js 123 4310
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const mysql = require('mysql2/promise');

const connectionConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ravent',
  charset: 'utf8mb4'
};

async function manualBind(resourceId, catalogId) {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功\n');

    const resourceIdNum = parseInt(resourceId, 10);
    const catalogIdNum = parseInt(catalogId, 10);

    if (isNaN(resourceIdNum) || isNaN(catalogIdNum)) {
      console.error('❌ 参数错误：resource_id 和 catalog_id 必须是数字');
      console.log('使用方法: node scripts/manual-bind-resource-to-catalog.js <resource_id> <catalog_id>');
      return;
    }

    console.log(`🔍 开始绑定资源 ${resourceIdNum} 到教材目录 ${catalogIdNum}...\n`);

    // 1. 检查资源是否存在
    console.log('1️⃣ 检查资源是否存在...');
    const [resources] = await connection.query(
      'SELECT id, title, status, unit FROM resource WHERE id = ?',
      [resourceIdNum]
    );

    if (resources.length === 0) {
      console.error(`❌ 资源 ${resourceIdNum} 不存在！`);
      return;
    }

    const resource = resources[0];
    console.log(`✅ 资源存在:`);
    console.log(`   - ID: ${resource.id}`);
    console.log(`   - 标题: ${resource.title}`);
    console.log(`   - 状态: ${resource.status}`);
    console.log(`   - 单元: ${resource.unit || '(空)'}\n`);

    // 2. 检查教材目录是否存在
    console.log('2️⃣ 检查教材目录是否存在...');
    const [catalogs] = await connection.query(
      'SELECT id, education_level, subject, grade, textbook_version, volume FROM textbook_catalog WHERE id = ?',
      [catalogIdNum]
    );

    if (catalogs.length === 0) {
      console.error(`❌ 教材目录 ${catalogIdNum} 不存在！`);
      return;
    }

    const catalog = catalogs[0];
    console.log(`✅ 教材目录存在:`);
    console.log(`   - ID: ${catalog.id}`);
    console.log(`   - 学段: ${catalog.education_level}`);
    console.log(`   - 学科: ${catalog.subject}`);
    console.log(`   - 年级: ${catalog.grade}`);
    console.log(`   - 版本: ${catalog.textbook_version}`);
    console.log(`   - 册别: ${catalog.volume}\n`);

    // 3. 检查是否已经绑定
    console.log('3️⃣ 检查是否已经绑定...');
    const [existingBindings] = await connection.query(
      'SELECT * FROM resource_textbook_map WHERE resource_id = ? AND textbook_catalog_id = ?',
      [resourceIdNum, catalogIdNum]
    );

    if (existingBindings.length > 0) {
      console.log(`⚠️  资源已经绑定到该 catalog:`);
      console.log(`   - 绑定来源: ${existingBindings[0].source}`);
      console.log(`   - 创建时间: ${existingBindings[0].created_at}`);
      console.log(`\n✅ 绑定已存在，无需重复绑定`);
      return;
    }

    // 4. 执行绑定
    console.log('4️⃣ 执行绑定...');
    try {
      const [bindResult] = await connection.query(`
        INSERT INTO resource_textbook_map (resource_id, textbook_catalog_id, source)
        VALUES (?, ?, 'manual')
        ON DUPLICATE KEY UPDATE 
          textbook_catalog_id = VALUES(textbook_catalog_id),
          source = 'manual'
      `, [resourceIdNum, catalogIdNum]);

      console.log(`✅ 绑定成功！`);
      console.log(`   - 影响行数: ${bindResult.affectedRows}`);
      console.log(`   - 插入ID: ${bindResult.insertId}\n`);

      // 5. 验证绑定
      console.log('5️⃣ 验证绑定...');
      const [verify] = await connection.query(
        'SELECT * FROM resource_textbook_map WHERE resource_id = ? AND textbook_catalog_id = ?',
        [resourceIdNum, catalogIdNum]
      );

      if (verify.length > 0) {
        console.log(`✅ 验证成功：绑定记录已存在`);
        console.log(`   - 资源ID: ${verify[0].resource_id}`);
        console.log(`   - Catalog ID: ${verify[0].textbook_catalog_id}`);
        console.log(`   - 来源: ${verify[0].source}`);
        console.log(`   - 创建时间: ${verify[0].created_at}`);
      } else {
        console.error(`❌ 验证失败：绑定记录不存在！`);
      }

    } catch (bindError) {
      console.error(`❌ 绑定失败:`, bindError.message);
      console.error(`   错误代码:`, bindError.code);
      if (bindError.sql) {
        console.error(`   SQL:`, bindError.sql);
      }
    }

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 从命令行参数获取 resource_id 和 catalog_id
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('使用方法: node scripts/manual-bind-resource-to-catalog.js <resource_id> <catalog_id>');
  console.log('例如: node scripts/manual-bind-resource-to-catalog.js 123 4310');
  process.exit(1);
}

const [resourceId, catalogId] = args;
manualBind(resourceId, catalogId);

