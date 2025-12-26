/**
 * 资源单元字段迁移脚本
 * 从 chapter_info 和 auto_meta_result 中提取 unit 信息，填充到 resource.unit 字段
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * 从 chapter_info 中提取单元信息
 * 例如："第一单元 春天来了" -> "第一单元"
 */
function extractUnitFromChapterInfo(chapterInfo) {
  if (!chapterInfo) return null;

  // 匹配 "第X单元" 格式
  const unitPattern = /第[一二三四五六七八九十\d]+单元/;
  const match = chapterInfo.match(unitPattern);
  if (match) {
    return match[0];
  }

  // 匹配 "Unit X" 格式
  const unitPattern2 = /Unit\s*\d+/i;
  const match2 = chapterInfo.match(unitPattern2);
  if (match2) {
    return match2[0];
  }

  return null;
}

/**
 * 从单元文本中提取序号
 * 例如："第一单元" -> 1, "Unit 2" -> 2
 */
function extractUnitIndex(unit) {
  if (!unit) return null;

  // 中文数字映射
  const chineseNumberMap = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '七': 7, '八': 8, '九': 9, '十': 10
  };

  // 匹配 "第X单元" 格式
  const match = unit.match(/第([一二三四五六七八九十\d]+)单元/);
  if (match) {
    const num = match[1];
    if (chineseNumberMap[num]) {
      return chineseNumberMap[num];
    }
    const digit = parseInt(num, 10);
    if (!isNaN(digit)) {
      return digit;
    }
  }

  // 匹配 "Unit X" 格式
  const match2 = unit.match(/Unit\s*(\d+)/i);
  if (match2) {
    return parseInt(match2[1], 10);
  }

  return null;
}

/**
 * 从 auto_meta_result.structure 中提取单元信息
 */
function extractUnitFromAutoMeta(autoMetaResult) {
  if (!autoMetaResult) return null;

  try {
    const meta = typeof autoMetaResult === 'string' 
      ? JSON.parse(autoMetaResult) 
      : autoMetaResult;

    if (meta.structure && Array.isArray(meta.structure) && meta.structure.length > 0) {
      // 取第一个 structure 的 unit
      const firstStructure = meta.structure[0];
      if (firstStructure.unit) {
        return firstStructure.unit;
      }
    }
  } catch (e) {
    // 解析失败，忽略
  }

  return null;
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

    console.log('🚀 开始迁移资源单元字段...\n');

    // 查询所有 unit 为空的资源
    const [resources] = await connection.query(`
      SELECT 
        id,
        chapter_info,
        auto_meta_result,
        unit
      FROM resource
      WHERE unit IS NULL OR unit = ''
      ORDER BY id
    `);

    console.log(`📊 找到 ${resources.length} 条需要处理的资源\n`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // 处理每条资源
    for (const resource of resources) {
      try {
        // 如果已有 unit，跳过（幂等性）
        if (resource.unit) {
          skipCount++;
          continue;
        }

        let unit = null;
        let unitIndex = null;

        // 优先级 1: 从 auto_meta_result.structure 提取
        if (resource.auto_meta_result) {
          unit = extractUnitFromAutoMeta(resource.auto_meta_result);
        }

        // 优先级 2: 从 chapter_info 中解析
        if (!unit && resource.chapter_info) {
          unit = extractUnitFromChapterInfo(resource.chapter_info);
        }

        // 如果提取到 unit，计算 unit_index
        if (unit) {
          unitIndex = extractUnitIndex(unit);
        }

        // 更新数据库
        if (unit) {
          await connection.query(
            `UPDATE resource 
             SET unit = ?, unit_index = ?
             WHERE id = ?`,
            [unit, unitIndex, resource.id]
          );
          successCount++;

          if (successCount % 10 === 0) {
            console.log(`  ✓ 已处理 ${successCount} 条资源...`);
          }
        } else {
          skipCount++;
        }

      } catch (error) {
        failCount++;
        console.error(`  ✗ 资源 ID ${resource.id} 处理失败: ${error.message}`);
      }
    }

    // 输出统计结果
    console.log('\n' + '='.repeat(60));
    console.log('📈 迁移结果统计');
    console.log('='.repeat(60));
    console.log(`总资源数: ${resources.length}`);
    console.log(`✓ 成功填充 unit: ${successCount} 条`);
    console.log(`⊘ 跳过（已有 unit 或无法提取）: ${skipCount} 条`);
    console.log(`✗ 失败: ${failCount} 条`);
    console.log('\n✅ 迁移完成！\n');

  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行主函数
main();

