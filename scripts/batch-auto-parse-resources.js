/**
 * 批量触发资源自动解析
 * 
 * 功能：
 * 1. 查询所有 status='approved' 且 auto_meta_result 为 null 的资源
 * 2. 调用 /api/resources/:id/auto-parse 接口触发自动解析
 * 
 * 使用方法：
 * node scripts/batch-auto-parse-resources.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3333';

/**
 * 发送 HTTP 请求
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch (e) {
          parsedBody = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedBody,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始批量触发资源自动解析...\n');

    // 1. 获取所有 approved 资源
    console.log('📊 获取资源列表...');
    const listResponse = await makeRequest('GET', '/api/resources?limit=100');
    
    if (listResponse.statusCode !== 200) {
      console.error('❌ 获取资源列表失败:', listResponse.statusCode);
      process.exit(1);
    }

    const resources = Array.isArray(listResponse.body) ? listResponse.body : [];
    console.log(`✓ 获取到 ${resources.length} 条资源\n`);

    // 2. 筛选需要解析的资源（auto_meta_result 为 null）
    const needParseResources = resources.filter(r => 
      r.status === 'approved' && 
      (!r.auto_meta_result || r.auto_meta_status === 'pending')
    );

    console.log(`📋 需要解析的资源: ${needParseResources.length} 条\n`);

    if (needParseResources.length === 0) {
      console.log('✅ 没有需要解析的资源');
      return;
    }

    // 3. 统计信息
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // 4. 批量触发解析（添加延迟避免请求过快）
    for (let i = 0; i < needParseResources.length; i++) {
      const resource = needParseResources[i];
      console.log(`\n[${i + 1}/${needParseResources.length}] 处理资源 ID: ${resource.id} - ${resource.title || '(无标题)'}`);

      try {
        const response = await makeRequest('POST', `/api/resources/${resource.id}/auto-parse`);
        
        if (response.statusCode === 200) {
          console.log(`  ✅ 解析触发成功`);
          successCount++;
        } else {
          console.log(`  ❌ 解析触发失败 (状态码: ${response.statusCode})`);
          failedCount++;
          errors.push({
            id: resource.id,
            title: resource.title,
            statusCode: response.statusCode,
            error: response.body,
          });
        }
      } catch (error) {
        console.log(`  ❌ 请求失败: ${error.message}`);
        failedCount++;
        errors.push({
          id: resource.id,
          title: resource.title,
          error: error.message,
        });
      }

      // 延迟 500ms，避免请求过快
      if (i < needParseResources.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 5. 输出统计结果
    console.log('\n' + '='.repeat(50));
    console.log('📈 批量解析统计结果');
    console.log('='.repeat(50));
    console.log(`总资源数: ${resources.length}`);
    console.log(`需要解析: ${needParseResources.length}`);
    console.log(`✅ 成功触发: ${successCount}`);
    console.log(`❌ 失败: ${failedCount}`);
    if (errors.length > 0) {
      console.log('\n失败详情:');
      errors.forEach(err => {
        console.log(`  - 资源 ID ${err.id} (${err.title}): ${err.error || err.statusCode}`);
      });
    }
    console.log('='.repeat(50));
    console.log('\n✅ 批量解析完成！');
    console.log('💡 提示: 解析可能需要一些时间，可以使用 GET /api/resources/:id 查询解析结果');

  } catch (error) {
    console.error('\n❌ 批量解析失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

