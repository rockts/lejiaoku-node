#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 SQL 文件中的日期格式
将 JavaScript Date 字符串转换为 MySQL DATETIME 格式
"""

import re
import sys
from pathlib import Path

def fix_date_string(date_str):
    """将 JavaScript Date 字符串转换为 MySQL DATETIME 格式"""
    # 月份映射
    month_map = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    
    try:
        # 匹配格式: Mon Feb 22 2021 09:58:02 GMT+0800 (China Standard Time)
        # 提取关键部分（忽略星期几）
        pattern = r'\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})'
        match = re.search(pattern, date_str)
        
        if match:
            month_name, day, year, hour, minute, second = match.groups()
            month = month_map.get(month_name, '01')
            # 格式化为 MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
            mysql_date = f"'{year}-{month}-{day.zfill(2)} {hour}:{minute}:{second}'"
            return mysql_date
        else:
            print(f"警告: 无法解析日期格式: {date_str[:50]}...", file=sys.stderr)
            return "NULL"
    except Exception as e:
        print(f"错误: 解析日期失败: {date_str[:50]}..., 错误: {e}", file=sys.stderr)
        return "NULL"

def fix_sql_file(input_file, output_file):
    """修复 SQL 文件中的日期格式"""
    input_path = Path(input_file)
    output_path = Path(output_file)
    
    if not input_path.exists():
        print(f"错误: 输入文件不存在: {input_file}", file=sys.stderr)
        return False
    
    try:
        # 读取文件
        print(f"读取文件: {input_file}")
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_size = len(content)
        
        # 匹配 JavaScript Date 字符串模式
        # 例如: Mon Feb 22 2021 09:58:02 GMT+0800 (China Standard Time)
        # 匹配所有星期几开头的日期字符串
        pattern = r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \w{3} \d{1,2} \d{4} \d{2}:\d{2}:\d{2} GMT\+[0-9]+[^(]*\([^)]+\)'
        
        # 查找所有匹配
        matches = list(re.finditer(pattern, content))
        print(f"找到 {len(matches)} 个需要修复的日期字符串")
        
        if matches:
            # 从后往前替换，避免索引偏移
            for match in reversed(matches):
                original = match.group(0)
                fixed = fix_date_string(original)
                content = content[:match.start()] + fixed + content[match.end():]
        
        # 写入修复后的文件
        print(f"写入修复后的文件: {output_file}")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        fixed_size = len(content)
        print(f"✅ SQL 文件修复完成")
        print(f"   原始文件大小: {original_size:,} 字节")
        print(f"   修复后文件大小: {fixed_size:,} 字节")
        print(f"   替换了 {len(matches)} 处日期格式")
        
        return True
        
    except Exception as e:
        print(f"错误: 修复失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("用法: python3 fix-sql-dates.py <输入文件> <输出文件>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = fix_sql_file(input_file, output_file)
    sys.exit(0 if success else 1)

