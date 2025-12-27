/**
 * 教材目录骨架生成脚本
 * 
 * 功能：
 * - 生成教材目录的"空骨架"，不包含具体课文
 * - 生成学段、年级、学科、教材版本、册别的所有组合
 * - 可重复执行（避免重复插入）
 * 
 * 使用方法：
 * node scripts/generate-textbook-catalog-skeleton.js
 */

const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 创建数据库连接
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT, 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

// 学段定义
const EDUCATION_LEVELS = [
  { key: 'elementary', name: '小学' },
  { key: 'middle', name: '初中' }
];

// 年级定义（小学1-6，初中7-9）
const GRADES = {
  elementary: ['1', '2', '3', '4', '5', '6'],
  middle: ['7', '8', '9']
};

// 学科定义
const SUBJECTS = [
  '语文',
  '数学',
  '英语',
  '科学',
  '道德与法治',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '音乐',
  '美术',
  '书法练习指导'
];

// 学科与学段的映射（某些学科只属于特定学段）
const SUBJECT_EDUCATION_LEVEL_MAP = {
  '物理': ['middle'],
  '化学': ['middle'],
  '生物': ['middle'],
  '科学': ['elementary'],
  '历史': ['middle'],
  '地理': ['middle'],
  '书法练习指导': ['elementary']
};

// 学科与版本的映射（不同学科有不同的版本）
const SUBJECT_VERSION_MAP = {
  // 统一部编版的学科
  '语文': ['部编版'],
  '道德与法治': ['部编版'],
  '历史': ['部编版'],
  
  // 数学（小学和初中版本不同）
  '数学': {
    elementary: ['人教版', '北师大版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版'],
    middle: ['人教版', '北师大版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  
  // 英语（小学和初中版本不同，且小学从3年级开始）
  '英语': {
    elementary: ['外研版', '人教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版'],
    middle: ['外研版', '人教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  
  // 科学（只有小学，只有教科版）
  '科学': {
    elementary: ['教科版']
  },
  
  // 音乐（小学和初中版本不同）
  '音乐': {
    elementary: ['人教版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版'],
    middle: ['人教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  
  // 美术（小学和初中版本不同）
  '美术': {
    elementary: ['人教版', '苏教版', '美术出版社', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版'],
    middle: ['人教版', '美术出版社', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  
  // 书法练习指导（只有小学，只有美术出版社）
  '书法练习指导': {
    elementary: ['美术出版社']
  },
  
  // 初中学科版本
  '物理': {
    middle: ['人教版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  '化学': {
    middle: ['人教版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  '生物': {
    middle: ['人教版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  },
  '地理': {
    middle: ['人教版', '苏教版', '冀教版', '陕旅版', '上教版', '湘教版', '粤教版']
  }
};

// 英语从3年级开始（小学1-2年级没有英语）
const ENGLISH_START_GRADE = 3;

// 册别定义
const VOLUMES = ['上册', '下册'];

/**
 * 检查学科是否属于指定学段
 */
function isSubjectInEducationLevel(subject, educationLevel) {
  const allowedLevels = SUBJECT_EDUCATION_LEVEL_MAP[subject];
  if (allowedLevels) {
    return allowedLevels.includes(educationLevel);
  }
  // 如果没有限制，则两个学段都有
  return true;
}

/**
 * 检查年级是否应该包含该学科
 * 英语从3年级开始（小学1-2年级没有英语）
 */
function shouldIncludeGradeForSubject(subject, educationLevel, grade) {
  if (subject === '英语' && educationLevel === 'elementary') {
    const gradeNum = parseInt(grade, 10);
    return gradeNum >= ENGLISH_START_GRADE;
  }
  return true;
}

/**
 * 获取学科在指定学段对应的教材版本列表
 */
function getVersionsForSubject(subject, educationLevel) {
  const versionConfig = SUBJECT_VERSION_MAP[subject];
  
  // 如果是统一部编版的学科
  if (Array.isArray(versionConfig)) {
    return versionConfig;
  }
  
  // 如果是对象（按学段区分）
  if (versionConfig && typeof versionConfig === 'object') {
    return versionConfig[educationLevel] || [];
  }
  
  // 如果没有配置，返回空数组（不应该出现）
  console.warn(`警告：学科 ${subject} 在学段 ${educationLevel} 没有配置版本`);
  return [];
}

/**
 * 生成所有组合
 */
function generateCatalogCombinations() {
  const combinations = [];

  EDUCATION_LEVELS.forEach(level => {
    const grades = GRADES[level.key];
    
    grades.forEach(grade => {
      SUBJECTS.forEach(subject => {
        // 检查学科是否属于当前学段
        if (!isSubjectInEducationLevel(subject, level.key)) {
          return;
        }

        // 检查年级是否应该包含该学科（如英语从3年级开始）
        if (!shouldIncludeGradeForSubject(subject, level.key, grade)) {
          return;
        }

        // 获取该学科在当前学段对应的版本列表
        const versions = getVersionsForSubject(subject, level.key);
        
        if (versions.length === 0) {
          console.warn(`警告：学科 ${subject} 在学段 ${level.key} 年级 ${grade} 没有配置版本，跳过`);
          return;
        }
        
        versions.forEach(version => {
          VOLUMES.forEach(volume => {
            combinations.push({
              education_level: level.key,
              grade: grade,
              subject: subject,
              textbook_version: version,
              volume: volume
            });
          });
        });
      });
    });
  });

  return combinations;
}

/**
 * 插入数据（使用 INSERT IGNORE 避免重复）
 */
async function insertCatalogData(combinations) {
  return new Promise((resolve, reject) => {
    const values = combinations.map(c => [
      c.education_level,
      c.grade,
      c.subject,
      c.textbook_version,
      c.volume
    ]);

    const sql = `
      INSERT IGNORE INTO textbook_catalog 
        (education_level, grade, subject, textbook_version, volume)
      VALUES ?
    `;

    connection.query(sql, [values], (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

/**
 * 统计已存在的数据
 */
async function countExistingData() {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT COUNT(*) as count FROM textbook_catalog',
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results[0].count);
      }
    );
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始生成教材目录骨架...\n');

  try {
    // 检查表是否存在
    await new Promise((resolve, reject) => {
      connection.query(
        "SHOW TABLES LIKE 'textbook_catalog'",
        (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          if (results.length === 0) {
            console.log('❌ 表 textbook_catalog 不存在，请先执行 create-textbook-catalog-table.sql');
            process.exit(1);
          }
          resolve();
        }
      );
    });

    // 统计已存在的数据
    const existingCount = await countExistingData();
    console.log(`📊 当前已存在 ${existingCount} 条记录\n`);

    // 生成所有组合
    console.log('📝 生成组合数据...');
    const combinations = generateCatalogCombinations();
    console.log(`   共生成 ${combinations.length} 个组合\n`);

    // 显示一些示例
    console.log('📋 组合示例（前5条）：');
    combinations.slice(0, 5).forEach((c, index) => {
      const levelName = EDUCATION_LEVELS.find(l => l.key === c.education_level).name;
      console.log(`   ${index + 1}. ${levelName} ${c.grade}年级 ${c.subject} ${c.textbook_version} ${c.volume}`);
    });
    console.log('');

    // 插入数据
    console.log('💾 插入数据...');
    const result = await insertCatalogData(combinations);
    const insertedCount = result.affectedRows || 0;
    console.log(`   ✅ 成功插入 ${insertedCount} 条新记录`);
    console.log(`   ℹ️  跳过 ${combinations.length - insertedCount} 条已存在的记录\n`);

    // 统计最终数据
    const finalCount = await countExistingData();
    console.log(`📊 最终数据总数: ${finalCount} 条\n`);

    console.log('✅ 教材目录骨架生成完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    connection.end();
  }
}

// 执行主函数
main();


