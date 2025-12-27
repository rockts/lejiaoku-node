/**
 * 删除 textbook_catalog_backup_utf8fix 备份表
 * 
 * 此表是 textbook_catalog 表的备份表，用于修复 UTF-8 编码问题
 * 备份已完成，数据已迁移到 textbook_catalog 表，可以安全删除
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

async function dropBackupTable() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功');

    // 1. 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'textbook_catalog_backup_utf8fix'"
    );

    if (tables.length === 0) {
      console.log('ℹ️  表 textbook_catalog_backup_utf8fix 不存在，无需删除');
      return;
    }

    // 2. 显示表信息
    const [count] = await connection.query(
      'SELECT COUNT(*) as cnt FROM textbook_catalog_backup_utf8fix'
    );
    console.log(`\n📊 表信息：`);
    console.log(`  表名: textbook_catalog_backup_utf8fix`);
    console.log(`  记录数: ${count[0].cnt}`);

    // 3. 确认 textbook_catalog 表数据正常
    const [catalogCount] = await connection.query(
      'SELECT COUNT(*) as cnt FROM textbook_catalog'
    );
    console.log(`\n📊 textbook_catalog 表记录数: ${catalogCount[0].cnt}`);

    // 4. 删除表
    console.log('\n🗑️  开始删除备份表...');
    await connection.query('DROP TABLE IF EXISTS textbook_catalog_backup_utf8fix');
    console.log('✅ 备份表已成功删除');

    // 5. 验证删除
    const [verifyTables] = await connection.query(
      "SHOW TABLES LIKE 'textbook_catalog_backup_utf8fix'"
    );
    if (verifyTables.length === 0) {
      console.log('✅ 验证：表已成功删除');
    } else {
      console.warn('⚠️  警告：表仍然存在，删除可能失败');
    }

  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    if (error.code === 'ER_BAD_TABLE_ERROR') {
      console.log('ℹ️  表不存在，无需删除');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

dropBackupTable();

