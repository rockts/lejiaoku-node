require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const connectionConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ravent',
  charset: 'utf8mb4'
};

async function addSourceAttributionField() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功');

    // 先检查字段是否存在
    console.log('🔍 检查字段是否已存在...');
    const [existingColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resource' AND COLUMN_NAME = 'source_attribution'
    `, [connectionConfig.database]);
    
    if (existingColumns.length > 0) {
      console.log('ℹ️  字段 source_attribution 已存在，跳过添加');
    } else {
      console.log('📝 开始添加 source_attribution 字段...');
      
      // 直接执行 ALTER TABLE 语句
      await connection.query(`
        ALTER TABLE resource 
        ADD COLUMN source_attribution VARCHAR(100) NULL 
        COMMENT '资源出处/来源标注（如：xx教育、某某出版社等）' 
        AFTER description
      `);
      
      console.log('✅ source_attribution 字段添加成功！');
    }
    
    console.log('✅ source_attribution 字段添加成功！');
    
    // 验证字段是否添加成功
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resource' AND COLUMN_NAME = 'source_attribution'
    `, [connectionConfig.database]);
    
    if (columns.length > 0) {
      console.log('\n📊 字段信息：');
      console.log(JSON.stringify(columns[0], null, 2));
    } else {
      console.warn('⚠️  警告：未找到 source_attribution 字段，可能添加失败');
    }
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    if (error.code === 'ER_DUP_FIELD_NAME') {
      console.log('ℹ️  字段已存在，跳过添加');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addSourceAttributionField();

