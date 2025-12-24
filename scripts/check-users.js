/**
 * 检查数据库中的用户信息
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function checkUsers() {
  let connection;
  
  try {
    console.log('🔍 查询数据库中的用户信息...\n');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ravent',
    });
    
    const [users] = await connection.query(`
      SELECT id, name, email, role, created_at 
      FROM user 
      ORDER BY id ASC
    `);
    
    console.log(`📊 找到 ${users.length} 个用户：\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   用户名: ${user.name}`);
      console.log(`   邮箱: ${user.email || '(无)'}`);
      console.log(`   角色: ${user.role || 'user'}`);
      console.log(`   创建时间: ${user.created_at}`);
      console.log('');
    });
    
    const adminUsers = users.filter(u => u.role === 'admin');
    if (adminUsers.length > 0) {
      console.log('👑 管理员账号：');
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email || '无邮箱'})`);
      });
      console.log('\n⚠️  注意：此脚本不会显示密码（密码已加密存储）');
      console.log('   如需重置密码，请使用注册接口或手动更新数据库\n');
    } else {
      console.log('⚠️  没有找到管理员账号');
      console.log('   可以通过注册接口创建管理员账号：');
      console.log('   POST /register 或 POST /api/register');
      console.log('   设置 role: "admin"\n');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

