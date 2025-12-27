#!/bin/bash
# 快速启动数据库脚本

echo "=== 最快数据库连接方案 ==="
echo ""
echo "API 端口: 3000"
echo "服务地址: http://localhost:3000"
echo ""

# 检查 Docker
if command -v docker &> /dev/null; then
    echo "✅ 检测到 Docker，使用 Docker MySQL（最快）"
    echo ""
    echo "启动 MySQL 容器:"
    docker run --name mysql-lejiaoku \
        -e MYSQL_ROOT_PASSWORD=root \
        -e MYSQL_DATABASE=lejiaoku_node \
        -p 3306:3306 \
        -d mysql:8.0
    
    echo "等待 MySQL 启动..."
    sleep 10
    
    echo "导入数据..."
    docker exec -i mysql-lejiaoku mysql -uroot -proot lejiaoku_node < ~/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql
    
    echo "✅ 数据库已启动并导入数据！"
    echo "连接信息: localhost:3306, 用户: root, 密码: root"
else
    echo "❌ Docker 未安装"
    echo ""
    echo "其他方案："
    echo "1. 使用远程数据库（最快）"
    echo "2. 等待 Homebrew 安装完成"
fi

