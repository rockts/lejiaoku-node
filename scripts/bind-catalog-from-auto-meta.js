/**
 * 第二阶段：从 auto_meta_result 批量生成 catalog_info
 * 为已有 auto_meta_result 的资源绑定标准教材目录（textbook_catalog）
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * 从 resource_textbook_map 检查资源是否已绑定教材目录
 */
async function isResourceBound(connection, resourceId) {
  const [results] = await connection.query(
    'SELECT COUNT(*) as count FROM resource_textbook_map WHERE resource_id = ?',
    [resourceId]
  );
  return results[0].count > 0;
}

/**
 * 从 textbook_catalog 表中匹配标准教材目录
 * 返回匹配的 catalog_id 数组
 * 注意：由于字符编码问题，使用 BINARY 比较确保精确匹配
 */
async function matchTextbookCatalog(connection, autoMetaResult) {
  const {
    education_level,
    subject,
    grade_number,
    volume,
    textbook_version
  } = autoMetaResult;

  // 构建查询条件 - 使用 BINARY 确保精确匹配（处理字符编码问题）
  let sql = `
    SELECT id, education_level, grade, subject, textbook_version, volume
    FROM textbook_catalog
    WHERE education_level = ?
      AND BINARY subject = ?
      AND grade = ?
  `;
  const params = [education_level, subject, String(grade_number)];

  // 如果 volume 存在，添加到查询条件
  if (volume) {
    sql += ' AND BINARY volume = ?';
    params.push(volume);
  }

  // 如果 textbook_version 存在，添加到查询条件
  if (textbook_version) {
    sql += ' AND BINARY textbook_version = ?';
    params.push(textbook_version);
  }

  const [results] = await connection.query(sql, params);
  return results;
}

/**
 * 绑定资源到教材目录
 */
async function bindResourceToCatalog(connection, resourceId, catalogId) {
  // 检查是否已绑定（幂等性）
  const [existing] = await connection.query(
    'SELECT id FROM resource_textbook_map WHERE resource_id = ? AND textbook_catalog_id = ?',
    [resourceId, catalogId]
  );

  if (existing.length > 0) {
    return false; // 已绑定，跳过
  }

  // 插入绑定关系
  await connection.query(
    `INSERT INTO resource_textbook_map 
     (resource_id, textbook_catalog_id, source, created_at)
     VALUES (?, ?, 'auto_meta', NOW())`,
    [resourceId, catalogId]
  );

  return true; // 绑定成功
}

/**
 * 获取 catalog_info（标准结构）
 */
function getCatalogInfo(catalog) {
  return {
    education_level: catalog.education_level,
    grade: catalog.grade,
    subject: catalog.subject,
    textbook_version: catalog.textbook_version,
    volume: catalog.volume
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

    console.log('🚀 开始从 auto_meta_result 批量生成 catalog_info...\n');

    // 查询所有有 auto_meta_result 但未绑定 catalog 的资源
    const [resources] = await connection.query(`
      SELECT 
        r.id,
        r.auto_meta_result
      FROM resource r
      WHERE r.auto_meta_result IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 
          FROM resource_textbook_map rtm 
          WHERE rtm.resource_id = r.id
        )
      ORDER BY r.id
    `);

    console.log(`📊 找到 ${resources.length} 条需要处理的资源\n`);

    let successCount = 0;
    let skipCount = 0;
    let noMatchCount = 0;
    let multipleMatchCount = 0;
    const noMatches = [];
    const multipleMatches = [];

    // 处理每条资源
    for (const resource of resources) {
      try {
        // 检查是否已绑定（防御性检查）
        const isBound = await isResourceBound(connection, resource.id);
        if (isBound) {
          skipCount++;
          continue;
        }

        // 解析 auto_meta_result
        let autoMetaResult;
        try {
          autoMetaResult = JSON.parse(resource.auto_meta_result);
        } catch (e) {
          noMatchCount++;
          noMatches.push({
            id: resource.id,
            reason: `auto_meta_result 解析失败: ${e.message}`
          });
          continue;
        }

        // 验证必要字段
        if (!autoMetaResult.education_level || 
            !autoMetaResult.subject || 
            !autoMetaResult.grade_number) {
          noMatchCount++;
          noMatches.push({
            id: resource.id,
            reason: `缺少必要字段: education_level=${autoMetaResult.education_level}, subject=${autoMetaResult.subject}, grade_number=${autoMetaResult.grade_number}`
          });
          continue;
        }

        // 匹配教材目录
        const matchedCatalogs = await matchTextbookCatalog(connection, autoMetaResult);

        if (matchedCatalogs.length === 0) {
          // 无匹配
          noMatchCount++;
          noMatches.push({
            id: resource.id,
            subject: autoMetaResult.subject,
            grade: autoMetaResult.grade,
            grade_number: autoMetaResult.grade_number,
            volume: autoMetaResult.volume,
            textbook_version: autoMetaResult.textbook_version,
            reason: '未找到匹配的教材目录'
          });
        } else if (matchedCatalogs.length === 1) {
          // 唯一匹配，绑定
          const catalogId = matchedCatalogs[0].id;
          const bound = await bindResourceToCatalog(connection, resource.id, catalogId);
          
          if (bound) {
            successCount++;
            if (successCount % 10 === 0) {
              console.log(`  ✓ 已绑定 ${successCount} 条资源...`);
            }
          } else {
            skipCount++;
          }
        } else {
          // 多匹配，记录歧义
          multipleMatchCount++;
          multipleMatches.push({
            id: resource.id,
            subject: autoMetaResult.subject,
            grade: autoMetaResult.grade,
            grade_number: autoMetaResult.grade_number,
            volume: autoMetaResult.volume,
            textbook_version: autoMetaResult.textbook_version,
            matched_count: matchedCatalogs.length,
            matched_catalogs: matchedCatalogs.map(c => ({
              id: c.id,
              education_level: c.education_level,
              grade: c.grade,
              subject: c.subject,
              textbook_version: c.textbook_version,
              volume: c.volume
            }))
          });
        }

      } catch (error) {
        noMatchCount++;
        noMatches.push({
          id: resource.id,
          reason: `处理失败: ${error.message}`
        });
      }
    }

    // 输出统计结果
    console.log('\n' + '='.repeat(60));
    console.log('📈 处理结果统计');
    console.log('='.repeat(60));
    console.log(`总扫描资源数: ${resources.length}`);
    console.log(`✓ 成功绑定: ${successCount} 条`);
    console.log(`⊘ 跳过（已有 catalog_info）: ${skipCount} 条`);
    console.log(`✗ 无匹配: ${noMatchCount} 条`);
    console.log(`⚠️  多匹配（歧义）: ${multipleMatchCount} 条`);

    if (noMatches.length > 0) {
      console.log('\n无匹配样例（前3个）:');
      noMatches.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}`);
        if (item.subject) {
          console.log(`     subject: ${item.subject}, grade: ${item.grade || item.grade_number}, volume: ${item.volume || 'NULL'}, textbook_version: ${item.textbook_version || 'NULL'}`);
        }
        console.log(`     原因: ${item.reason}`);
      });
    }

    if (multipleMatches.length > 0) {
      console.log('\n多匹配样例（前3个）:');
      multipleMatches.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}`);
        console.log(`     subject: ${item.subject}, grade: ${item.grade || item.grade_number}, volume: ${item.volume || 'NULL'}, textbook_version: ${item.textbook_version || 'NULL'}`);
        console.log(`     匹配到 ${item.matched_count} 条教材目录:`);
        item.matched_catalogs.forEach((catalog, i) => {
          console.log(`       ${i + 1}. ID: ${catalog.id}, ${catalog.education_level}/${catalog.grade}/${catalog.subject}/${catalog.textbook_version}/${catalog.volume}`);
        });
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

