#!/usr/bin/env node
/**
 * 最终修复脚本：修复双重编码的UTF-8字符串
 * 方法：使用MySQL的BINARY类型读取原始字节，然后用Node.js正确处理
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function fixAllDoubleEncoded() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  
  // 使用原始连接，不设置charset，以便获取原始字节
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node'
  });

  console.log('🔧 修复所有双重编码的字段...\n');

  // 以BINARY方式读取所有字段
  const [rows] = await connection.query(`
    SELECT 
      id,
      CAST(title AS BINARY) as title_bin,
      CAST(description AS BINARY) as desc_bin,
      CAST(category AS BINARY) as cat_bin,
      CAST(subject AS BINARY) as sub_bin,
      CAST(grade AS BINARY) as grade_bin,
      CAST(textbook AS BINARY) as textbook_bin
    FROM resource
  `);

  let fixedCount = 0;
  const stats = { title: 0, description: 0, category: 0, subject: 0, grade: 0, textbook: 0 };

  for (const row of rows) {
    const updates = {};

    function fixBinaryField(bufferValue, fieldName) {
      if (!bufferValue || !Buffer.isBuffer(bufferValue)) return null;
      
      try {
        // 双重编码：数据是UTF-8被错误地当作Latin1存储，然后又当作UTF-8读取
        // 修复：将Buffer当作Latin1字符串，然后按UTF-8解码
        const asLatin1 = bufferValue.toString('latin1');
        const fixed = Buffer.from(asLatin1, 'latin1').toString('utf8');
        
        // 验证修复结果：应该包含中文字符，且不应该包含乱码字符
        const hasChinese = /[\u4e00-\u9fa5]/.test(fixed);
        const hasGarbled = /[æåèéêëìíîïðñòóôõöøùúûüýþÿ\uFFFD]/.test(fixed);
        
        if (hasChinese && !hasGarbled) {
          return fixed;
        }
      } catch (e) {
        // 修复失败
      }
      
      return null;
    }

    // 修复各个字段
    const fixedTitle = fixBinaryField(row.title_bin, 'title');
    const fixedDesc = fixBinaryField(row.desc_bin, 'description');
    const fixedCat = fixBinaryField(row.cat_bin, 'category');
    const fixedSub = fixBinaryField(row.sub_bin, 'subject');
    const fixedGrade = fixBinaryField(row.grade_bin, 'grade');
    const fixedTextbook = fixBinaryField(row.textbook_bin, 'textbook');

    // 获取原始值进行比较
    const [origRows] = await connection.query(
      'SELECT title, description, category, subject, grade, textbook FROM resource WHERE id = ?',
      [row.id]
    );
    const orig = origRows[0];

    if (fixedTitle && fixedTitle !== orig.title) {
      updates.title = fixedTitle;
      stats.title++;
    }
    if (fixedDesc && fixedDesc !== orig.description) {
      updates.description = fixedDesc;
      stats.description++;
    }
    if (fixedCat && fixedCat !== orig.category) {
      updates.category = fixedCat;
      stats.category++;
    }
    if (fixedSub && fixedSub !== orig.subject) {
      updates.subject = fixedSub;
      stats.subject++;
    }
    if (fixedGrade && fixedGrade !== orig.grade) {
      updates.grade = fixedGrade;
      stats.grade++;
    }
    if (fixedTextbook && fixedTextbook !== orig.textbook) {
      updates.textbook = fixedTextbook;
      stats.textbook++;
    }

    if (Object.keys(updates).length > 0) {
      const setClause = Object.keys(updates).map(f => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), row.id];
      
      try {
        await connection.query(`UPDATE resource SET ${setClause} WHERE id = ?`, values);
        fixedCount++;
        
        if (fixedCount <= 10) {
          console.log(`✅ ID ${row.id}: 修复了 ${Object.keys(updates).join(', ')}`);
          // 显示修复示例
          for (const [field, newValue] of Object.entries(updates)) {
            const oldValue = orig[field] || '';
            console.log(`   ${field}: "${oldValue.substring(0, 30)}" -> "${newValue.substring(0, 30)}"`);
          }
        } else if (fixedCount % 10 === 0) {
          process.stdout.write(`已修复 ${fixedCount} 个资源...\r`);
        }
      } catch (e) {
        console.log(`❌ ID ${row.id}: 更新失败 - ${e.message}`);
      }
    }
  }

  console.log(`\n\n📊 修复完成统计:`);
  console.log(`  总资源数: ${rows.length}`);
  console.log(`  修复的资源数: ${fixedCount}`);
  console.log(`\n各字段修复数量:`);
  for (const [field, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${field}: ${count} 个`);
    }
  }

  await connection.end();
}

fixAllDoubleEncoded().catch(err => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});

