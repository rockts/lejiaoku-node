#!/bin/bash
# 本地数据库导入脚本（MariaDB MacPorts 版本）

DB_USER="root"
DB_PASSWORD="8363678"
DB_NAME="lejiaoku_node"
SQL_FILE="$HOME/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql"
MYSQL_BIN="/opt/local/lib/mariadb-10.11/bin/mysql"
SOCKET="/opt/local/var/run/mariadb-10.11/mysqld.sock"

echo "=== 本地数据库导入 ==="
echo ""

# 检查 MySQL 客户端
if [ ! -f "$MYSQL_BIN" ]; then
    echo "❌ MySQL 客户端不存在: $MYSQL_BIN"
    exit 1
fi

echo "1. 检查 SQL 文件..."
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL 文件不存在: $SQL_FILE"
    exit 1
fi
echo "✅ SQL 文件存在: $SQL_FILE"
echo "   文件大小: $(du -h "$SQL_FILE" | cut -f1)"
echo ""

echo "2. 测试数据库连接..."
if $MYSQL_BIN -u "$DB_USER" -p"$DB_PASSWORD" -S "$SOCKET" -e "SELECT 1;" 2>/dev/null; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 无法连接到数据库"
    echo ""
    echo "请先启动 MariaDB 服务："
    echo "  方式1（推荐）: sudo port load mariadb-10.11-server"
    echo "  方式2: 在系统偏好设置中启动 MySQL"
    echo ""
    exit 1
fi

echo ""
echo "3. 创建数据库 $DB_NAME..."
$MYSQL_BIN -u "$DB_USER" -p"$DB_PASSWORD" -S "$SOCKET" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库 $DB_NAME 创建成功或已存在"
else
    echo "❌ 数据库创建失败"
    exit 1
fi

echo ""
echo "4. 导入数据到 $DB_NAME..."
echo "   这可能需要几分钟，请耐心等待..."
$MYSQL_BIN -u "$DB_USER" -p"$DB_PASSWORD" -S "$SOCKET" "$DB_NAME" < "$SQL_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库导入成功！"
    echo ""
    echo "5. 验证导入结果..."
    TABLE_COUNT=$($MYSQL_BIN -u "$DB_USER" -p"$DB_PASSWORD" -S "$SOCKET" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | wc -l | tr -d ' ')
    echo "   数据库表数量: $((TABLE_COUNT - 1))"
    echo ""
    echo "6. 显示部分表名..."
    $MYSQL_BIN -u "$DB_USER" -p"$DB_PASSWORD" -S "$SOCKET" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | head -10
    echo ""
    echo "✅ 数据库设置完成！"
    echo ""
    echo "请更新 .env 文件中的数据库配置为："
    echo "  MYSQL_HOST=127.0.0.1"
    echo "  MYSQL_PORT=3306"
    echo "  MYSQL_USER=root"
    echo "  MYSQL_PASSWORD=8363678"
    echo "  MYSQL_DATABASE=lejiaoku_node"
else
    echo "❌ 数据库导入失败，请检查错误信息"
    exit 1
fi

