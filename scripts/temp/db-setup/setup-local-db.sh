#!/bin/bash
# 本地数据库设置脚本

DB_USER="root"
DB_PASSWORD="8363678"
DB_NAME="lejiaoku_node"
SQL_FILE="$HOME/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql"

echo "=== 本地数据库设置 ==="
echo ""

# 尝试不同的连接方式
echo "1. 尝试连接数据库..."

# 方式1: 默认 socket
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>/dev/null; then
    echo "✅ 方式1: 默认 socket 连接成功"
    MYSQL_CMD="mysql -u $DB_USER -p$DB_PASSWORD"
elif mysql -u "$DB_USER" -p"$DB_PASSWORD" -h 127.0.0.1 -P 3306 -e "SELECT 1;" 2>/dev/null; then
    echo "✅ 方式2: TCP 连接成功 (127.0.0.1:3306)"
    MYSQL_CMD="mysql -u $DB_USER -p$DB_PASSWORD -h 127.0.0.1 -P 3306"
elif mysql -u "$DB_USER" -p"$DB_PASSWORD" -h localhost -P 3306 -e "SELECT 1;" 2>/dev/null; then
    echo "✅ 方式3: TCP 连接成功 (localhost:3306)"
    MYSQL_CMD="mysql -u $DB_USER -p$DB_PASSWORD -h localhost -P 3306"
else
    echo "❌ 无法连接到数据库"
    echo "请确保 MariaDB/MySQL 服务正在运行"
    echo ""
    echo "如果是通过 Homebrew 安装的 MariaDB:"
    echo "  brew services start mariadb"
    echo ""
    echo "如果是通过 Homebrew 安装的 MySQL:"
    echo "  brew services start mysql"
    echo ""
    echo "如果是通过 MacPorts 安装的:"
    echo "  sudo port load mariadb-10.11-server"
    echo ""
    exit 1
fi

echo ""
echo "2. 创建数据库 $DB_NAME..."
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库 $DB_NAME 创建成功或已存在"
else
    echo "❌ 数据库创建失败"
    exit 1
fi

echo ""
echo "3. 检查 SQL 文件..."
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL 文件不存在: $SQL_FILE"
    exit 1
fi
echo "✅ SQL 文件存在: $SQL_FILE"

echo ""
echo "4. 导入数据到 $DB_NAME..."
$MYSQL_CMD "$DB_NAME" < "$SQL_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库导入成功！"
    echo ""
    echo "5. 验证导入结果..."
    TABLE_COUNT=$($MYSQL_CMD "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | wc -l | tr -d ' ')
    echo "   数据库表数量: $((TABLE_COUNT - 1))"
    echo ""
    echo "✅ 数据库设置完成！"
    echo ""
    echo "请更新 .env 文件中的数据库配置："
    echo "  MYSQL_HOST=127.0.0.1"
    echo "  MYSQL_PORT=3306"
    echo "  MYSQL_USER=root"
    echo "  MYSQL_PASSWORD=8363678"
    echo "  MYSQL_DATABASE=lejiaoku_node"
else
    echo "❌ 数据库导入失败，请检查错误信息"
    exit 1
fi

