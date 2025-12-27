/**
 * 清理学科和版本脚本
 * 
 * 功能：
 * 1. 删除"体育与健康"学科的所有数据
 * 2. 删除其他学科中的"美术出版社"版本（只保留美术和书法练习指导中的美术出版社）
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

async function cleanSubjectAndVersion() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔍 开始清理学科和版本...\n');

    // 1. 删除"体育与健康"学科
    console.log('🗑️  删除"体育与健康"学科...');
    const [deleteSport] = await connection.query(
      'DELETE FROM textbook_catalog WHERE subject = ?',
      ['体育与健康']
    );
    console.log(`  ✅ 删除了 ${deleteSport.affectedRows} 条"体育与健康"记录\n`);

    // 2. 删除其他学科中的"美术出版社"版本（只保留美术和书法练习指导）
    console.log('🗑️  删除其他学科中的"美术出版社"版本...');
    const [deleteArtPublisher] = await connection.query(
      'DELETE FROM textbook_catalog WHERE textbook_version = ? AND subject NOT IN (?, ?)',
      ['美术出版社', '美术', '书法练习指导']
    );
    console.log(`  ✅ 删除了 ${deleteArtPublisher.affectedRows} 条其他学科的"美术出版社"记录\n`);

    // 3. 统计清理后的数据
    const [totalCount] = await connection.query('SELECT COUNT(*) as count FROM textbook_catalog');
    console.log(`📊 清理后总记录数: ${totalCount[0].count} 条\n`);

    // 4. 统计各学科数据
    const [subjects] = await connection.query(
      'SELECT subject, COUNT(*) as count FROM textbook_catalog GROUP BY subject ORDER BY subject'
    );
    console.log('📊 各学科统计：');
    subjects.forEach(s => console.log(`  - ${s.subject}: ${s.count} 条`));

    // 5. 统计"美术出版社"版本的使用情况
    const [artPublisher] = await connection.query(
      'SELECT subject, COUNT(*) as count FROM textbook_catalog WHERE textbook_version = ? GROUP BY subject',
      ['美术出版社']
    );
    console.log('\n📊 "美术出版社"版本使用情况：');
    if (artPublisher.length > 0) {
      artPublisher.forEach(a => console.log(`  - ${a.subject}: ${a.count} 条`));
    } else {
      console.log('  - 无数据');
    }

    console.log('\n✅ 清理完成！');

  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行清理
cleanSubjectAndVersion()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

