/**
 * 创建 catalog_tasks 表的迁移脚本
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载环境变量（尝试多个路径）
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✅ 已加载 .env 文件');
} else {
  console.log('⚠️  .env 文件不存在，使用默认配置');
}

async function createCatalogTasksTable() {
  let connection;
  
  try {
    console.log('🔧 开始创建 catalog_tasks 表...\n');
    
    // 创建数据库连接（使用与项目相同的配置逻辑）
    const connectionConfig = {
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
      charset: 'utf8mb4',
    };

    // 如果 host 是 localhost 或 127.0.0.1，优先尝试使用 socket 连接（MacPorts MariaDB）
    const host = process.env.MYSQL_HOST || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
      if (fs.existsSync(socketPath)) {
        connectionConfig.socketPath = socketPath;
        console.log('📡 使用 socket 连接:', socketPath);
        // socket 连接通常不需要密码
        if (!process.env.MYSQL_PASSWORD) {
          console.log('ℹ️  使用 socket 连接，无需密码');
        }
      } else {
        connectionConfig.host = host;
        connectionConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
        console.log('📡 使用 TCP 连接:', `${host}:${connectionConfig.port}`);
        if (!process.env.MYSQL_PASSWORD) {
          console.log('⚠️  提示：未设置 MYSQL_PASSWORD，尝试使用空密码连接');
        }
      }
    } else {
      connectionConfig.host = host;
      connectionConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
      console.log('📡 使用 TCP 连接:', `${host}:${connectionConfig.port}`);
    }

    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, 'create-catalog-tasks-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 执行 SQL 迁移...');
    
    // 执行 SQL
    await connection.query(sql);
    
    console.log('✅ catalog_tasks 表创建成功！\n');
    
    // 验证表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'catalog_tasks'"
    );
    
    if (tables.length > 0) {
      console.log('✅ 验证：catalog_tasks 表已存在\n');
      
      // 查看表结构
      const [columns] = await connection.query('DESCRIBE catalog_tasks');
      console.log('📊 表结构:');
      console.table(columns);
    } else {
      console.log('⚠️  警告：表创建后未找到，请手动检查');
    }
    
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    if (error.code) {
      console.error('   错误代码:', error.code);
    }
    if (error.sqlMessage) {
      console.error('   SQL 错误:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行
createCatalogTasksTable();

