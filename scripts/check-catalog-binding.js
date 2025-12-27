/**
 * 检查资源与教材目录的绑定情况
 * 用于诊断为什么资源不显示在 catalog 页面
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

async function checkCatalogBinding() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功\n');

    const catalogId = 3656;
    
    // 1. 检查 catalog 是否存在
    console.log(`📋 检查教材目录 ${catalogId} 是否存在...`);
    const [catalogData] = await connection.query(
      'SELECT * FROM textbook_catalog WHERE id = ?',
      [catalogId]
    );
    
    if (!catalogData || catalogData.length === 0) {
      console.log(`❌ 教材目录 ${catalogId} 不存在！`);
      return;
    }
    
    const catalog = catalogData[0];
    console.log(`✅ 教材目录存在:`);
    console.log(`   - 学段: ${catalog.education_level}`);
    console.log(`   - 学科: ${catalog.subject}`);
    console.log(`   - 年级: ${catalog.grade}`);
    console.log(`   - 册别: ${catalog.volume}`);
    console.log(`   - 版本: ${catalog.textbook_version}\n`);

    // 2. 检查绑定到该 catalog 的所有资源
    console.log(`🔗 检查绑定到 catalog ${catalogId} 的资源...`);
    const [bindings] = await connection.query(
      `SELECT 
        m.resource_id,
        m.textbook_catalog_id,
        m.source,
        m.created_at as binding_created_at,
        r.id,
        r.title,
        r.status,
        r.unit,
        r.unit_index,
        r.file_format,
        r.category,
        r.subject,
        r.grade,
        r.textbook,
        r.created_at
      FROM resource_textbook_map m
      INNER JOIN resource r ON r.id = m.resource_id
      WHERE m.textbook_catalog_id = ?
      ORDER BY r.created_at DESC`,
      [catalogId]
    );
    
    console.log(`📊 找到 ${bindings.length} 个绑定资源:\n`);
    
    if (bindings.length === 0) {
      console.log('❌ 没有资源绑定到该 catalog！');
      console.log('   可能原因：');
      console.log('   1. 资源编辑时绑定操作失败');
      console.log('   2. 资源被解绑了');
      console.log('   3. 绑定到了错误的 catalog_id\n');
    } else {
      bindings.forEach((binding, index) => {
        console.log(`${index + 1}. 资源 ID: ${binding.resource_id}`);
        console.log(`   标题: ${binding.title}`);
        console.log(`   状态: ${binding.status}`);
        console.log(`   单元: ${binding.unit || '(空)'}`);
        console.log(`   单元索引: ${binding.unit_index || '(空)'}`);
        console.log(`   文件格式: ${binding.file_format}`);
        console.log(`   分类: ${binding.category}`);
        console.log(`   绑定来源: ${binding.source}`);
        console.log(`   创建时间: ${binding.created_at}`);
        console.log('');
      });
    }

    // 3. 检查查询逻辑（模拟前端查询）
    console.log(`🔍 模拟前端查询逻辑...`);
    console.log(`   查询条件: catalog_id=${catalogId}, status=approved, 排除视频\n`);
    
    const [queryResult] = await connection.query(
      `SELECT DISTINCT
        r.id,
        r.title,
        r.status,
        r.unit,
        r.unit_index,
        r.file_format,
        r.category
      FROM resource r
      INNER JOIN resource_textbook_map m ON m.resource_id = r.id
      INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
      WHERE 
        c.id = ?
        AND r.file_format NOT IN ('视频', 'VIDEO')
        AND r.category NOT IN ('视频')
      ORDER BY 
        CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
        r.unit_index ASC,
        r.created_at DESC
      LIMIT 1000`,
      [catalogId]
    );
    
    console.log(`📊 查询结果（不限制状态）: ${queryResult.length} 个资源\n`);
    
    if (queryResult.length === 0) {
      console.log('❌ 查询返回空结果！');
      console.log('   可能原因：');
      console.log('   1. 所有资源都是视频格式');
      console.log('   2. JOIN 条件不匹配');
      console.log('   3. 资源状态问题\n');
    } else {
      console.log('✅ 找到的资源:');
      queryResult.forEach((resource, index) => {
        console.log(`   ${index + 1}. ID: ${resource.id}, 标题: ${resource.title}, 状态: ${resource.status}, 单元: ${resource.unit || '(空)'}`);
      });
      console.log('');
    }

    // 4. 检查已审核的资源
    console.log(`✅ 检查已审核的资源（status='approved'）...\n`);
    const [approvedResult] = await connection.query(
      `SELECT DISTINCT
        r.id,
        r.title,
        r.status,
        r.unit,
        r.unit_index
      FROM resource r
      INNER JOIN resource_textbook_map m ON m.resource_id = r.id
      INNER JOIN textbook_catalog c ON c.id = m.textbook_catalog_id
      WHERE 
        c.id = ?
        AND r.status = 'approved'
        AND r.file_format NOT IN ('视频', 'VIDEO')
        AND r.category NOT IN ('视频')
      ORDER BY 
        CASE WHEN r.unit_index IS NULL THEN 1 ELSE 0 END,
        r.unit_index ASC,
        r.created_at DESC
      LIMIT 1000`,
      [catalogId]
    );
    
    console.log(`📊 已审核资源数量: ${approvedResult.length}\n`);
    
    if (approvedResult.length === 0) {
      console.log('⚠️  没有已审核的资源！');
      console.log('   可能原因：');
      console.log('   1. 资源状态不是 "approved"');
      console.log('   2. 需要检查资源状态并审核\n');
      
      // 显示所有状态
      const [statusCount] = await connection.query(
        `SELECT r.status, COUNT(*) as count
         FROM resource r
         INNER JOIN resource_textbook_map m ON m.resource_id = r.id
         WHERE m.textbook_catalog_id = ?
         GROUP BY r.status`,
        [catalogId]
      );
      
      console.log('   资源状态统计:');
      statusCount.forEach((stat) => {
        console.log(`     - ${stat.status}: ${stat.count} 个`);
      });
      console.log('');
    } else {
      console.log('✅ 已审核的资源:');
      approvedResult.forEach((resource, index) => {
        console.log(`   ${index + 1}. ID: ${resource.id}, 标题: ${resource.title}, 单元: ${resource.unit || '(空)'}`);
      });
    }

    // 5. 总结
    console.log('\n📝 诊断总结:');
    console.log(`   - Catalog ${catalogId} 存在: ✅`);
    console.log(`   - 绑定资源总数: ${bindings.length}`);
    console.log(`   - 查询结果（不限制状态）: ${queryResult.length}`);
    console.log(`   - 已审核资源: ${approvedResult.length}`);
    
    if (approvedResult.length === 0 && bindings.length > 0) {
      console.log('\n⚠️  问题诊断: 资源已绑定，但状态不是 "approved"');
      console.log('   解决方案: 需要审核资源，将状态改为 "approved"');
    } else if (bindings.length === 0) {
      console.log('\n⚠️  问题诊断: 没有资源绑定到该 catalog');
      console.log('   解决方案: 需要重新绑定资源到 catalog');
    } else if (approvedResult.length > 0) {
      console.log('\n✅ 资源应该可以正常显示！');
      console.log('   如果前端仍不显示，请检查：');
      console.log('   1. 前端 API 请求是否正确');
      console.log('   2. 前端过滤逻辑是否正确');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCatalogBinding();

