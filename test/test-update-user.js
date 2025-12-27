/**
 * 测试更新用户接口
 */

const http = require('http');

const BASE_URL = 'http://localhost:3333';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

async function testUpdateUser() {
  console.log('🔍 测试更新用户接口...\n');

  // 先登录获取 token
  console.log('步骤 1: 登录获取 token');
  let token;
  try {
    const loginRes = await makeRequest('POST', '/login', {
      username: 'admin',
      password: 'admin123456'
    });
    if (loginRes.body && loginRes.body.token) {
      token = loginRes.body.token;
      console.log('✅ 登录成功，获取 token\n');
    } else {
      console.log('❌ 登录失败:', loginRes.body);
      return;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.message);
    return;
  }

  // 测试 1: 正确的更新请求格式
  console.log('步骤 2: 测试更新用户名和邮箱');
  try {
    const response1 = await makeRequest('PATCH', '/users', {
      validate: {
        password: 'admin123456'
      },
      update: {
        name: 'admin_updated',
        email: 'admin_updated@lekee.cc'
      }
    }, token);
    console.log(`状态码: ${response1.statusCode}`);
    console.log('响应:', JSON.stringify(response1.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 2: 缺少 validate.password
  console.log('步骤 3: 测试缺少验证密码');
  try {
    const response2 = await makeRequest('PATCH', '/users', {
      update: {
        name: 'admin_updated2'
      }
    }, token);
    console.log(`状态码: ${response2.statusCode}`);
    console.log('响应:', JSON.stringify(response2.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 3: 只更新邮箱
  console.log('步骤 4: 测试只更新邮箱');
  try {
    const response3 = await makeRequest('PATCH', '/users', {
      validate: {
        password: 'admin123456'
      },
      update: {
        email: 'admin_final@lekee.cc'
      }
    }, token);
    console.log(`状态码: ${response3.statusCode}`);
    console.log('响应:', JSON.stringify(response3.body, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 检查 /user/profile 是否存在
  console.log('步骤 5: 检查 /user/profile 接口');
  try {
    const response4 = await makeRequest('PATCH', '/user/profile', {
      name: 'test'
    }, token);
    console.log(`状态码: ${response4.statusCode}`);
    console.log('响应:', JSON.stringify(response4.body, null, 2));
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

testUpdateUser().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

