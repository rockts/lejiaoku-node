/**
 * 重新生成教材目录数据脚本
 * 
 * 功能：
 * 1. 清空现有数据（可选）
 * 2. 按照新的规则重新生成所有教材目录
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

async function regenerateCatalog() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔄 开始重新生成教材目录数据...\n');

    // 1. 清空现有数据
    console.log('🗑️  清空现有数据...');
    const [deleteResult] = await connection.query('DELETE FROM textbook_catalog');
    console.log(`   ✅ 已删除 ${deleteResult.affectedRows} 条记录\n`);

    // 2. 运行生成脚本
    console.log('📝 重新生成数据...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('node scripts/generate-textbook-catalog-skeleton.js');
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }

    // 3. 验证结果
    const [finalCount] = await connection.query('SELECT COUNT(*) as count FROM textbook_catalog');
    console.log(`\n📊 最终数据总数: ${finalCount[0].count} 条`);

    // 4. 按学科统计
    const [stats] = await connection.query(`
      SELECT 
        education_level,
        subject,
        textbook_version,
        COUNT(*) as count
      FROM textbook_catalog
      GROUP BY education_level, subject, textbook_version
      ORDER BY education_level, subject, textbook_version
    `);
    
    console.log('\n📋 数据统计：');
    let currentLevel = '';
    let currentSubject = '';
    stats.forEach(stat => {
      const level = stat.education_level === 'elementary' ? '小学' : '初中';
      if (level !== currentLevel) {
        console.log(`\n${level}:`);
        currentLevel = level;
        currentSubject = '';
      }
      if (stat.subject !== currentSubject) {
        console.log(`  ${stat.subject}:`);
        currentSubject = stat.subject;
      }
      console.log(`    - ${stat.textbook_version}: ${stat.count} 条`);
    });

    console.log('\n✅ 重新生成完成！');

  } catch (error) {
    console.error('❌ 重新生成失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行重新生成
regenerateCatalog()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

