#!/bin/bash

# 数据库导入脚本
SQL_FILE="$HOME/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql"
DB_NAME="lejiaoku_node"
DB_USER="root"
DB_PASSWORD=""

echo "开始导入数据库..."

# 查找 MySQL 命令
MYSQL_CMD=""
if command -v mysql &> /dev/null; then
    MYSQL_CMD="mysql"
elif [ -f "/opt/homebrew/bin/mysql" ]; then
    MYSQL_CMD="/opt/homebrew/bin/mysql"
elif [ -f "/usr/local/bin/mysql" ]; then
    MYSQL_CMD="/usr/local/bin/mysql"
else
    echo "❌ 未找到 MySQL 命令，请确保 MySQL 已安装并在 PATH 中"
    exit 1
fi

# 检查 SQL 文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL 文件不存在: $SQL_FILE"
    exit 1
fi

# 创建数据库
echo "创建数据库 $DB_NAME..."
$MYSQL_CMD -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功"
else
    echo "❌ 数据库创建失败，可能需要输入密码"
    exit 1
fi

# 导入 SQL 文件
echo "导入 SQL 文件..."
$MYSQL_CMD -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < "$SQL_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库导入成功！"
    echo "数据库名称: $DB_NAME"
    echo "连接信息: localhost:3306"
else
    echo "❌ 数据库导入失败"
    exit 1
fi

