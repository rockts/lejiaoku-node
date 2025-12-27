import mysql from 'mysql2';
import fs from 'fs';
import {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} from '../../app/app.config';

/**
 * 创建数据服务连接
 */
const connectionConfig: any = {
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  charset: 'utf8mb4' // 明确指定字符集
};

// 如果 host 是 localhost 或 127.0.0.1，尝试使用 socket 连接（MacPorts MariaDB）
if (MYSQL_HOST === 'localhost' || MYSQL_HOST === '127.0.0.1') {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  // 检查 socket 文件是否存在，如果存在则使用 socket 连接
  if (fs.existsSync(socketPath)) {
    connectionConfig.socketPath = socketPath;
  } else {
    // socket 不存在，使用 TCP 连接
    connectionConfig.host = MYSQL_HOST;
    connectionConfig.port = parseInt(MYSQL_PORT, 10);
  }
} else {
  // 远程数据库，使用 TCP 连接
  connectionConfig.host = MYSQL_HOST;
  connectionConfig.port = parseInt(MYSQL_PORT, 10);
}

export const connection = mysql.createConnection(connectionConfig);