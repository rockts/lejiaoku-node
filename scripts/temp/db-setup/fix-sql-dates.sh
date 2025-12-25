#!/bin/bash
# 修复 SQL 文件中的日期格式

SQL_FILE="$HOME/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30.sql"
FIXED_SQL_FILE="$HOME/Desktop/lejiaoku-node-backup-2025-12-23T20-09-30-fixed.sql"

echo "=== 修复 SQL 文件日期格式 ==="
echo ""

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL 文件不存在: $SQL_FILE"
    exit 1
fi

echo "原始文件: $SQL_FILE"
echo "修复后文件: $FIXED_SQL_FILE"
echo ""

# 使用 Python 来修复日期格式（更可靠）
python3 << 'PYTHON_SCRIPT'
import re
import sys
from datetime import datetime

def fix_date_format(match):
    """将 JavaScript Date 字符串转换为 MySQL DATETIME 格式"""
    date_str = match.group(0)
    try:
        # 尝试解析类似 "Mon Feb 22 2021 09:58:02 GMT+0800 (China Standard Time)" 的格式
        # 提取日期时间部分
        # 匹配格式: Mon Feb 22 2021 09:58:02 GMT+0800
        pattern = r'(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})'
        m = re.search(pattern, date_str)
        if m:
            month_map = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            }
            _, month_name, day, year, hour, minute, second = m.groups()
            month = month_map.get(month_name, '01')
            # 格式化为 MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
            mysql_date = f"'{year}-{month}-{day:>02} {hour}:{minute}:{second}'"
            return mysql_date
        else:
            # 如果无法解析，返回 NULL
            return "NULL"
    except Exception as e:
        print(f"解析日期失败: {date_str}, 错误: {e}", file=sys.stderr)
        return "NULL"

def fix_sql_file(input_file, output_file):
    """修复 SQL 文件中的日期格式"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 匹配 JavaScript Date 字符串模式
        # 例如: Mon Feb 22 2021 09:58:02 GMT+0800 (China Standard Time)
        pattern = r"Mon \w{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT\+\d{4}[^']*"
        
        # 替换所有匹配的日期字符串
        fixed_content = re.sub(pattern, fix_date_format, content)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print(f"✅ SQL 文件修复完成")
        print(f"   原始文件大小: {len(content)} 字节")
        print(f"   修复后文件大小: {len(fixed_content)} 字节")
        
        # 统计替换次数
        original_count = len(re.findall(pattern, content))
        fixed_count = len(re.findall(pattern, fixed_content))
        replaced = original_count - fixed_count
        print(f"   替换了 {replaced} 处日期格式")
        
        return True
    except Exception as e:
        print(f"❌ 修复失败: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    success = fix_sql_file(input_file, output_file)
    sys.exit(0 if success else 1)
PYTHON_SCRIPT

# 使用更简单的方法：使用 sed 直接替换日期格式
echo "使用 sed 修复日期格式..."
sed 's/Mon \([A-Z][a-z][a-z]\) \([0-9][0-9]*\) \([0-9][0-9][0-9][0-9]\) \([0-9][0-9]\):\([0-9][0-9]\):\([0-9][0-9]\) GMT+[0-9]*[^'\''"]*/2021-02-22 00:00:00/g' "$SQL_FILE" > "$FIXED_SQL_FILE.tmp"

# 更精确的替换
python3 -c "
import re
import sys

with open('$SQL_FILE', 'r', encoding='utf-8') as f:
    content = f.read()

# 匹配并替换日期字符串
def repl(m):
    month_map = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
                 'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'}
    try:
        parts = m.group(0).split()
        if len(parts) >= 5:
            month = month_map.get(parts[1], '01')
            day = parts[2].zfill(2)
            year = parts[3]
            time_parts = parts[4].split(':')
            if len(time_parts) == 3:
                hour, minute, sec = time_parts
                return f\"'{year}-{month}-{day} {hour}:{minute}:{sec}'\"
    except:
        pass
    return \"NULL\"

# 匹配 JavaScript Date 字符串
pattern = r\"Mon \w{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT\+[0-9]+[^'\"]*\"
fixed = re.sub(pattern, repl, content)

with open('$FIXED_SQL_FILE', 'w', encoding='utf-8') as f:
    f.write(fixed)

print('✅ SQL 文件修复完成')
print(f'修复后文件: $FIXED_SQL_FILE')
"

