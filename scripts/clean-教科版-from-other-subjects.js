/**
 * 清理脚本：删除"教科版"在其他学科中的数据
 * 规则：教科版只能用于"科学"学科
 * 
 * 使用方法：
 * node scripts/clean-教科版-from-other-subjects.js
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const mysql = require('mysql2/promise');

const connectionConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ravent',
  charset: 'utf8mb4'
};

async function clean教科版() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功\n');

    // 1. 查找所有"教科版"的记录（除了"科学"学科）
    console.log('🔍 查找需要删除的记录...');
    const [records] = await connection.query(`
      SELECT id, education_level, grade, subject, textbook_version, volume
      FROM textbook_catalog
      WHERE textbook_version = '教科版' AND subject != '科学'
      ORDER BY education_level, grade, subject
    `);

    console.log(`📊 找到 ${records.length} 条需要删除的记录（教科版但学科不是"科学"）\n`);

    if (records.length === 0) {
      console.log('✅ 没有需要清理的数据');
      return;
    }

    // 2. 显示要删除的记录
    console.log('📋 要删除的记录：');
    records.forEach((record, index) => {
      const levelName = record.education_level === 'elementary' ? '小学' : '初中';
      console.log(`  ${index + 1}. ${levelName} ${record.grade}年级 ${record.subject} ${record.textbook_version} ${record.volume} (ID: ${record.id})`);
    });
    console.log('');

    // 3. 检查这些 catalog 是否有绑定的资源
    console.log('🔍 检查这些 catalog 是否有绑定的资源...');
    const catalogIds = records.map(r => r.id);
    const placeholders = catalogIds.map(() => '?').join(',');
    
    const [bindings] = await connection.query(`
      SELECT 
        m.textbook_catalog_id,
        COUNT(*) as resource_count
      FROM resource_textbook_map m
      WHERE m.textbook_catalog_id IN (${placeholders})
      GROUP BY m.textbook_catalog_id
    `, catalogIds);

    if (bindings.length > 0) {
      console.log(`⚠️  警告：有 ${bindings.length} 个 catalog 已绑定资源！`);
      bindings.forEach(b => {
        const catalog = records.find(r => r.id === b.textbook_catalog_id);
        const levelName = catalog.education_level === 'elementary' ? '小学' : '初中';
        console.log(`  - ${levelName} ${catalog.grade}年级 ${catalog.subject} ${catalog.textbook_version} ${catalog.volume}: ${b.resource_count} 个资源`);
      });
      console.log('\n⚠️  如果删除这些 catalog，已绑定的资源将失去绑定关系！');
      console.log('   建议：先重新绑定这些资源到正确的 catalog，然后再删除。\n');
    } else {
      console.log('✅ 这些 catalog 都没有绑定资源，可以安全删除\n');
    }

    // 4. 执行删除
    console.log('🗑️  开始删除...');
    const [deleteResult] = await connection.query(`
      DELETE FROM textbook_catalog
      WHERE textbook_version = '教科版' AND subject != '科学'
    `);

    console.log(`✅ 成功删除 ${deleteResult.affectedRows} 条记录\n`);

    // 5. 验证删除结果
    console.log('🔍 验证删除结果...');
    const [remaining] = await connection.query(`
      SELECT COUNT(*) as count
      FROM textbook_catalog
      WHERE textbook_version = '教科版' AND subject != '科学'
    `);

    if (remaining[0].count === 0) {
      console.log('✅ 验证通过：所有不符合规则的记录已删除');
    } else {
      console.log(`⚠️  警告：仍有 ${remaining[0].count} 条不符合规则的记录`);
    }

    // 6. 显示剩余的"教科版"记录（应该只有"科学"学科）
    const [remaining教科版] = await connection.query(`
      SELECT subject, COUNT(*) as count
      FROM textbook_catalog
      WHERE textbook_version = '教科版'
      GROUP BY subject
    `);

    console.log('\n📊 剩余的"教科版"记录统计：');
    remaining教科版.forEach(r => {
      console.log(`  - ${r.subject}: ${r.count} 条`);
    });

    console.log('\n✅ 清理完成！');

  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clean教科版();

