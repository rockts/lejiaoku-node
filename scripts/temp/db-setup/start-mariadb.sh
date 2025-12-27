#!/bin/bash
# 手动启动 MariaDB 服务脚本

MYSQLD="/opt/local/lib/mariadb-10.11/bin/mysqld"
DATADIR="/opt/local/var/db/mariadb-10.11"
SOCKET="/opt/local/var/run/mariadb-10.11/mysqld.sock"
PIDFILE="/opt/local/var/db/mariadb-10.11/$(hostname).pid"
MYSQL_USER="_mysql"
MYSQL_GROUP="_mysql"
MYSQL_BIN="/opt/local/lib/mariadb-10.11/bin/mysql"

echo "=== 启动 MariaDB 服务 ==="
echo ""

# 检查 mysqld 是否存在
if [ ! -f "$MYSQLD" ]; then
    echo "❌ mysqld 不存在: $MYSQLD"
    exit 1
fi

# 检查是否已经运行
if ps aux | grep -i mysqld | grep -v grep > /dev/null; then
    echo "✅ MariaDB 已经在运行"
    exit 0
fi

# 检查数据目录
if [ ! -d "$DATADIR" ]; then
    echo "⚠️  数据目录不存在，正在创建: $DATADIR"
    sudo mkdir -p "$DATADIR"
    sudo chown -R "$MYSQL_USER:$MYSQL_GROUP" "$DATADIR"
fi

# 检查 socket 目录
SOCKET_DIR=$(dirname "$SOCKET")
if [ ! -d "$SOCKET_DIR" ]; then
    echo "⚠️  Socket 目录不存在，正在创建: $SOCKET_DIR"
    sudo mkdir -p "$SOCKET_DIR"
    sudo chown -R "$MYSQL_USER:$MYSQL_GROUP" "$SOCKET_DIR"
fi

echo "1. 尝试启动 MariaDB..."
echo "   数据目录: $DATADIR"
echo "   Socket: $SOCKET"
echo ""

# 方式1: 使用 mysqld_safe（推荐，会自动重启）
if [ -f "/opt/local/lib/mariadb-10.11/bin/mysqld_safe" ]; then
    echo "使用 mysqld_safe 启动..."
    sudo -u "$MYSQL_USER" /opt/local/lib/mariadb-10.11/bin/mysqld_safe \
        --datadir="$DATADIR" \
        --socket="$SOCKET" \
        --pid-file="$PIDFILE" \
        --user="$MYSQL_USER" \
        > /dev/null 2>&1 &
    
    sleep 3
    
    if ps aux | grep -i mysqld | grep -v grep > /dev/null; then
        echo "✅ MariaDB 启动成功"
        exit 0
    fi
fi

# 方式2: 直接启动 mysqld
echo "使用 mysqld 直接启动..."
sudo -u "$MYSQL_USER" "$MYSQLD" \
    --datadir="$DATADIR" \
    --socket="$SOCKET" \
    --pid-file="$PIDFILE" \
    --user="$MYSQL_USER" \
    > /dev/null 2>&1 &

sleep 3

# 检查是否启动成功
if ps aux | grep -i mysqld | grep -v grep > /dev/null; then
    echo "✅ MariaDB 启动成功"
    echo ""
    echo "测试连接..."
    if "$MYSQL_BIN" -u root -p8363678 -S "$SOCKET" -e "SELECT VERSION();" 2>/dev/null; then
        echo "✅ 数据库连接测试成功"
    else
        echo "⚠️  数据库已启动，但连接测试失败，请检查密码"
    fi
else
    echo "❌ MariaDB 启动失败"
    echo ""
    echo "请尝试查看日志:"
    echo "  tail -f $DATADIR/$(hostname).err"
    echo ""
    echo "或者手动启动:"
    echo "  sudo -u _mysql $MYSQLD --datadir=$DATADIR --socket=$SOCKET --user=_mysql"
    exit 1
fi

