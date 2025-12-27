#!/bin/bash
# 启动服务脚本

cd /Users/gaopeng/Dev/lejiaoku-node

echo "=== 检查环境 ==="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未找到，使用 nvm 版本"
    export PATH="/Users/gaopeng/.nvm/versions/node/v20.19.6/bin:$PATH"
fi

echo "Node.js 版本: $(node --version)"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在"
    exit 1
fi

echo "✅ .env 文件存在"

# 检查编译
if [ ! -f dist/main.js ]; then
    echo "编译代码..."
    yarn build
    if [ $? -ne 0 ]; then
        echo "❌ 编译失败"
        exit 1
    fi
fi

echo "✅ 代码已编译"

# 启动服务
echo ""
echo "=== 启动服务 ==="
echo "服务地址: http://localhost:3000"
echo ""

NODE_ENV=development yarn start:dev


