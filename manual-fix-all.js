#!/usr/bin/env node
/**
 * 手动修复所有乱码资源
 * 根据常见模式推断正确的值，或需要手动指定
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// 根据常见模式推断的修复映射
// 如果无法推断，需要手动添加
const fixes = [
  // ID 28: "9"封面`传" -> "测试封面上传"
  { id: 28, title: '测试封面上传' },
  
  // ID 27: ""ܯ个审核9"" -> "这是一个审核测试"
  { id: 27, title: '这是一个审核测试' },
  
  // ID 26: "æ•™æ¡ˆæµ‹è¯•" -> "教案测试"
  { id: 26, title: '教案测试' },
  
  // ID 31: ""ܯ丬个9"审核a源" -> "这是一个测试审核的资源"
  { id: 31, title: '这是一个测试审核的资源' },
  
  // ID 30, 29: "ƪ屏2025-12-23 22" -> "截屏2025-12-23 22"
  { id: 30, title: '截屏2025-12-23 22' },
  { id: 29, title: '截屏2025-12-23 21' },
  
  // ID 32: "ChatGPT Image 2025年11S17 22_39_01" -> "ChatGPT Image 2025年11月17日 22_39_01"
  { id: 32, title: 'ChatGPT Image 2025年11月17日 22_39_01' },
  
  // ID 1-25: 需要根据实际情况推断
  { id: 1, title: '测试资源标题' },
  { id: 2, title: '最小参数测试资源' },
  { id: 3, title: '开发环境测试资源' },
  { id: 4, title: '开发环境自动批准资源' },
  { id: 8, title: '测试文件上传资源' },
  { id: 9, title: '最终测试资源' },
  { id: 12, title: '测试日志' },
  { id: 13, title: '测试version字段兼容' },
  { id: 14, title: '测试服务重启后上传' },
  { id: 15, title: '测试上传修复' },
  { id: 17, title: '测试扩展名修复' },
  { id: 19, title: '测试资源_1766503797159' },
  { id: 20, title: '测试资源_1766503799189' },
  { id: 21, title: '测试资源_1766503800045' },
  { id: 22, title: '测试资源_1766503800534' },
  { id: 23, title: '测试资源_1766503800730' },
  
  // 其他字段修复（如果需要）
];

async function applyFixes() {
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
      const updates = {};
      if (fix.title) updates.title = fix.title;
      if (fix.category) updates.category = fix.category;
      if (fix.subject) updates.subject = fix.subject;
      if (fix.description) updates.description = fix.description;
      if (fix.grade) updates.grade = fix.grade;
      if (fix.textbook) updates.textbook = fix.textbook;

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), fix.id];

        await connection.query(`UPDATE resource SET ${setClause} WHERE id = ?`, values);

        fixedCount++;
        console.log(`✅ ID ${fix.id}: 修复了 ${Object.keys(updates).join(', ')}`);
        for (const [field, value] of Object.entries(updates)) {
          console.log(`   ${field}: "${value}"`);
        }
      }
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

