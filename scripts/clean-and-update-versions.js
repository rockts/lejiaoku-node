/**
 * 清理并更新版本列表
 * 
 * 最终版本列表（12个）：
 * 1. 部编版
 * 2. 人教版
 * 3. 北师大版
 * 4. 苏教版
 * 5. 外研版
 * 6. 教科版
 * 7. 冀教版
 * 8. 美术出版社
 * 9. 陕旅版
 * 10. 上教版
 * 11. 湘教版
 * 12. 粤教版
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

// 最终保留的版本列表（12个）
const RETAINED_VERSIONS = [
  '部编版',
  '人教版',
  '北师大版',
  '苏教版',
  '外研版',
  '教科版',
  '冀教版',
  '美术出版社',
  '陕旅版',
  '上教版',
  '湘教版',
  '粤教版'
];

async function cleanAndUpdateVersions() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔍 开始清理并更新版本列表...\n');

    // 1. 统计当前数据
    const [currentVersions] = await connection.query(
      'SELECT textbook_version, COUNT(*) as count FROM textbook_catalog GROUP BY textbook_version ORDER BY textbook_version'
    );
    
    console.log('📊 当前版本统计：');
    currentVersions.forEach(v => {
      const isRetained = RETAINED_VERSIONS.includes(v.textbook_version);
      console.log(`  ${isRetained ? '✅' : '❌'} ${v.textbook_version}: ${v.count} 条`);
    });

    // 2. 删除不在保留列表中的版本
    console.log('\n🗑️  删除不需要的版本...');
    const [allVersions] = await connection.query('SELECT DISTINCT textbook_version FROM textbook_catalog');
    const versionsToDelete = allVersions
      .map(v => v.textbook_version)
      .filter(v => !RETAINED_VERSIONS.includes(v));

    let totalDeleted = 0;
    for (const version of versionsToDelete) {
      const [result] = await connection.query(
        'DELETE FROM textbook_catalog WHERE textbook_version = ?',
        [version]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅ 删除版本 ${version}: ${result.affectedRows} 条`);
        totalDeleted += result.affectedRows;
      }
    }

    // 3. 统计清理后的数据
    const [finalVersions] = await connection.query(
      'SELECT textbook_version, COUNT(*) as count FROM textbook_catalog GROUP BY textbook_version ORDER BY textbook_version'
    );
    
    console.log('\n📊 清理后版本统计：');
    finalVersions.forEach(v => {
      console.log(`  ✅ ${v.textbook_version}: ${v.count} 条`);
    });

    const [totalCount] = await connection.query('SELECT COUNT(*) as count FROM textbook_catalog');
    console.log(`\n总计: ${totalCount[0].count} 条记录`);

    console.log(`\n✅ 清理完成！删除了 ${totalDeleted} 条记录`);
    console.log('\n📚 保留的版本（12个）：');
    RETAINED_VERSIONS.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

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
cleanAndUpdateVersions()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    console.log('\n⚠️  下一步：需要更新生成脚本，然后重新生成数据');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

