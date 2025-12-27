#!/usr/bin/env node
/**
 * 手动修复资源标题
 * 由于数据已经双重编码，需要手动指定正确的标题
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// 手动映射：资源ID -> 正确的标题
const titleFixes = {
  24: '测试资源_1766503800917',
  35: '语文一年级下册',
  36: '语文二年级下册',
  37: '1亿有多大',
  38: '道德与法治二年级下册',
  // 如果需要修复更多，在这里添加
};

async function fixTitles() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔧 修复资源标题...\n');

  let fixedCount = 0;

  for (const [id, correctTitle] of Object.entries(titleFixes)) {
    try {
      await connection.query(
        'UPDATE resource SET title = ? WHERE id = ?',
        [correctTitle, parseInt(id)]
      );
      console.log(`✅ ID ${id}: 已修复为 "${correctTitle}"`);
      fixedCount++;
    } catch (e) {
      console.log(`❌ ID ${id}: 修复失败 - ${e.message}`);
    }
  }

  console.log(`\n📊 修复完成: ${fixedCount} 条记录\n`);

  // 显示修复后的结果
  const ids = Object.keys(titleFixes).map(id => parseInt(id));
  const [results] = await connection.query(
    `SELECT id, title FROM resource WHERE id IN (${ids.join(',')}) ORDER BY id`
  );

  console.log('修复后的标题:');
  results.forEach(row => {
    console.log(`  ID ${row.id}: ${row.title}`);
  });

  await connection.end();
}

fixTitles().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});

