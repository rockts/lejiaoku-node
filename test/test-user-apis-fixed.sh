#!/bin/bash
# 测试用户注册、登录、修改个人信息API（修复版）

BASE_URL="http://localhost:3333"
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="test123456"
TEST_EMAIL="test_$(date +%s)@test.com"

echo "=== 测试用户API ==="
echo ""

# 1. 测试注册
echo "1. 测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\",
    \"email\": \"$TEST_EMAIL\"
  }")

echo "注册响应: $REGISTER_RESPONSE"
echo ""

# 检查注册是否成功
if echo "$REGISTER_RESPONSE" | grep -q "注册成功\|success\|201"; then
  echo "✅ 注册成功"
else
  echo "❌ 注册失败"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# 2. 测试登录
echo ""
echo "2. 测试用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "登录响应: $LOGIN_RESPONSE"
echo ""

# 提取token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，未获取到token"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 3. 测试修改个人信息（尝试不同的数据格式）
echo "3. 测试修改个人信息..."

# 方式1: 使用 update 字段包裹
echo "  方式1: 使用 update 字段..."
UPDATE_RESPONSE1=$(curl -s -X PATCH "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"update\": {
      \"name\": \"${TEST_USERNAME}_updated\"
    }
  }")

echo "  响应1: $UPDATE_RESPONSE1"
echo ""

if echo "$UPDATE_RESPONSE1" | grep -q "成功\|success\|updated"; then
  echo "✅ 方式1成功"
else
  # 方式2: 直接传字段
  echo "  方式2: 直接传字段..."
  UPDATE_RESPONSE2=$(curl -s -X PATCH "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"name\": \"${TEST_USERNAME}_updated2\"
    }")
  
  echo "  响应2: $UPDATE_RESPONSE2"
  echo ""
  
  if echo "$UPDATE_RESPONSE2" | grep -q "成功\|success\|updated"; then
    echo "✅ 方式2成功"
  else
    echo "❌ 修改个人信息失败"
    echo "$UPDATE_RESPONSE2"
    exit 1
  fi
fi

echo ""
echo "=== 所有测试通过 ==="
