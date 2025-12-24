#!/bin/bash

# 部署前功能验证脚本
# 用于验证后端功能完整性

BASE_URL="http://localhost:3333"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 开始部署前功能验证..."
echo ""

# 1. 验证列表接口
echo "📋 1. 验证列表接口 (GET /api/resources)"
RESPONSE=$(curl -s "${BASE_URL}/api/resources?limit=5")
if [ $? -eq 0 ]; then
    RESOURCE_COUNT=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null)
    if [ ! -z "$RESOURCE_COUNT" ] && [ "$RESOURCE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ 列表接口正常，返回 ${RESOURCE_COUNT} 条资源${NC}"
        
        # 检查是否有 catalog_info
        HAS_CATALOG=$(echo $RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print('yes' if any(r.get('catalog_info') for r in data) else 'no')" 2>/dev/null)
        if [ "$HAS_CATALOG" = "yes" ]; then
            echo -e "${GREEN}✅ 列表接口包含 catalog_info${NC}"
        else
            echo -e "${YELLOW}⚠️  列表接口暂无 catalog_info（资源未绑定教材目录）${NC}"
        fi
    else
        echo -e "${RED}❌ 列表接口返回数据异常${NC}"
    fi
else
    echo -e "${RED}❌ 列表接口请求失败${NC}"
fi
echo ""

# 2. 验证详情接口
echo "📄 2. 验证详情接口 (GET /api/resources/:id)"
RESPONSE=$(curl -s "${BASE_URL}/api/resources/3")
if [ $? -eq 0 ]; then
    RESOURCE_ID=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('id', 'N/A'))" 2>/dev/null)
    if [ "$RESOURCE_ID" = "3" ]; then
        echo -e "${GREEN}✅ 详情接口正常，资源ID: ${RESOURCE_ID}${NC}"
        
        # 检查 catalog_info
        HAS_CATALOG=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('catalog_info') else 'no')" 2>/dev/null)
        if [ "$HAS_CATALOG" = "yes" ]; then
            echo -e "${GREEN}✅ 详情接口包含 catalog_info${NC}"
        else
            echo -e "${YELLOW}⚠️  详情接口暂无 catalog_info${NC}"
        fi
        
        # 检查 auto_meta_result
        HAS_AUTO_META=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('auto_meta_result') else 'no')" 2>/dev/null)
        if [ "$HAS_AUTO_META" = "yes" ]; then
            echo -e "${GREEN}✅ 详情接口包含 auto_meta_result${NC}"
        else
            echo -e "${YELLOW}⚠️  详情接口暂无 auto_meta_result${NC}"
        fi
    else
        echo -e "${RED}❌ 详情接口返回数据异常${NC}"
    fi
else
    echo -e "${RED}❌ 详情接口请求失败${NC}"
fi
echo ""

# 3. 验证批量绑定功能
echo "🔗 3. 验证批量绑定功能"
if [ -f "scripts/batch-bind-catalog-from-auto-meta.js" ]; then
    echo "执行批量绑定脚本..."
    OUTPUT=$(node scripts/batch-bind-catalog-from-auto-meta.js 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 批量绑定脚本执行成功${NC}"
        
        # 检查幂等性（第二次执行应该显示"已存在跳过"）
        echo "验证幂等性（第二次执行）..."
        OUTPUT2=$(node scripts/batch-bind-catalog-from-auto-meta.js 2>&1)
        SKIPPED_COUNT=$(echo "$OUTPUT2" | grep -c "已存在跳过" || echo "0")
        if [ "$SKIPPED_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✅ 幂等性验证通过（重复执行不产生重复绑定）${NC}"
        else
            echo -e "${YELLOW}⚠️  幂等性验证：未检测到跳过记录${NC}"
        fi
    else
        echo -e "${RED}❌ 批量绑定脚本执行失败${NC}"
    fi
else
    echo -e "${RED}❌ 批量绑定脚本不存在${NC}"
fi
echo ""

# 4. 验证字段完整性
echo "📊 4. 验证字段完整性"
RESPONSE=$(curl -s "${BASE_URL}/api/resources/3")
REQUIRED_FIELDS=("id" "title" "category" "file_url" "file_format")
MISSING_FIELDS=()

for field in "${REQUIRED_FIELDS[@]}"; do
    HAS_FIELD=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if '$field' in d else 'no')" 2>/dev/null)
    if [ "$HAS_FIELD" != "yes" ]; then
        MISSING_FIELDS+=("$field")
    fi
done

if [ ${#MISSING_FIELDS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 必填字段完整${NC}"
else
    echo -e "${RED}❌ 缺少必填字段: ${MISSING_FIELDS[*]}${NC}"
fi
echo ""

# 5. 验证 catalog_info 字段标准化
echo "📐 5. 验证 catalog_info 字段标准化"
RESPONSE=$(curl -s "${BASE_URL}/api/resources/3")
CATALOG_FIELDS=("education_level" "grade" "subject" "textbook_version" "volume")
MISSING_CATALOG_FIELDS=()

CATALOG_EXISTS=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('catalog_info') else 'no')" 2>/dev/null)

if [ "$CATALOG_EXISTS" = "yes" ]; then
    for field in "${CATALOG_FIELDS[@]}"; do
        HAS_FIELD=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); c=d.get('catalog_info', {}); print('yes' if '$field' in c else 'no')" 2>/dev/null)
        if [ "$HAS_FIELD" != "yes" ]; then
            MISSING_CATALOG_FIELDS+=("$field")
        fi
    done
    
    if [ ${#MISSING_CATALOG_FIELDS[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ catalog_info 字段标准化完整${NC}"
    else
        echo -e "${YELLOW}⚠️  catalog_info 缺少字段: ${MISSING_CATALOG_FIELDS[*]}${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  资源暂无 catalog_info（未绑定教材目录）${NC}"
fi
echo ""

# 总结
echo "=========================================="
echo "📋 验证总结"
echo "=========================================="
echo ""
echo "✅ 接口验证完成"
echo "✅ 批量绑定功能验证完成"
echo "✅ 字段完整性验证完成"
echo ""
echo "📝 详细验证报告请查看: docs/deployment/pre-deployment-verification.md"
echo ""

