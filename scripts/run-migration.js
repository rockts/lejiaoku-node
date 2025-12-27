/**
 * 执行数据库迁移脚本
 * 使用项目已有的数据库连接配置
 */

// 使用 ts-node 运行 TypeScript，或者直接读取编译后的文件
// 这里我们直接使用 Node.js 读取 SQL 并执行

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 尝试多个路径加载 .env
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ 已加载 .env 文件: ${envPath}\n`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️  未找到 .env 文件，使用默认配置\n');
}

async function runMigration() {
  let connection;
  
  try {
    console.log('🔧 开始执行数据库迁移...\n');
    
    // 使用与项目相同的连接配置
    const connectionConfig = {
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
      charset: 'utf8mb4',
    };
    
    // 调试：显示配置（不显示密码）
    console.log('🔍 环境变量检查:');
    console.log(`   MYSQL_HOST: ${process.env.MYSQL_HOST || '未设置'}`);
    console.log(`   MYSQL_PORT: ${process.env.MYSQL_PORT || '未设置'}`);
    console.log(`   MYSQL_USER: ${process.env.MYSQL_USER || '未设置'}`);
    console.log(`   MYSQL_DATABASE: ${process.env.MYSQL_DATABASE || '未设置'}`);
    console.log(`   MYSQL_PASSWORD: ${process.env.MYSQL_PASSWORD ? '***已设置***' : '❌ 未设置'}`);
    console.log('');

    const host = process.env.MYSQL_HOST || 'localhost';
    
    // 尝试 socket 连接（MacPorts MariaDB）
    const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
    if (fs.existsSync(socketPath)) {
      connectionConfig.socketPath = socketPath;
      console.log('📡 使用 socket 连接');
    } else {
      connectionConfig.host = host;
      connectionConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
      console.log(`📡 使用 TCP 连接: ${host}:${connectionConfig.port}`);
    }
    
    console.log(`📊 数据库: ${connectionConfig.database}`);
    console.log(`👤 用户: ${connectionConfig.user}`);
    console.log('');

    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, 'create-catalog-tasks-table.sql');
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL 文件不存在: ${sqlFile}`);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('📝 执行 SQL 迁移...\n');
    
    // 执行 SQL（按语句分割执行，因为可能包含多个语句）
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await connection.query(trimmed);
      }
    }
    
    console.log('✅ catalog_tasks 表创建成功！\n');
    
    // 验证表是否存在
    const [tables] = await connection.query("SHOW TABLES LIKE 'catalog_tasks'");
    
    if (tables.length > 0) {
      console.log('✅ 验证：catalog_tasks 表已存在\n');
      
      // 查看表结构
      const [columns] = await connection.query('DESCRIBE catalog_tasks');
      console.log('📊 表结构:');
      columns.forEach((col) => {
        console.log(`   ${col.Field.padEnd(20)} ${col.Type.padEnd(30)} ${col.Null} ${col.Key} ${col.Default || 'NULL'}`);
      });
      console.log('');
      console.log('🎉 迁移完成！现在可以正常使用任务功能了。');
    } else {
      console.log('⚠️  警告：表创建后未找到，请手动检查');
    }
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.code) {
      console.error('   错误代码:', error.code);
    }
    if (error.sqlMessage) {
      console.error('   SQL 错误:', error.sqlMessage);
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示：数据库连接被拒绝，请检查：');
      console.error('   1. .env 文件中的 MYSQL_PASSWORD 是否正确');
      console.error('   2. 数据库服务是否正在运行');
      console.error('   3. 用户权限是否正确');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行
runMigration();

