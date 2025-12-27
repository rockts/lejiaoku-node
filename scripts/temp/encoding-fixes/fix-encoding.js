#!/usr/bin/env node
/**
 * 修复资源标题的编码问题
 * 这个脚本尝试修复双重编码的中文标题
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function fixEncoding() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔍 查找有编码问题的资源...\n');

  // 查询所有资源
  const [resources] = await connection.query(
    'SELECT id, title FROM resource ORDER BY id DESC'
  );

  let fixedCount = 0;
  const fixes = [];

  for (const resource of resources) {
    const title = resource.title;
    
    // 检测可能的编码问题（包含常见的乱码模式）
    if (/[æåèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(title) && /[\u4e00-\u9fa5]/.test(title) === false) {
      // 尝试修复：将 Latin1 编码的 UTF-8 字符串转换回正确的 UTF-8
      try {
        // 将字符串当作 Latin1 编码，然后转回 Buffer，再按 UTF-8 解码
        const fixed = Buffer.from(title, 'latin1').toString('utf8');
        
        // 验证修复后的字符串是否包含中文字符
        if (/[\u4e00-\u9fa5]/.test(fixed)) {
          fixes.push({
            id: resource.id,
            old: title,
            new: fixed
          });
          
          // 更新数据库
          await connection.query(
            'UPDATE resource SET title = ? WHERE id = ?',
            [fixed, resource.id]
          );
          
          fixedCount++;
          console.log(`✅ ID ${resource.id}: "${title}" -> "${fixed}"`);
        }
      } catch (e) {
        console.log(`❌ ID ${resource.id}: 修复失败 - ${e.message}`);
      }
    }
  }

  console.log(`\n📊 修复完成: ${fixedCount} 条记录\n`);

  if (fixes.length > 0) {
    console.log('修复详情:');
    fixes.forEach(fix => {
      console.log(`  ID ${fix.id}: "${fix.old}" -> "${fix.new}"`);
    });
  } else {
    console.log('未发现需要修复的资源');
  }

  await connection.end();
}

fixEncoding().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});

