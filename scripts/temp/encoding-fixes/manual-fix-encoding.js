#!/usr/bin/env node
/**
 * 手动修复资源编码
 * 使用方法：编辑此文件，在 fixes 数组中添加需要修复的资源信息
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// 手动指定的修复映射
// 格式: { id: 资源ID, fields: { 字段名: 正确的值 } }
const fixes = [
  // 示例：
  // { id: 1, fields: { title: '测试资源标题' } },
  // { id: 2, fields: { title: '最小参数测试资源', category: '教案' } },
  // 在这里添加需要修复的资源...
];

async function applyFixes() {
  if (fixes.length === 0) {
    console.log('⚠️  没有需要修复的资源');
    console.log('请在脚本的 fixes 数组中添加需要修复的资源信息');
    return;
  }

  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log(`🔧 手动修复 ${fixes.length} 个资源...\n`);

  let fixedCount = 0;

  for (const fix of fixes) {
    try {
      const fields = Object.keys(fix.fields);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => fix.fields[f]);
      values.push(fix.id);

      await connection.query(
        `UPDATE resource SET ${setClause} WHERE id = ?`,
        values
      );

      console.log(`✅ ID ${fix.id}: 修复了 ${fields.join(', ')}`);
      console.log(`   新值: ${JSON.stringify(fix.fields, null, 2)}`);
      fixedCount++;
    } catch (e) {
      console.log(`❌ ID ${fix.id}: 修复失败 - ${e.message}`);
    }
  }

  console.log(`\n📊 修复完成: ${fixedCount}/${fixes.length} 个资源\n`);

  await connection.end();
}

applyFixes().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});

