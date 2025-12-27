/**
 * 测试注册接口
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

async function testRegister() {
  console.log('🔍 测试注册接口...\n');

  const timestamp = Date.now();
  
  // 测试 1: POST /register (userRouter)
  console.log('测试 1: POST /register (userRouter)');
  try {
    const response1 = await makeRequest('POST', '/register', {
      name: `test_user_${timestamp}`,
      email: `test_user_${timestamp}@test.com`,
      password: 'test123456'
    });
    console.log(`状态码: ${response1.statusCode}`);
    console.log('响应:', JSON.stringify(response1.body, null, 2));
    if (response1.statusCode === 201) {
      console.log('✅ 注册成功！\n');
    } else {
      console.log('❌ 注册失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 2: POST /api/register (authRouter)
  console.log('测试 2: POST /api/register (authRouter)');
  try {
    const response2 = await makeRequest('POST', '/api/register', {
      name: `test_api_${timestamp}`,
      email: `test_api_${timestamp}@test.com`,
      password: 'test123456',
      role: 'user'
    });
    console.log(`状态码: ${response2.statusCode}`);
    console.log('响应:', JSON.stringify(response2.body, null, 2));
    if (response2.statusCode === 201 && response2.body && response2.body.success) {
      console.log('✅ 注册成功！返回了 token\n');
    } else {
      console.log('❌ 注册失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 3: 缺少必填字段
  console.log('测试 3: 缺少必填字段 (name)');
  try {
    const response3 = await makeRequest('POST', '/api/register', {
      email: 'test@test.com',
      password: 'test123456'
    });
    console.log(`状态码: ${response3.statusCode}`);
    console.log('响应:', JSON.stringify(response3.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 4: 用户名已存在
  console.log('测试 4: 用户名已存在');
  try {
    const response4 = await makeRequest('POST', '/api/register', {
      name: 'admin',
      email: `newemail_${timestamp}@test.com`,
      password: 'test123456'
    });
    console.log(`状态码: ${response4.statusCode}`);
    console.log('响应:', JSON.stringify(response4.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 5: 邮箱已存在
  console.log('测试 5: 邮箱已存在');
  try {
    const response5 = await makeRequest('POST', '/api/register', {
      name: `newuser_${timestamp}`,
      email: 'admin@lekee.cc',
      password: 'test123456'
    });
    console.log(`状态码: ${response5.statusCode}`);
    console.log('响应:', JSON.stringify(response5.body, null, 2));
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

testRegister().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

