/**
 * 为已有资源补充 auto_meta_result 数据
 * 第一阶段：从 resource 原始字段生成结构化 auto_meta_result JSON
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// 年级数字映射
const gradeNumberMap = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
  '七': 7, '八': 8, '九': 9, '十': 10,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9
};

/**
 * 从 grade 字符串中提取年级数字
 * 例如："三年级下册" → 3
 */
function extractGradeNumber(grade) {
  if (!grade) return null;
  
  // 尝试匹配中文数字
  for (const [chinese, num] of Object.entries(gradeNumberMap)) {
    if (grade.includes(chinese + '年级') || grade.startsWith(chinese)) {
      return num;
    }
  }
  
  // 尝试匹配阿拉伯数字
  const match = grade.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * 从 grade 字符串中提取年级文本
 * 例如："三年级下册" → "三年级"
 */
function extractGrade(grade) {
  if (!grade) return null;
  
  // 匹配 "X年级" 格式
  const match = grade.match(/([一二三四五六七八九十\d]+年级)/);
  if (match) {
    return match[1];
  }
  
  // 如果没有匹配到，尝试提取前几个字符
  if (grade.length >= 3) {
    return grade.substring(0, 3);
  }
  
  return grade;
}

/**
 * 从 grade 字符串中提取册别
 * 例如："三年级下册" → "下册"
 */
function extractVolume(grade) {
  if (!grade) return null;
  
  if (grade.includes('上册')) {
    return '上册';
  }
  if (grade.includes('下册')) {
    return '下册';
  }
  if (grade.includes('全一册')) {
    return '全一册';
  }
  
  return null;
}

/**
 * 判断学段
 * 年级 ≤ 6 → elementary（小学）
 * 年级 ≥ 7 → junior（初中）
 */
function getEducationLevel(gradeNumber) {
  if (!gradeNumber) return 'elementary'; // 默认小学
  return gradeNumber <= 6 ? 'elementary' : 'junior';
}

/**
 * 解析 chapter_info 为 structure 数组
 * 简单解析：尝试提取单元和标题信息
 */
function parseChapterInfo(chapterInfo) {
  if (!chapterInfo) return [];
  
  const structure = [];
  
  // 尝试匹配 "第X单元" 或 "Unit X" 格式
  const unitPattern = /(第[一二三四五六七八九十\d]+单元|Unit\s*\d+)/g;
  const unitMatches = chapterInfo.match(unitPattern);
  
  // 尝试匹配标题（简单提取）
  const titlePattern = /[：:]\s*([^，,。.]+)/g;
  const titleMatches = [...chapterInfo.matchAll(titlePattern)];
  
  if (unitMatches && unitMatches.length > 0) {
    unitMatches.forEach((unit, index) => {
      const title = titleMatches[index] ? titleMatches[index][1] : null;
      structure.push({
        unit: unit,
        title: title || ''
      });
    });
  } else {
    // 如果没有匹配到单元，尝试提取第一行作为标题
    const firstLine = chapterInfo.split(/[，,。.\n]/)[0];
    if (firstLine && firstLine.trim()) {
      structure.push({
        unit: '',
        title: firstLine.trim()
      });
    }
  }
  
  return structure;
}

/**
 * 生成 auto_meta_result JSON
 */
function generateAutoMetaResult(resource) {
  const gradeNumber = extractGradeNumber(resource.grade);
  const grade = extractGrade(resource.grade);
  const volume = extractVolume(resource.grade);
  const educationLevel = getEducationLevel(gradeNumber);
  const structure = parseChapterInfo(resource.chapter_info);
  
  return {
    education_level: educationLevel,
    subject: resource.subject || null,
    grade: grade || null,
    grade_number: gradeNumber,
    volume: volume,
    textbook_version: resource.textbook || null,
    structure: structure
  };
}

/**
 * 主函数
 */
async function main() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    console.log('🚀 开始为已有资源补充 auto_meta_result 数据...\n');
    
    // 查询所有 auto_meta_result 为 NULL 的资源
    const [resources] = await connection.query(`
      SELECT 
        id,
        subject,
        grade,
        textbook,
        chapter_info,
        auto_meta_result
      FROM resource
      WHERE auto_meta_result IS NULL
      ORDER BY id
    `);
    
    console.log(`📊 找到 ${resources.length} 条需要处理的资源\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const failures = [];
    
    // 处理每条资源
    for (const resource of resources) {
      try {
        // 检查是否已有 auto_meta_result（防御性检查）
        if (resource.auto_meta_result) {
          skipCount++;
          continue;
        }
        
        // 生成 auto_meta_result
        const autoMetaResult = generateAutoMetaResult(resource);
        
        // 更新数据库
        await connection.query(
          `UPDATE resource 
           SET auto_meta_result = ?, 
               auto_meta_status = 'done'
           WHERE id = ?`,
          [JSON.stringify(autoMetaResult), resource.id]
        );
        
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`  ✓ 已处理 ${successCount} 条资源...`);
        }
        
      } catch (error) {
        failCount++;
        failures.push({
          id: resource.id,
          subject: resource.subject,
          grade: resource.grade,
          error: error.message
        });
        
        if (failures.length <= 3) {
          console.error(`  ✗ 资源 ID ${resource.id} 处理失败: ${error.message}`);
        }
      }
    }
    
    // 输出统计结果
    console.log('\n' + '='.repeat(60));
    console.log('📈 处理结果统计');
    console.log('='.repeat(60));
    console.log(`总资源数: ${resources.length}`);
    console.log(`✓ 成功写入: ${successCount} 条`);
    console.log(`⊘ 跳过（已有 auto_meta_result）: ${skipCount} 条`);
    console.log(`✗ 失败: ${failCount} 条`);
    
    if (failures.length > 0) {
      console.log('\n失败样例（前3个）:');
      failures.slice(0, 3).forEach((failure, index) => {
        console.log(`  ${index + 1}. ID: ${failure.id}, subject: ${failure.subject || 'NULL'}, grade: ${failure.grade || 'NULL'}`);
        console.log(`     错误: ${failure.error}`);
      });
    }
    
    console.log('\n✅ 处理完成！\n');
    
  } catch (error) {
    console.error('❌ 处理过程中发生错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行主函数
main();

