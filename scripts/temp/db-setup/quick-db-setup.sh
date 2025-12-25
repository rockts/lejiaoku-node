#!/bin/bash
# 快速数据库设置脚本

echo "=== 最快数据库连接方案 ==="
echo ""
echo "方案 1: 使用远程数据库（最快，如果可用）"
echo "  修改 .env 中的 MYSQL_HOST 为您的远程数据库地址"
echo ""
echo "方案 2: 使用 Docker MySQL（推荐，几分钟完成）"
echo "  docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=lejiaoku_node -p 3306:3306 -d mysql:8.0"
echo "  然后运行: ./import-db.sh"
echo ""
echo "方案 3: 等待 Homebrew 安装完成"
echo "  检查: ps -p 5515"
echo ""
echo "当前数据库配置:"
grep MYSQL .env 2>/dev/null | head -5
