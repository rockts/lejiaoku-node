#!/usr/bin/env node
/**
 * 修复所有资源的编码问题
 * 尝试将双重编码的UTF-8字符串修复为正确的UTF-8
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 尝试修复编码问题
 * 方法1: 将字符串当作Latin1编码，然后转换为UTF-8
 * 方法2: 如果方法1失败，尝试其他编码转换
 */
function tryFixEncoding(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }

  // 检测是否可能包含乱码
  const hasGarbledChars = /[æåèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(str) || /[\uFFFD]/.test(str);
  
  if (!hasGarbledChars) {
    return str; // 不需要修复
  }

  try {
    // 方法1: Latin1 -> UTF-8
    // 如果数据是UTF-8被错误地当作Latin1存储，然后再被当作UTF-8读取，需要反转这个过程
    const buffer1 = Buffer.from(str, 'latin1');
    const fixed1 = buffer1.toString('utf8');
    
    // 验证修复后的字符串是否包含有效的中文字符
    if (/[\u4e00-\u9fa5]/.test(fixed1) && !/[\uFFFD]/.test(fixed1)) {
      return fixed1;
    }

    // 方法2: 如果fixed1还是有问题，尝试再次转换（针对双重编码）
    try {
      const buffer2 = Buffer.from(fixed1, 'latin1');
      const fixed2 = buffer2.toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(fixed2) && !/[\uFFFD]/.test(fixed2)) {
        return fixed2;
      }
    } catch (e) {
      // 忽略错误
    }

    // 如果都失败，返回原始字符串
    return str;
  } catch (e) {
    return str;
  }
}

async function fixAllEncoding() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔧 修复所有资源的编码问题...\n');

  const [resources] = await connection.query(
    'SELECT id, title, description, category, subject, grade, textbook FROM resource ORDER BY id'
  );

  let fixedCount = 0;
  const fixedResources = [];

  for (const resource of resources) {
    const fieldsToFix = ['title', 'description', 'category', 'subject', 'grade', 'textbook'];
    const updates = {};
    let hasChanges = false;

    for (const field of fieldsToFix) {
      const originalValue = resource[field];
      if (originalValue) {
        const fixedValue = tryFixEncoding(originalValue);
        if (fixedValue !== originalValue) {
          updates[field] = fixedValue;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      try {
        // 构建UPDATE语句
        const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(resource.id);

        await connection.query(
          `UPDATE resource SET ${setClause} WHERE id = ?`,
          values
        );

        fixedCount++;
        fixedResources.push({
          id: resource.id,
          updates: Object.entries(updates).map(([field, value]) => ({
            field,
            old: resource[field],
            new: value
          }))
        });

        console.log(`✅ ID ${resource.id}: 修复了 ${Object.keys(updates).length} 个字段`);
      } catch (e) {
        console.log(`❌ ID ${resource.id}: 修复失败 - ${e.message}`);
      }
    }
  }

  console.log(`\n📊 修复完成: ${fixedCount} 个资源，共修复了多个字段\n`);

  // 显示一些修复示例
  if (fixedResources.length > 0) {
    console.log('修复示例（前5个）:');
    fixedResources.slice(0, 5).forEach(res => {
      console.log(`\nID ${res.id}:`);
      res.updates.forEach(u => {
        console.log(`  ${u.field}: "${u.old.substring(0, 30)}..." -> "${u.new.substring(0, 30)}..."`);
      });
    });
  }

  await connection.end();
}

fixAllEncoding().catch(err => {
  console.error('❌ 错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});

