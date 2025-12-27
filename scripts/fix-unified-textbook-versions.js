/**
 * 修复统一教材版本脚本
 * 
 * 功能：
 * 1. 删除语文、道德与法治、历史三个学科的非部编版数据
 * 2. 为这三个学科添加部编版数据（如果不存在）
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

// 统一部编版的学科
const UNIFIED_SUBJECTS = ['语文', '道德与法治', '历史'];

// 部编版版本名
const UNIFIED_VERSION = '部编版';

async function fixUnifiedTextbookVersions() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('🔍 开始修复统一教材版本...\n');

    // 1. 统计当前数据
    console.log('📊 当前数据统计：');
    for (const subject of UNIFIED_SUBJECTS) {
      const [stats] = await connection.query(
        'SELECT textbook_version, COUNT(*) as count FROM textbook_catalog WHERE subject = ? GROUP BY textbook_version ORDER BY textbook_version',
        [subject]
      );
      console.log(`\n${subject}:`);
      stats.forEach(stat => {
        console.log(`  - ${stat.textbook_version}: ${stat.count} 条`);
      });
    }

    // 2. 删除非部编版数据
    console.log('\n🗑️  删除非部编版数据...');
    for (const subject of UNIFIED_SUBJECTS) {
      const [result] = await connection.query(
        'DELETE FROM textbook_catalog WHERE subject = ? AND textbook_version != ?',
        [subject, UNIFIED_VERSION]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✅ 删除 ${subject} 的非部编版数据: ${result.affectedRows} 条`);
      }
    }

    // 3. 检查并添加部编版数据
    console.log('\n➕ 检查并添加部编版数据...');
    
    // 学段和年级定义
    const educationLevels = [
      { key: 'elementary', grades: ['1', '2', '3', '4', '5', '6'] },
      { key: 'middle', grades: ['7', '8', '9'] }
    ];
    
    const volumes = ['上册', '下册'];
    
    let addedCount = 0;
    for (const subject of UNIFIED_SUBJECTS) {
      // 确定该学科属于哪些学段
      let levels = [];
      if (subject === '历史') {
        // 历史只有初中
        levels = [{ key: 'middle', grades: ['7', '8', '9'] }];
      } else {
        // 语文和道德与法治有小学和初中
        levels = educationLevels;
      }
      
      for (const level of levels) {
        for (const grade of level.grades) {
          for (const volume of volumes) {
            // 检查是否已存在
            const [existing] = await connection.query(
              'SELECT id FROM textbook_catalog WHERE education_level = ? AND grade = ? AND subject = ? AND textbook_version = ? AND volume = ?',
              [level.key, grade, subject, UNIFIED_VERSION, volume]
            );
            
            if (existing.length === 0) {
              // 不存在，插入
              await connection.query(
                'INSERT INTO textbook_catalog (education_level, grade, subject, textbook_version, volume) VALUES (?, ?, ?, ?, ?)',
                [level.key, grade, subject, UNIFIED_VERSION, volume]
              );
              addedCount++;
            }
          }
        }
      }
    }
    
    if (addedCount > 0) {
      console.log(`  ✅ 添加了 ${addedCount} 条部编版数据`);
    } else {
      console.log('  ℹ️  所有部编版数据已存在');
    }

    // 4. 统计修复后的数据
    console.log('\n📊 修复后数据统计：');
    for (const subject of UNIFIED_SUBJECTS) {
      const [stats] = await connection.query(
        'SELECT textbook_version, COUNT(*) as count FROM textbook_catalog WHERE subject = ? GROUP BY textbook_version',
        [subject]
      );
      console.log(`\n${subject}:`);
      stats.forEach(stat => {
        console.log(`  - ${stat.textbook_version}: ${stat.count} 条`);
      });
    }

    console.log('\n✅ 修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行修复
fixUnifiedTextbookVersions()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

