/**
 * 清理教材目录数据脚本
 * 
 * 功能：
 * 1. 删除不需要的学科
 * 2. 删除不需要的教材版本
 * 3. 保留指定的学科和版本
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

// 保留的学科配置
const allowedSubjects = {
  elementary: ['语文', '数学', '英语', '道德与法治', '科学', '书法'], // 小学
  middle: ['语文', '数学', '英语', '物理', '化学', '生物', '道德与法治', '历史', '地理'], // 初中
  high: ['语文', '数学', '外语', '思想政治', '历史', '地理', '物理', '化学', '生物', '美术'], // 高中
};

// 保留的教材版本
const allowedVersions = [
  '部编版',
  '人教版',
  '北师大版',
  '苏教版',
  '外研版',
  '教科版',
  '陕旅版',
  '冀教版',
  '粤教版',
  '湘教版',
  '上教版',
  '美术出版社'
];

async function cleanCatalogData() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔍 开始清理教材目录数据...\n');

    // 1. 统计当前数据
    const [currentStats] = await connection.query(`
      SELECT 
        education_level,
        subject,
        COUNT(*) as count
      FROM textbook_catalog
      GROUP BY education_level, subject
      ORDER BY education_level, subject
    `);
    
    console.log('📊 当前数据统计：');
    let totalBefore = 0;
    const statsByLevel = {};
    currentStats.forEach(stat => {
      const level = stat.education_level;
      if (!statsByLevel[level]) {
        statsByLevel[level] = {};
      }
      statsByLevel[level][stat.subject] = stat.count;
      totalBefore += stat.count;
    });
    
    Object.keys(statsByLevel).sort().forEach(level => {
      const levelName = level === 'elementary' ? '小学' : level === 'middle' ? '初中' : '高中';
      console.log(`\n${levelName} (${level}):`);
      Object.keys(statsByLevel[level]).sort().forEach(subject => {
        console.log(`  - ${subject}: ${statsByLevel[level][subject]} 条`);
      });
    });
    console.log(`\n总计: ${totalBefore} 条\n`);

    // 2. 删除不需要的学科
    console.log('🗑️  开始删除不需要的学科...');
    
    // 小学：删除体育、音乐、美术（如果书法不存在，可能需要保留美术，但先删除）
    const elementarySubjectsToDelete = ['体育', '音乐', '美术'];
    for (const subject of elementarySubjectsToDelete) {
      const [result] = await connection.query(
        'DELETE FROM textbook_catalog WHERE education_level = ? AND subject = ?',
        ['elementary', subject]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅ 删除小学 ${subject}: ${result.affectedRows} 条`);
      }
    }

    // 初中：删除体育、音乐、美术
    const middleSubjectsToDelete = ['体育', '音乐', '美术'];
    for (const subject of middleSubjectsToDelete) {
      const [result] = await connection.query(
        'DELETE FROM textbook_catalog WHERE education_level = ? AND subject = ?',
        ['middle', subject]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅ 删除初中 ${subject}: ${result.affectedRows} 条`);
      }
    }

    // 3. 删除不需要的版本
    console.log('\n🗑️  开始删除不需要的版本...');
    
    const [allVersions] = await connection.query(`
      SELECT DISTINCT textbook_version 
      FROM textbook_catalog 
      WHERE textbook_version IS NOT NULL AND textbook_version != ''
    `);
    
    const versionsToDelete = allVersions
      .map(v => v.textbook_version)
      .filter(v => !allowedVersions.includes(v));
    
    for (const version of versionsToDelete) {
      const [result] = await connection.query(
        'DELETE FROM textbook_catalog WHERE textbook_version = ?',
        [version]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅ 删除版本 ${version}: ${result.affectedRows} 条`);
      }
    }

    // 4. 处理学科名称映射（如果需要）
    // 高中：外语 -> 英语（如果数据库中是"英语"）
    // 高中：思想政治 -> 道德与法治（如果数据库中是"道德与法治"）
    console.log('\n🔄 处理学科名称映射...');
    
    // 检查是否有高中的数据
    const [highSchoolCheck] = await connection.query(
      'SELECT COUNT(*) as count FROM textbook_catalog WHERE education_level = ?',
      ['high']
    );
    
    if (highSchoolCheck[0].count === 0) {
      console.log('  ℹ️  数据库中没有高中数据，跳过映射');
    } else {
      // 如果有高中数据，可能需要将"英语"改为"外语"，"道德与法治"改为"思想政治"
      // 但这里先不处理，因为用户可能还没有高中的数据
      console.log('  ℹ️  高中数据映射暂不处理（如需处理请手动执行）');
    }

    // 5. 统计清理后的数据
    const [afterStats] = await connection.query(`
      SELECT 
        education_level,
        subject,
        COUNT(*) as count
      FROM textbook_catalog
      GROUP BY education_level, subject
      ORDER BY education_level, subject
    `);
    
    console.log('\n📊 清理后数据统计：');
    let totalAfter = 0;
    const afterStatsByLevel = {};
    afterStats.forEach(stat => {
      const level = stat.education_level;
      if (!afterStatsByLevel[level]) {
        afterStatsByLevel[level] = {};
      }
      afterStatsByLevel[level][stat.subject] = stat.count;
      totalAfter += stat.count;
    });
    
    Object.keys(afterStatsByLevel).sort().forEach(level => {
      const levelName = level === 'elementary' ? '小学' : level === 'middle' ? '初中' : '高中';
      console.log(`\n${levelName} (${level}):`);
      Object.keys(afterStatsByLevel[level]).sort().forEach(subject => {
        console.log(`  - ${subject}: ${afterStatsByLevel[level][subject]} 条`);
      });
    });
    
    console.log(`\n总计: ${totalAfter} 条`);
    console.log(`\n✅ 清理完成！删除了 ${totalBefore - totalAfter} 条记录`);

    // 6. 显示保留的版本
    const [remainingVersions] = await connection.query(`
      SELECT DISTINCT textbook_version 
      FROM textbook_catalog 
      WHERE textbook_version IS NOT NULL AND textbook_version != ''
      ORDER BY textbook_version
    `);
    
    console.log('\n📚 保留的教材版本：');
    remainingVersions.forEach(v => {
      console.log(`  - ${v.textbook_version}`);
    });

  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行清理
cleanCatalogData()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

