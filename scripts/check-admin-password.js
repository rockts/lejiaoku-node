/**
 * 检查管理员账号密码
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function checkPassword() {
  let connection;
  
  try {
    console.log('🔍 检查管理员账号密码...\n');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ravent',
    });
    
    // 查询 admin 用户
    const [users] = await connection.query(
      'SELECT id, name, email, password, role FROM user WHERE name = ? OR email LIKE ?',
      ['admin', '%admin%']
    );
    
    if (users.length === 0) {
      console.log('❌ 没有找到管理员账号');
      return;
    }
    
    console.log(`📊 找到 ${users.length} 个相关账号：\n`);
    
    for (const user of users) {
      console.log(`用户: ${user.name} (${user.email})`);
      console.log(`角色: ${user.role || 'user'}`);
      console.log(`密码哈希: ${user.password.substring(0, 30)}...`);
      
      // 测试几个常见密码
      const testPasswords = [
        'admin123456',
        'admin',
        '123456',
        'admin@123',
        'password',
      ];
      
      console.log('\n测试密码:');
      for (const testPwd of testPasswords) {
        const match = await bcrypt.compare(testPwd, user.password);
        if (match) {
          console.log(`  ✅ "${testPwd}" - 密码匹配！`);
        } else {
          console.log(`  ❌ "${testPwd}" - 密码不匹配`);
        }
      }
      console.log('');
    }
    
    console.log('💡 提示：如果所有测试密码都不匹配，需要重置密码');
    console.log('   运行: node scripts/create-admin-user.js admin newpassword admin@lekee.cc');
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPassword().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

