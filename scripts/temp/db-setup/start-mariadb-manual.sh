#!/bin/bash
# 手动启动 MariaDB（MacPorts 版本）

echo "=== 启动 MariaDB 服务 ==="
echo ""

# 方式1: 使用 launchctl（推荐）
echo "方式1: 使用 launchctl 启动..."
sudo launchctl load /Library/LaunchDaemons/org.macports.mariadb-10.11.plist 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 服务启动命令已执行"
    echo "等待 3 秒..."
    sleep 3
    
    # 测试连接
    if /opt/local/lib/mariadb-10.11/bin/mysql -u root -p8363678 -S /opt/local/var/run/mariadb-10.11/mysqld.sock -e "SELECT VERSION();" 2>/dev/null; then
        echo "✅ MariaDB 启动成功并可以连接！"
        exit 0
    else
        echo "⚠️  服务可能正在启动中，请稍等几秒后再试"
    fi
else
    echo "⚠️  launchctl 启动失败，尝试方式2..."
fi

echo ""
echo "方式2: 使用 mysqld_safe 手动启动..."
echo "执行命令:"
echo "  sudo -u _mysql /opt/local/lib/mariadb-10.11/bin/mysqld_safe \\"
echo "      --datadir=/opt/local/var/db/mariadb-10.11 \\"
echo "      --socket=/opt/local/var/run/mariadb-10.11/mysqld.sock \\"
echo "      --user=_mysql &"
echo ""
echo "或者直接运行（后台运行）:"
echo "  sudo -u _mysql /opt/local/lib/mariadb-10.11/bin/mysqld_safe --datadir=/opt/local/var/db/mariadb-10.11 --socket=/opt/local/var/run/mariadb-10.11/mysqld.sock --user=_mysql > /dev/null 2>&1 &"
echo ""
echo "启动后，等待几秒，然后测试连接:"
echo "  /opt/local/lib/mariadb-10.11/bin/mysql -u root -p8363678 -S /opt/local/var/run/mariadb-10.11/mysqld.sock -e \"SELECT VERSION();\""

