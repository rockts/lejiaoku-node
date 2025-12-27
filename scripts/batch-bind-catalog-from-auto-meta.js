/**
 * 批量将 auto_meta_result 固化为教材目录绑定
 * 
 * 功能：
 * 1. 遍历所有 status='approved' 的资源
 * 2. 对每条资源使用 auto_meta_result 匹配 textbook_catalog
 * 3. 写入 resource_textbook_map（source='ai'）
 * 4. 幂等性保证：重复执行不插入重复记录
 * 
 * 使用方法：
 * node scripts/batch-bind-catalog-from-auto-meta.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 创建数据库连接
 */
function createConnection() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ravent',
  });
}

/**
 * 将中文年级转换为数字年级（用于匹配 textbook_catalog 表）
 * 例如："二年级" -> "2", "一年级" -> "1"
 */
function convertGradeToNumber(grade) {
  if (typeof grade === 'number') {
    return String(grade);
  }
  
  const gradeMap = {
    '一年级': '1',
    '二年级': '2',
    '三年级': '3',
    '四年级': '4',
    '五年级': '5',
    '六年级': '6',
    '七年级': '7',
    '八年级': '8',
    '九年级': '9',
  };
  
  // 如果已经是数字字符串，直接返回
  if (/^\d+$/.test(String(grade).trim())) {
    return String(grade).trim();
  }
  
  // 尝试从 map 中查找
  if (gradeMap[grade]) {
    return gradeMap[grade];
  }
  
  // 尝试提取数字（如 "2年级" -> "2"）
  const match = String(grade).match(/(\d+)/);
  if (match) {
    return match[1];
  }
  
  // 如果无法转换，返回原值（可能会匹配失败）
  return String(grade);
}

/**
 * 将学段转换为英文格式（用于匹配 textbook_catalog 表）
 * 例如："小学" -> "elementary", "初中" -> "middle"
 * 如果已经是英文格式，直接返回
 */
function convertEducationLevelToEnglish(educationLevel) {
  if (!educationLevel) {
    return educationLevel;
  }
  
  const levelMap = {
    '小学': 'elementary',
    '初中': 'middle',
    'elementary': 'elementary',
    'middle': 'middle',
  };
  
  // 转换为小写后查找
  const normalized = String(educationLevel).trim().toLowerCase();
  const mapped = levelMap[educationLevel] || levelMap[normalized];
  
  if (mapped) {
    return mapped;
  }
  
  // 如果无法转换，返回原值（可能会匹配失败）
  return educationLevel;
}

/**
 * 根据 auto_meta_result 绑定资源到教材目录
 */
async function bindResourceToCatalog(connection, resourceId, autoMetaResult) {
  try {
    // 1. 提取需要的字段
    const education_level = autoMetaResult.education_level;
    const subject = autoMetaResult.subject;
    const grade = autoMetaResult.grade;
    const volume = autoMetaResult.volume;
    const textbook_version = autoMetaResult.textbook_version;
    
    // 2. 检查必要字段是否都存在
    if (!education_level || !subject || !grade || !volume || !textbook_version) {
      console.log(`  ⚠️  资源 ${resourceId} 的 auto_meta_result 缺少必要字段`, {
        education_level,
        subject,
        grade,
        volume,
        textbook_version
      });
      return { success: false, reason: 'missing_fields' };
    }
    
    // 3. 转换格式
    // 3.1 转换 grade 格式（将 "二年级" 转换为 "2"）
    const gradeNumber = convertGradeToNumber(grade);
    // 3.2 转换 education_level 格式（将 "小学" 转换为 "elementary"）
    const educationLevelEnglish = convertEducationLevelToEnglish(education_level);
    
    // 4. 匹配 textbook_catalog 表
    const [catalogData] = await connection.query(
      `SELECT id FROM textbook_catalog 
       WHERE education_level = ? 
       AND subject = ? 
       AND grade = ? 
       AND volume = ? 
       AND textbook_version = ?
       LIMIT 1`,
      [educationLevelEnglish, subject, gradeNumber, volume, textbook_version]
    );
    
    if (!catalogData || !catalogData[0] || !catalogData[0].id) {
      console.log(`  ❌ 资源 ${resourceId} 未找到匹配的教材目录`, {
        education_level,
        education_level_converted: educationLevelEnglish,
        subject,
        grade,
        grade_converted: gradeNumber,
        volume,
        textbook_version
      });
      return { success: false, reason: 'no_match' };
    }
    
    const catalogId = catalogData[0].id;
    
    // 5. 检查是否已经绑定（幂等性）
    const [existingBind] = await connection.query(
      'SELECT id FROM resource_textbook_map WHERE resource_id = ? AND textbook_catalog_id = ?',
      [resourceId, catalogId]
    );
    
    if (existingBind && existingBind[0] && existingBind[0].id) {
      console.log(`  ✓ 资源 ${resourceId} 已绑定到教材目录 ${catalogId}，跳过`);
      return { success: true, skipped: true, catalogId };
    }
    
    // 6. 写入 resource_textbook_map（幂等）
    // 使用 INSERT IGNORE 确保幂等性（假设表有唯一约束）
    const statement = `
      INSERT IGNORE INTO resource_textbook_map (resource_id, textbook_catalog_id, source, created_at)
      VALUES (?, ?, 'ai', CURRENT_TIMESTAMP)
    `;
    
    await connection.query(statement, [resourceId, catalogId]);
    
    console.log(`  ✅ 资源 ${resourceId} 成功绑定到教材目录 ${catalogId}`);
    return { success: true, skipped: false, catalogId };
  } catch (error) {
    console.error(`  ❌ 资源 ${resourceId} 绑定失败:`, error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  let connection;
  
  try {
    console.log('🚀 开始批量绑定教材目录...\n');
    
    // 创建数据库连接
    connection = await createConnection();
    console.log('✓ 数据库连接成功\n');
    
    // 1. 查询所有已审核的资源
    const [resources] = await connection.query(
      `SELECT id, title, auto_meta_result 
       FROM resource 
       WHERE status = 'approved' 
       ORDER BY id ASC`
    );
    
    console.log(`📊 找到 ${resources.length} 条已审核资源\n`);
    
    if (resources.length === 0) {
      console.log('⚠️  没有需要处理的资源');
      return;
    }
    
    // 2. 统计信息
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let noMetaCount = 0;
    let missingFieldsCount = 0;
    let noMatchCount = 0;
    let errorCount = 0;
    
    // 3. 遍历处理每条资源
    for (const resource of resources) {
      console.log(`\n处理资源 ID: ${resource.id} - ${resource.title || '(无标题)'}`);
      
      // 检查是否有 auto_meta_result
      if (!resource.auto_meta_result) {
        console.log('  ⚠️  资源没有 auto_meta_result，跳过');
        noMetaCount++;
        continue;
      }
      
      // 解析 auto_meta_result
      let autoMetaResult;
      try {
        autoMetaResult = typeof resource.auto_meta_result === 'string'
          ? JSON.parse(resource.auto_meta_result)
          : resource.auto_meta_result;
      } catch (error) {
        console.log(`  ❌ 解析 auto_meta_result 失败: ${error.message}`);
        errorCount++;
        continue;
      }
      
      // 执行绑定
      const result = await bindResourceToCatalog(connection, resource.id, autoMetaResult);
      
      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        failedCount++;
        if (result.reason === 'missing_fields') {
          missingFieldsCount++;
        } else if (result.reason === 'no_match') {
          noMatchCount++;
        } else {
          errorCount++;
        }
      }
    }
    
    // 4. 输出统计结果
    console.log('\n' + '='.repeat(50));
    console.log('📈 批量绑定统计结果');
    console.log('='.repeat(50));
    console.log(`总资源数: ${resources.length}`);
    console.log(`✅ 成功绑定: ${successCount}`);
    console.log(`⏭️  已存在跳过: ${skippedCount}`);
    console.log(`❌ 绑定失败: ${failedCount}`);
    console.log(`  - 缺少 auto_meta_result: ${noMetaCount}`);
    console.log(`  - 缺少必要字段: ${missingFieldsCount}`);
    console.log(`  - 未找到匹配目录: ${noMatchCount}`);
    console.log(`  - 其他错误: ${errorCount}`);
    console.log('='.repeat(50));
    console.log('\n✅ 批量绑定完成！');
    
  } catch (error) {
    console.error('\n❌ 批量绑定失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

