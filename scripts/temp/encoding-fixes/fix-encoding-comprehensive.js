#!/usr/bin/env node
/**
 * 全面修复资源编码问题
 * 处理双重编码和Latin1错误编码的UTF-8字符串
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 尝试多种方法修复编码
 */
function fixEncoding(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }

  // 如果已经是正确的中文字符串，不需要修复
  if (/[\u4e00-\u9fa5]/.test(str) && !/[æåèéêëìíîïðñòóôõöøùúûüýþÿ\uFFFD]/i.test(str)) {
    return str;
  }

  const attempts = [];

  try {
    // 方法1: Latin1 -> UTF-8 (最常见的情况)
    const fix1 = Buffer.from(str, 'latin1').toString('utf8');
    if (/[\u4e00-\u9fa5]/.test(fix1) && !/[\uFFFD]/.test(fix1)) {
      attempts.push({ method: 'latin1->utf8', result: fix1 });
    }
  } catch (e) {}

  try {
    // 方法2: 双重Latin1转换（针对双重编码）
    const step1 = Buffer.from(str, 'latin1').toString('utf8');
    const fix2 = Buffer.from(step1, 'latin1').toString('utf8');
    if (/[\u4e00-\u9fa5]/.test(fix2) && !/[\uFFFD]/.test(fix2)) {
      attempts.push({ method: 'double-latin1', result: fix2 });
    }
  } catch (e) {}

  try {
    // 方法3: 将字符串当作字节序列，尝试不同的编码组合
    const bytes = Buffer.from(str, 'binary');
    const fix3 = bytes.toString('utf8');
    if (/[\u4e00-\u9fa5]/.test(fix3) && !/[\uFFFD]/.test(fix3)) {
      attempts.push({ method: 'binary->utf8', result: fix3 });
    }
  } catch (e) {}

  // 选择最好的结果（中文字符最多的）
  if (attempts.length > 0) {
    attempts.sort((a, b) => {
      const countA = (a.result.match(/[\u4e00-\u9fa5]/g) || []).length;
      const countB = (b.result.match(/[\u4e00-\u9fa5]/g) || []).length;
      return countB - countA;
    });
    return attempts[0].result;
  }

  return str; // 无法修复，返回原值
}

async function fixAllFields() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔧 全面修复所有资源的编码问题...\n');

  const [resources] = await connection.query(
    'SELECT id, title, description, category, subject, grade, textbook FROM resource ORDER BY id'
  );

  let fixedCount = 0;
  const fixedFields = { title: 0, description: 0, category: 0, subject: 0, grade: 0, textbook: 0 };

  for (const resource of resources) {
    const fieldsToFix = ['title', 'description', 'category', 'subject', 'grade', 'textbook'];
    const updates = {};
    let hasChanges = false;

    for (const field of fieldsToFix) {
      const originalValue = resource[field];
      if (originalValue) {
        const fixedValue = fixEncoding(originalValue);
        if (fixedValue !== originalValue) {
          updates[field] = fixedValue;
          fixedFields[field]++;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      try {
        const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(resource.id);

        await connection.query(
          `UPDATE resource SET ${setClause} WHERE id = ?`,
          values
        );

        fixedCount++;
        if (fixedCount % 10 === 0) {
          process.stdout.write(`已修复 ${fixedCount} 个资源...\r`);
        }
      } catch (e) {
        console.log(`\n❌ ID ${resource.id}: 修复失败 - ${e.message}`);
      }
    }
  }

  console.log(`\n\n📊 修复完成: ${fixedCount} 个资源`);
  console.log('\n各字段修复统计:');
  for (const [field, count] of Object.entries(fixedFields)) {
    if (count > 0) {
      console.log(`  ${field}: ${count} 个`);
    }
  }

  await connection.end();
}

fixAllFields().catch(err => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});

