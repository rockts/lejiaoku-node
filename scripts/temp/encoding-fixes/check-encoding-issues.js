#!/usr/bin/env node
/**
 * 检查所有资源的编码问题
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function checkEncoding() {
  const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
  const connection = await mysql.createConnection({
    socketPath: socketPath,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '8363678',
    database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
    charset: 'utf8mb4'
  });

  console.log('🔍 检查所有资源的编码问题...\n');

  const [resources] = await connection.query(
    'SELECT id, title, description, category, subject, grade, textbook FROM resource ORDER BY id'
  );

  const issues = [];
  
  for (const resource of resources) {
    const fields = {
      title: resource.title,
      description: resource.description,
      category: resource.category,
      subject: resource.subject,
      grade: resource.grade,
      textbook: resource.textbook
    };

    let hasIssue = false;
    const fieldIssues = {};

    for (const [field, value] of Object.entries(fields)) {
      if (value && typeof value === 'string') {
        // 检测乱码模式：包含常见的乱码字符
        if (/[æåèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(value) || 
            /[\uFFFD]/.test(value) || // 替换字符
            (value.match(/[\u4e00-\u9fa5]/g) === null && value.length > 0 && /[\x80-\xFF]/.test(value))) {
          hasIssue = true;
          fieldIssues[field] = value;
        }
      }
    }

    if (hasIssue) {
      issues.push({
        id: resource.id,
        ...fieldIssues
      });
    }
  }

  console.log(`📊 发现 ${issues.length} 个资源有编码问题\n`);

  if (issues.length > 0) {
    console.log('有问题的资源:');
    issues.forEach(issue => {
      console.log(`\nID ${issue.id}:`);
      for (const [field, value] of Object.entries(issue)) {
        if (field !== 'id' && value) {
          console.log(`  ${field}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        }
      }
    });
  } else {
    console.log('✅ 未发现编码问题');
  }

  // 保存到文件
  fs.writeFileSync(
    'encoding-issues.json',
    JSON.stringify(issues, null, 2),
    'utf8'
  );
  console.log(`\n📝 详细问题列表已保存到 encoding-issues.json`);

  await connection.end();
}

checkEncoding().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});

