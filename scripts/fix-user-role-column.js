/**
 * 修复 user 表 role 列
 * 如果 role 列不存在，则添加；如果存在，确保现有数据有默认值
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function fixRoleColumn() {
  let connection;
  
  try {
    console.log('🔧 开始修复 user 表 role 列...\n');
    
    // 创建数据库连接（使用与项目相同的配置）
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ravent',
    });
    
    console.log('✓ 数据库连接成功\n');
    
    // 1. 检查 role 列是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user' 
      AND COLUMN_NAME = 'role'
    `);
    
    if (columns.length === 0) {
      console.log('📝 role 列不存在，正在添加...');
      
      // 添加 role 列
      await connection.query(`
        ALTER TABLE user 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user' 
        COMMENT '用户角色：user(普通用户) / admin(管理员)' 
        AFTER email
      `);
      
      console.log('✅ role 列添加成功\n');
    } else {
      console.log('✓ role 列已存在\n');
    }
    
    // 2. 更新现有用户，确保 role 有值
    const [result] = await connection.query(`
      UPDATE user 
      SET role = 'user' 
      WHERE role IS NULL OR role = ''
    `);
    
    if (result.affectedRows > 0) {
      console.log(`✓ 更新了 ${result.affectedRows} 条用户记录的 role 字段\n`);
    } else {
      console.log('✓ 所有用户的 role 字段已有值\n');
    }
    
    // 3. 验证结果
    const [users] = await connection.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN role IS NULL OR role = '' THEN 1 ELSE 0 END) as null_count
      FROM user
    `);
    
    console.log('📊 验证结果:');
    console.log(`  - 总用户数: ${users[0].total}`);
    console.log(`  - role 为空的用户: ${users[0].null_count}`);
    console.log('');
    
    if (users[0].null_count === 0) {
      console.log('✅ user 表 role 列修复完成！');
    } else {
      console.log('⚠️  仍有部分用户的 role 为空，请检查');
    }
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  role 列已存在，无需重复添加');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

// 执行修复
fixRoleColumn().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

