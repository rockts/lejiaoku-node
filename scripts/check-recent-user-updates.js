/**
 * 检查最近更新的用户信息
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function checkRecentUpdates() {
  let connection;
  
  try {
    console.log('🔍 检查最近更新的用户信息...\n');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ravent',
    });
    
    // 查询最近更新的用户（按 updated_at 排序）
    const [users] = await connection.query(`
      SELECT id, name, email, role, created_at, updated_at 
      FROM user 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);
    
    console.log(`📊 最近更新的 ${users.length} 个用户：\n`);
    
    users.forEach((user, index) => {
      const updatedTime = new Date(user.updated_at);
      const now = new Date();
      const diffMinutes = Math.floor((now - updatedTime) / 1000 / 60);
      
      console.log(`${index + 1}. ID: ${user.id} - ${user.name}`);
      console.log(`   邮箱: ${user.email || '(无)'}`);
      console.log(`   角色: ${user.role || 'user'}`);
      console.log(`   更新时间: ${user.updated_at}`);
      
      if (diffMinutes < 5) {
        console.log(`   ⚡ 刚刚更新（${diffMinutes} 分钟前）\n`);
      } else {
        console.log(`   （${diffMinutes} 分钟前更新）\n`);
      }
    });
    
    // 检查是否有最近5分钟内的更新
    const recentUpdates = users.filter(u => {
      const updatedTime = new Date(u.updated_at);
      const now = new Date();
      const diffMinutes = Math.floor((now - updatedTime) / 1000 / 60);
      return diffMinutes < 5;
    });
    
    if (recentUpdates.length > 0) {
      console.log('✅ 发现最近的更新：');
      recentUpdates.forEach(user => {
        console.log(`   - ${user.name} (${user.email || '无邮箱'})`);
      });
    } else {
      console.log('⚠️  没有发现最近5分钟内的更新');
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

checkRecentUpdates().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

