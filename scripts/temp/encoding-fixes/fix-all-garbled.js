#!/usr/bin/env node
/**
 * 全面修复所有乱码字段
 * 使用多种方法尝试修复，包括：
 * 1. Latin1 -> UTF-8 转换
 * 2. 双重编码修复
 * 3. 手动映射（对于无法自动修复的）
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// 手动修复映射（对于无法自动修复的字段）
const manualFixes = {
  // ID -> { field: value }
  24: { subject: '数学', description: '测试资源描述' },
  28: { subject: '数学' },
  37: { category: '教案', subject: '数学', description: '优翼' },
  38: { category: '教材', subject: '道德与法治' },
  35: { category: '教材' },
  36: { category: '教材' },
  32: { subject: '数学' },
  31: { subject: '英语' },
  30: { subject: '生物' },
  29: { subject: '物理' },
  27: { subject: '科学' },
  26: { category: '教案', subject: '语文' },
  1: { subject: '数学', description: '这是一个测试资源描述' },
  3: { subject: '语文', description: '这是一个开发环境自动批准的资源' },
  4: { subject: '英语', description: '这个资源应该在开发环境下自动被批准' },
  8: { subject: '数学', description: '这是一个通过文件上传创建的测试资源' },
  9: { subject: '英语', description: '最终验证测试' },
  13: { category: '教材', subject: '数学', textbook: '人教版' },
  14: { category: '课件', subject: '数学', textbook: '人教版' },
  15: { category: '课件', subject: '数学', textbook: '人教版' },
};

async function fixAllGarbled() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔧 全面修复所有乱码字段...\n');

  // 方法1: 使用BINARY读取，尝试自动修复
  const [rows] = await connection.query(`
    SELECT id,
      CAST(title AS BINARY) as title_bin,
      CAST(category AS BINARY) as cat_bin,
      CAST(subject AS BINARY) as sub_bin,
      CAST(description AS BINARY) as desc_bin,
      CAST(grade AS BINARY) as grade_bin,
      CAST(textbook AS BINARY) as textbook_bin
    FROM resource
  `);

  let autoFixedCount = 0;
  const stats = { title: 0, category: 0, subject: 0, description: 0, grade: 0, textbook: 0 };

  for (const row of rows) {
    const updates = {};

    function tryFixBinary(buffer) {
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;
      
      try {
        // 尝试多种修复方法
        const methods = [
          // 方法1: Latin1 -> UTF-8
          () => {
            const latin1 = buffer.toString('latin1');
            return Buffer.from(latin1, 'binary').toString('utf8');
          },
          // 方法2: 直接UTF-8（如果已经是正确的）
          () => buffer.toString('utf8'),
        ];

        for (const method of methods) {
          try {
            const fixed = method();
            // 验证：应该包含中文，不应该包含明显的乱码
            const hasChinese = /[\u4e00-\u9fa5]/.test(fixed);
            const hasBadPattern = /[æåèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(fixed) && !hasChinese;
            const hasReplacement = fixed.includes('') || fixed.includes('');
            
            if (hasChinese && !hasBadPattern && !hasReplacement) {
              return fixed;
            }
          } catch (e) {
            // 继续尝试下一个方法
          }
        }
      } catch (e) {
        // 修复失败
      }
      
      return null;
    }

    const fixedTitle = tryFixBinary(row.title_bin);
    const fixedCat = tryFixBinary(row.cat_bin);
    const fixedSub = tryFixBinary(row.sub_bin);
    const fixedDesc = tryFixBinary(row.desc_bin);
    const fixedGrade = tryFixBinary(row.grade_bin);
    const fixedTextbook = tryFixBinary(row.textbook_bin);

    // 获取原始值
    const [origRows] = await connection.query(
      'SELECT title, category, subject, description, grade, textbook FROM resource WHERE id = ?',
      [row.id]
    );
    const orig = origRows[0];

    if (fixedTitle && fixedTitle !== orig.title) {
      updates.title = fixedTitle;
      stats.title++;
    }
    if (fixedCat && fixedCat !== orig.category) {
      updates.category = fixedCat;
      stats.category++;
    }
    if (fixedSub && fixedSub !== orig.subject) {
      updates.subject = fixedSub;
      stats.subject++;
    }
    if (fixedDesc && fixedDesc !== orig.description) {
      updates.description = fixedDesc;
      stats.description++;
    }
    if (fixedGrade && fixedGrade !== orig.grade) {
      updates.grade = fixedGrade;
      stats.grade++;
    }
    if (fixedTextbook && fixedTextbook !== orig.textbook) {
      updates.textbook = fixedTextbook;
      stats.textbook++;
    }

    // 应用手动修复（如果存在）
    if (manualFixes[row.id]) {
      for (const [field, value] of Object.entries(manualFixes[row.id])) {
        if (orig[field] !== value) {
          updates[field] = value;
          stats[field]++;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(f => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), row.id];
      
      try {
        await connection.query(`UPDATE resource SET ${setClause} WHERE id = ?`, values);
        autoFixedCount++;
        
        if (autoFixedCount <= 20) {
          console.log(`✅ ID ${row.id}: 修复了 ${Object.keys(updates).join(', ')}`);
        }
      } catch (e) {
        console.log(`❌ ID ${row.id}: ${e.message}`);
      }
    }
  }

  console.log(`\n📊 自动修复完成: ${autoFixedCount} 个资源`);
  console.log('\n各字段修复统计:');
  for (const [field, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${field}: ${count} 个`);
    }
  }

  // 最终检查
  console.log('\n🔍 最终检查剩余乱码...');
  const [finalCheck] = await connection.query(
    'SELECT id, title, category, subject, description FROM resource'
  );

  let remainingGarbled = 0;
  for (const r of finalCheck) {
    const fields = ['title', 'category', 'subject', 'description'];
    for (const field of fields) {
      const value = r[field];
      if (value && (value.includes('') || value.includes('') || 
          (/[æåèéêë]/.test(value) && !/[\u4e00-\u9fa5]/.test(value)))) {
        remainingGarbled++;
        if (remainingGarbled <= 10) {
          console.log(`  ⚠️  ID ${r.id} ${field}: "${value.substring(0, 30)}"`);
        }
        break;
      }
    }
  }

  if (remainingGarbled === 0) {
    console.log('✅ 所有乱码已修复！');
  } else {
    console.log(`\n⚠️  还有 ${remainingGarbled} 个字段有乱码，可能需要手动修复`);
  }

  await connection.end();
}

fixAllGarbled().catch(err => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});

