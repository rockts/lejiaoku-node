/**
 * 修复 cover 表中 originalname 字段的编码问题
 * 
 * 问题：中文文件名被错误地以 latin1 编码存储，导致显示乱码
 * 解决：尝试从 latin1 解码到 utf8，如果无法恢复则清空
 */

const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// 创建数据库连接（使用默认值作为兜底）
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
  charset: 'utf8mb4'
});

/**
 * 尝试修复编码
 */
function fixEncoding(originalname) {
  if (!originalname) {
    return originalname;
  }

  // 如果已经是正常的中文字符，直接返回
  if (/[\u4e00-\u9fa5]/.test(originalname)) {
    return originalname;
  }

  // 如果包含乱码字符（latin1 编码的中文），尝试修复
  if (/[\x80-\xFF]/.test(originalname)) {
    try {
      // 方法1：尝试从 latin1 解码到 utf8
      let fixed = Buffer.from(originalname, 'latin1').toString('utf8');
      
      // 检查修复后的结果是否包含正常的中文字符
      if (/[\u4e00-\u9fa5]/.test(fixed)) {
        return fixed;
      }
      
      // 方法2：尝试从 binary 解码
      try {
        fixed = Buffer.from(originalname, 'binary').toString('utf8');
        if (/[\u4e00-\u9fa5]/.test(fixed)) {
          return fixed;
        }
      } catch (e) {
        // 忽略
      }
      
      // 方法3：尝试直接使用 Buffer.from 然后 toString('utf8')
      try {
        const bytes = Buffer.from(originalname);
        fixed = bytes.toString('utf8');
        if (/[\u4e00-\u9fa5]/.test(fixed)) {
          return fixed;
        }
      } catch (e) {
        // 忽略
      }
      
      // 方法4：尝试从 utf8 错误解码（有时候是双重编码）
      try {
        // 先按 latin1 解码，再按 utf8 解码
        const step1 = Buffer.from(originalname, 'latin1').toString('binary');
        fixed = Buffer.from(step1, 'binary').toString('utf8');
        if (/[\u4e00-\u9fa5]/.test(fixed)) {
          return fixed;
        }
      } catch (e) {
        // 忽略
      }
      
      // 如果所有方法都失败，返回空字符串（清空）
      console.warn(`无法修复文件名: ${originalname}`);
      return '';
    } catch (error) {
      console.warn(`修复文件名时出错: ${originalname}`, error.message);
      return '';
    }
  }

  // 如果没有乱码字符，直接返回
  return originalname;
}

async function fixCoverEncoding() {
  try {
    console.log('🔍 开始检查 cover 表中的编码问题...\n');

    // 1. 查询所有 cover 记录
    const [covers] = await connection.promise().query(
      'SELECT id, originalname FROM cover WHERE originalname IS NOT NULL'
    );

    console.log(`找到 ${covers.length} 条 cover 记录\n`);

    if (covers.length === 0) {
      console.log('✅ 没有需要修复的记录');
      connection.end();
      return;
    }

    // 2. 检查哪些需要修复
    const needsFix = [];
    const alreadyFixed = [];

    for (const cover of covers) {
      const original = cover.originalname;
      
      // 跳过空字符串
      if (!original || original.trim() === '') {
        alreadyFixed.push(cover);
        continue;
      }
      
      // 检查是否包含乱码（latin1 编码的中文特征）
      // 乱码特征：包含非ASCII字符但不包含正常的中文字符
      const hasNonAscii = /[^\x00-\x7F]/.test(original);
      const hasValidChinese = /[\u4e00-\u9fa5]/.test(original);
      
      // 检查是否包含常见的乱码字符模式（如 äºŒ, ä¸‹ 等）
      const hasGarbledPattern = /[äåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(original);
      
      if ((hasNonAscii && !hasValidChinese) || hasGarbledPattern) {
        needsFix.push(cover);
      } else {
        alreadyFixed.push(cover);
      }
    }

    console.log(`✅ 正常记录: ${alreadyFixed.length}`);
    console.log(`⚠️  需要修复: ${needsFix.length}\n`);

    if (needsFix.length === 0) {
      console.log('✅ 没有需要修复的记录');
      connection.end();
      return;
    }

    // 3. 显示需要修复的记录
    console.log('需要修复的记录：');
    needsFix.forEach((cover, index) => {
      console.log(`  ${index + 1}. ID: ${cover.id}, 当前: "${cover.originalname}"`);
    });
    console.log('');

    // 4. 修复数据
    let fixedCount = 0;
    let clearedCount = 0;

    for (const cover of needsFix) {
      const fixed = fixEncoding(cover.originalname);
      
      if (fixed !== cover.originalname) {
        if (fixed && fixed.trim() !== '') {
          // 更新为修复后的文件名
          await connection.promise().query(
            'UPDATE cover SET originalname = ? WHERE id = ?',
            [fixed, cover.id]
          );
          console.log(`✅ ID ${cover.id}: "${cover.originalname}" → "${fixed}"`);
          fixedCount++;
        } else {
          // 无法修复，设置为空字符串（因为字段不允许 NULL）
          await connection.promise().query(
            'UPDATE cover SET originalname = ? WHERE id = ?',
            ['', cover.id]
          );
          console.log(`⚠️  ID ${cover.id}: 无法修复，已清空`);
          clearedCount++;
        }
      }
    }

    console.log('\n📊 修复统计：');
    console.log(`  ✅ 成功修复: ${fixedCount}`);
    console.log(`  ⚠️  已清空: ${clearedCount}`);
    console.log(`  📝 总计处理: ${needsFix.length}`);

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    try {
      if (connection && connection.state !== 'disconnected') {
        connection.end();
      }
    } catch (e) {
      // 忽略关闭连接时的错误
    }
  }
}

// 运行修复
fixCoverEncoding();

