/**
 * 创建或更新管理员账号
 * 使用方法：
 * node scripts/create-admin-user.js [username] [password] [email]
 * 
 * 示例：
 * node scripts/create-admin-user.js admin admin123456 admin@example.com
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function createAdminUser(username, password, email) {
  let connection;
  
  try {
    console.log('🔧 创建/更新管理员账号...\n');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ravent',
    });
    
    // 默认值
    const adminUsername = username || 'admin';
    const adminPassword = password || 'admin123456';
    const adminEmail = email || 'admin@lejiaoku.com';
    
    console.log(`用户名: ${adminUsername}`);
    console.log(`邮箱: ${adminEmail}`);
    console.log(`密码: ${adminPassword}`);
    console.log('');
    
    // 检查用户是否已存在
    const [existingUsers] = await connection.query(
      'SELECT id, name, email, role FROM user WHERE name = ? OR email = ?',
      [adminUsername, adminEmail]
    );
    
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      console.log(`✓ 用户已存在 (ID: ${existingUser.id})`);
      
      // 更新为管理员并更新密码
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        'UPDATE user SET role = ?, password = ? WHERE id = ?',
        ['admin', hashedPassword, existingUser.id]
      );
      
      console.log('✅ 用户已升级为管理员，密码已更新');
      console.log(`\n管理员账号信息：`);
      console.log(`  用户名: ${adminUsername}`);
      console.log(`  邮箱: ${adminEmail}`);
      console.log(`  密码: ${adminPassword}`);
      console.log(`  角色: admin`);
    } else {
      // 创建新管理员
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const [result] = await connection.query(
        'INSERT INTO user (name, email, password, role) VALUES (?, ?, ?, ?)',
        [adminUsername, adminEmail, hashedPassword, 'admin']
      );
      
      console.log('✅ 管理员账号创建成功');
      console.log(`\n管理员账号信息：`);
      console.log(`  用户名: ${adminUsername}`);
      console.log(`  邮箱: ${adminEmail}`);
      console.log(`  密码: ${adminPassword}`);
      console.log(`  角色: admin`);
      console.log(`  用户ID: ${result.insertId}`);
    }
    
    console.log('\n💡 提示：请妥善保管管理员账号密码！');
    
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 从命令行参数获取
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];
const email = args[2];

createAdminUser(username, password, email).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

