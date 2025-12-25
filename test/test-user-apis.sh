#!/bin/bash
# 测试用户注册、登录、修改个人信息API

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

# 3. 测试修改个人信息
echo "3. 测试修改个人信息..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"nickname\": \"测试昵称_$(date +%s)\"
  }")

echo "修改响应: $UPDATE_RESPONSE"
echo ""

if echo "$UPDATE_RESPONSE" | grep -q "成功\|success\|nickname"; then
  echo "✅ 修改个人信息成功"
else
  echo "❌ 修改个人信息失败"
  echo "$UPDATE_RESPONSE"
  exit 1
fi

echo ""
echo "=== 所有测试通过 ==="
