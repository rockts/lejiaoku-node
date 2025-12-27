/**
 * 测试登录接口
 */

const http = require('http');

const BASE_URL = 'http://localhost:3333';

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

async function testLogin() {
  console.log('🔍 测试登录接口...\n');

  // 测试 1: 使用用户名登录（正确密码）
  console.log('测试 1: 使用用户名 "admin" 和密码 "admin123456"');
  try {
    const response1 = await makeRequest('POST', '/login', {
      username: 'admin',
      password: 'admin123456'
    });
    console.log(`状态码: ${response1.statusCode}`);
    console.log('响应:', JSON.stringify(response1.body, null, 2));
    if (response1.body && response1.body.token) {
      console.log('✅ 登录成功！\n');
    } else {
      console.log('❌ 登录失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 2: 使用邮箱登录（正确密码）
  console.log('测试 2: 使用邮箱 "admin@lejiaoku.com" 和密码 "admin123456"');
  try {
    const response2 = await makeRequest('POST', '/login', {
      email: 'admin@lejiaoku.com',
      password: 'admin123456'
    });
    console.log(`状态码: ${response2.statusCode}`);
    console.log('响应:', JSON.stringify(response2.body, null, 2));
    if (response2.body && response2.body.token) {
      console.log('✅ 登录成功！\n');
    } else {
      console.log('❌ 登录失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 3: 错误密码
  console.log('测试 3: 使用错误密码');
  try {
    const response3 = await makeRequest('POST', '/login', {
      username: 'admin',
      password: 'wrongpassword'
    });
    console.log(`状态码: ${response3.statusCode}`);
    console.log('响应:', JSON.stringify(response3.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 4: 不存在的用户
  console.log('测试 4: 使用不存在的用户');
  try {
    const response4 = await makeRequest('POST', '/login', {
      username: 'nonexist',
      password: 'password'
    });
    console.log(`状态码: ${response4.statusCode}`);
    console.log('响应:', JSON.stringify(response4.body, null, 2));
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

testLogin().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

