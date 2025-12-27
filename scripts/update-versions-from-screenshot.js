/**
 * 根据截图更新版本列表
 * 
 * 截图中的版本（排除"地方教材"和"其他"）：
 * 1. 北师大版
 * 2. 冀版教材
 * 3. 教科版
 * 4. 美术出版社
 * 5. 人教版
 * 6. 陕旅版
 * 7. 上教版
 * 8. 苏教版
 * 9. 湘版教材
 * 10. 粤教版教材
 * 
 * 用户明确要求的：
 * - 部编版
 * - 人教版
 * - 北师大版
 * - 苏教版
 * - 外研版
 * - 教科版
 * 
 * 合并后的完整版本列表（去重）：
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

// 截图中的版本（排除"地方教材"和"其他"）
const SCREENSHOT_VERSIONS = [
  '北师大版',
  '冀版教材',      // 或可能是"冀教版"
  '教科版',
  '美术出版社',
  '人教版',
  '陕旅版',
  '上教版',
  '苏教版',
  '湘版教材',      // 或可能是"湘教版"
  '粤教版教材'     // 或可能是"粤教版"
];

// 用户明确要求的版本
const USER_REQUIRED_VERSIONS = [
  '部编版',
  '人教版',
  '北师大版',
  '苏教版',
  '外研版',
  '教科版'
];

// 合并去重后的完整版本列表
const ALL_VERSIONS = [...new Set([...USER_REQUIRED_VERSIONS, ...SCREENSHOT_VERSIONS])];

async function checkCurrentVersions() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔍 检查当前数据库中的版本...\n');

    const [currentVersions] = await connection.query(
      'SELECT DISTINCT textbook_version FROM textbook_catalog ORDER BY textbook_version'
    );
    
    const dbVersions = currentVersions.map(v => v.textbook_version);
    
    console.log('📊 当前数据库中的版本：');
    dbVersions.forEach(v => console.log(`  - ${v}`));
    console.log(`\n共 ${dbVersions.length} 个版本\n`);

    console.log('📋 截图中的版本（排除"地方教材"和"其他"）：');
    SCREENSHOT_VERSIONS.forEach(v => console.log(`  - ${v}`));
    console.log(`\n共 ${SCREENSHOT_VERSIONS.length} 个版本\n`);

    console.log('📋 用户明确要求的版本：');
    USER_REQUIRED_VERSIONS.forEach(v => console.log(`  - ${v}`));
    console.log(`\n共 ${USER_REQUIRED_VERSIONS.length} 个版本\n`);

    console.log('📋 合并后的完整版本列表（去重）：');
    ALL_VERSIONS.forEach(v => console.log(`  - ${v}`));
    console.log(`\n共 ${ALL_VERSIONS.length} 个版本\n`);

    console.log('⚠️  注意：');
    console.log('  - "冀版教材" 可能是 "冀教版"');
    console.log('  - "湘版教材" 可能是 "湘教版"');
    console.log('  - "粤教版教材" 可能是 "粤教版"');
    console.log('  - 需要确认这些版本名称在数据库中的实际名称');

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行检查
checkCurrentVersions()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

