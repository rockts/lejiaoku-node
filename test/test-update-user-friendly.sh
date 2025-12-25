#!/bin/bash
# 测试修改用户信息（兼容两种格式）

BASE_URL="http://localhost:3333"
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="test123456"
TEST_EMAIL="test_$(date +%s)@test.com"

echo "=== 测试修改用户信息（兼容格式）==="
echo ""

# 1. 注册
echo "1. 注册用户..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\",
    \"email\": \"$TEST_EMAIL\"
  }")

if ! echo "$REGISTER_RESPONSE" | grep -q "注册成功"; then
  echo "❌ 注册失败"
  exit 1
fi
echo "✅ 注册成功"
echo ""

# 2. 登录
echo "2. 登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"password\": \"$TEST_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi
echo "✅ 登录成功"
echo ""

# 3. 测试方式1：直接传字段（新格式，更友好）
echo "3. 测试方式1：直接传字段 { \"name\": \"新用户名\" }..."
UPDATE_RESPONSE1=$(curl -s -X PATCH "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"${TEST_USERNAME}_direct\"
  }")

if echo "$UPDATE_RESPONSE1" | grep -q "更新成功\|success"; then
  echo "✅ 方式1成功（直接传字段）"
else
  echo "❌ 方式1失败"
  echo "响应: $UPDATE_RESPONSE1"
  exit 1
fi
echo ""

# 4. 测试方式2：使用update字段包裹（原格式，兼容）
echo "4. 测试方式2：使用update字段 { \"update\": { \"name\": \"新用户名\" } }..."
UPDATE_RESPONSE2=$(curl -s -X PATCH "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"update\": {
      \"name\": \"${TEST_USERNAME}_wrapped\"
    }
  }")

if echo "$UPDATE_RESPONSE2" | grep -q "更新成功\|success"; then
  echo "✅ 方式2成功（使用update字段）"
else
  echo "❌ 方式2失败"
  echo "响应: $UPDATE_RESPONSE2"
  exit 1
fi
echo ""

echo "=== 所有测试通过 ==="
echo "✅ 后端现在支持两种格式："
echo "  1. 直接传字段: { \"name\": \"新用户名\" }"
echo "  2. 使用update包裹: { \"update\": { \"name\": \"新用户名\" } }"
