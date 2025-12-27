/**
 * 检查 xiaole 用户信息
 */
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT, 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

async function checkXiaoleUser() {
  try {
    // 查询 xiaole 用户信息
    const [users] = await connection.promise().query(
      `SELECT 
        u.id, 
        u.name, 
        u.username, 
        u.avatar_url,
        (SELECT COUNT(*) FROM avatar WHERE userId = u.id) as avatar_count,
        (SELECT filename FROM avatar WHERE userId = u.id ORDER BY id DESC LIMIT 1) as avatar_filename
      FROM user u 
      WHERE u.username = 'xiaole' OR u.name = 'xiaole' 
      LIMIT 1`
    );

    if (users.length === 0) {
      console.log('❌ 未找到 xiaole 用户');
      return;
    }

    const user = users[0];
    console.log('✅ 找到 xiaole 用户:');
    console.log(JSON.stringify(user, null, 2));

    // 检查头像表
    if (user.avatar_count > 0) {
      console.log(`\n✅ xiaole 用户在 avatar 表中有 ${user.avatar_count} 条记录`);
      console.log(`   最新头像文件名: ${user.avatar_filename}`);
      console.log(`   头像 URL 应该是: /api/users/${user.id}/avatar`);
    } else {
      console.log('\n⚠️  xiaole 用户在 avatar 表中没有记录');
      console.log('   所以即使 user.avatar_url 为空，系统也无法自动生成头像 URL');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    connection.end();
  }
}

checkXiaoleUser();

