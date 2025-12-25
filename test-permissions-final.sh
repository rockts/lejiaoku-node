#!/bin/bash

BASE_URL="http://localhost:3333"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 开始权限测试${NC}\n"

# 获取 token
get_token() {
    local username=$1
    local password=$2
    curl -s -X POST "${BASE_URL}/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"password\":\"${password}\"}" | \
        python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null
}

# 测试函数
test_api() {
    local method=$1
    local url=$2
    local token=$3
    local data=$4
    local expected=$5
    local desc=$6
    
    local auth_header=""
    if [ -n "$token" ]; then
        auth_header="-H \"Authorization: Bearer ${token}\""
    fi
    
    local data_param=""
    if [ -n "$data" ]; then
        data_param="-d '${data}'"
    fi
    
    local response=$(eval "curl -s -w '\n%{http_code}' -X ${method} '${BASE_URL}${url}' ${auth_header} -H 'Content-Type: application/json' ${data_param}" 2>/dev/null)
    
    local status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected" ]; then
        echo -e "  ${GREEN}✅ ${desc} - 状态码: ${status}${NC}"
        return 0
    else
        echo -e "  ${RED}❌ ${desc} - 期望: ${expected}, 实际: ${status}${NC}"
        echo -e "     ${YELLOW}响应: ${body:0:150}${NC}"
        return 1
    fi
}

# 获取 token
echo -e "${BLUE}📝 步骤 1: 获取各角色 token${NC}"
ADMIN_TOKEN=$(get_token "rockts" "123456")
EDITOR_TOKEN=$(get_token "xiaole" "123456")
CONTRIBUTOR_TOKEN=$(get_token "lekeopen" "123456")

if [ -z "$ADMIN_TOKEN" ] || [ -z "$EDITOR_TOKEN" ] || [ -z "$CONTRIBUTOR_TOKEN" ]; then
    echo -e "${RED}❌ Token 获取失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Admin token: ${#ADMIN_TOKEN} 字符${NC}"
echo -e "${GREEN}✅ Editor token: ${#EDITOR_TOKEN} 字符${NC}"
echo -e "${GREEN}✅ Contributor token: ${#CONTRIBUTOR_TOKEN} 字符${NC}\n"

# 测试上传权限
echo -e "${BLUE}📋 步骤 2: 测试上传权限${NC}"

# 创建测试 user 用户
echo -e "${CYAN}创建测试 user 用户...${NC}"
USER_RESPONSE=$(curl -s -X POST "${BASE_URL}/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser999","password":"123456"}')

USER_TOKEN=$(echo "$USER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$USER_TOKEN" ]; then
    USER_TOKEN=$(get_token "testuser999" "123456")
fi

if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}✅ User token 获取成功${NC}"
    test_api "POST" "/api/resources" "$USER_TOKEN" \
        '{"title":"测试","category":"课件","file_url":"http://example.com/test.pdf","file_format":"PDF"}' \
        403 "user 角色上传资源 → 403"
else
    echo -e "${YELLOW}⚠️  跳过 user 角色测试（无法获取 token）${NC}"
fi

# contributor 上传资源
test_api "POST" "/api/resources" "$CONTRIBUTOR_TOKEN" \
    '{"title":"测试上传权限","category":"课件","file_url":"http://example.com/test.pdf","file_format":"PDF"}' \
    201 "contributor 角色上传资源 → 201"

# 测试编辑权限
echo -e "\n${BLUE}📋 步骤 3: 测试编辑权限${NC}"

# contributor 编辑自己的资源（假设资源 ID 3 是 contributor 的）
test_api "PUT" "/api/resources/3" "$CONTRIBUTOR_TOKEN" \
    '{"title":"修改测试"}' \
    200 "contributor 编辑自己资源 → 200"

# contributor 编辑他人资源
test_api "PUT" "/api/resources/1" "$CONTRIBUTOR_TOKEN" \
    '{"title":"越权测试"}' \
    403 "contributor 编辑他人资源 → 403"

# user 编辑资源
if [ -n "$USER_TOKEN" ]; then
    test_api "PUT" "/api/resources/1" "$USER_TOKEN" \
        '{"title":"user 越权测试"}' \
        403 "user 角色编辑资源 → 403"
fi

# 测试审核权限
echo -e "\n${BLUE}📋 步骤 4: 测试审核权限${NC}"

# editor 审核资源
test_api "POST" "/api/resources/3/approve" "$EDITOR_TOKEN" \
    "" 200 "editor 审核资源 → 200"

# admin 审核资源
test_api "POST" "/api/resources/3/approve" "$ADMIN_TOKEN" \
    "" 200 "admin 审核资源 → 200"

# user 审核资源
if [ -n "$USER_TOKEN" ]; then
    test_api "POST" "/api/resources/3/approve" "$USER_TOKEN" \
        "" 403 "user 审核资源 → 403"
fi

# contributor 审核资源
test_api "POST" "/api/resources/3/approve" "$CONTRIBUTOR_TOKEN" \
    "" 403 "contributor 审核资源 → 403"

# 测试删除权限
echo -e "\n${BLUE}📋 步骤 5: 测试删除权限${NC}"

# admin 删除资源（使用不存在的资源 ID）
test_api "DELETE" "/api/resources/99999" "$ADMIN_TOKEN" \
    "" 404 "admin 删除资源（权限验证，资源不存在）"

# editor 删除资源
test_api "DELETE" "/api/resources/1" "$EDITOR_TOKEN" \
    "" 403 "editor 删除资源 → 403"

# contributor 删除资源
test_api "DELETE" "/api/resources/1" "$CONTRIBUTOR_TOKEN" \
    "" 403 "contributor 删除资源 → 403"

# user 删除资源
if [ -n "$USER_TOKEN" ]; then
    test_api "DELETE" "/api/resources/1" "$USER_TOKEN" \
        "" 403 "user 删除资源 → 403"
fi

# 测试未授权访问
echo -e "\n${BLUE}📋 步骤 6: 测试未授权访问${NC}"

# 无 token 访问
test_api "POST" "/api/resources" "" \
    '{"title":"测试"}' \
    401 "无 token 访问 → 401"

# 错误 token 访问
test_api "POST" "/api/resources" "invalid_token_12345" \
    '{"title":"测试"}' \
    401 "错误 token 访问 → 401"

echo -e "\n${GREEN}✅ 测试完成${NC}\n"

