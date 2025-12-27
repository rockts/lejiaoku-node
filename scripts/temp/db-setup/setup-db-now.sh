#!/bin/bash
# 快速数据库设置脚本

echo "=== 快速设置数据库 ==="

# 检查 MySQL 是否已安装
MYSQL_CMD=""
if command -v mysql &> /dev/null; then
    MYSQL_CMD="mysql"
elif [ -f "/usr/local/mysql/bin/mysql" ]; then
    MYSQL_CMD="/usr/local/mysql/bin/mysql"
elif [ -f "/Applications/MySQL*/bin/mysql" ]; then
    MYSQL_CMD="/Applications/MySQL*/bin/mysql"
else
    echo "❌ MySQL 未安装"
    echo ""
    echo "请访问以下链接下载并安装 MySQL："
    echo "https://dev.mysql.com/downloads/mysql/"
    echo "选择: macOS 11 (x86, 64-bit), DMG Archive"
    exit 1
fi

echo "✅ 找到 MySQL: $MYSQL_CMD"

# 创建数据库
echo "创建数据库..."
$MYSQL_CMD -u root -e "CREATE DATABASE IF NOT EXISTS lejiaoku_node CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功"
else
    echo "⚠️  可能需要输入密码，请手动运行："
    echo "   $MYSQL_CMD -u root -p -e \"CREATE DATABASE IF NOT EXISTS lejiaoku_node CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
    echo "   然后运行："
    echo "   $MYSQL_CMD -u root -p lejiaoku_node < ~/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql"
    exit 1
fi

# 导入数据
echo "导入数据..."
$MYSQL_CMD -u root lejiaoku_node < ~/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据导入成功！"
    echo ""
    echo "数据库配置："
    echo "  MYSQL_HOST=localhost"
    echo "  MYSQL_PORT=3306"
    echo "  MYSQL_DATABASE=lejiaoku_node"
    echo "  MYSQL_USER=root"
    echo "  MYSQL_PASSWORD=(空或您设置的密码)"
else
    echo "❌ 数据导入失败，请检查 SQL 文件路径和权限"
    exit 1
fi
