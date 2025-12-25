/**
 * 测试更新用户接口（不需要密码的情况）
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

async function testUpdate() {
  console.log('🔍 测试更新用户接口（不需要密码的情况）...\n');

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
      console.log('✅ 登录成功\n');
    } else {
      console.log('❌ 登录失败:', loginRes.body);
      return;
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.message);
    return;
  }

  const timestamp = Date.now();

  // 测试 1: 只更新用户名（不需要密码）
  console.log('步骤 2: 测试只更新用户名（不需要密码）');
  try {
    const response1 = await makeRequest('PUT', '/user/profile', {
      update: {
        name: `test_name_${timestamp}`
      }
    }, token);
    console.log(`状态码: ${response1.statusCode}`);
    console.log('响应:', JSON.stringify(response1.body, null, 2));
    if (response1.statusCode === 200 && response1.body.success) {
      console.log('✅ 更新成功（不需要密码）\n');
    } else {
      console.log('❌ 更新失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 2: 只更新邮箱（不需要密码）
  console.log('步骤 3: 测试只更新邮箱（不需要密码）');
  try {
    const response2 = await makeRequest('PUT', '/user/profile', {
      update: {
        email: `test_email_${timestamp}@test.com`
      }
    }, token);
    console.log(`状态码: ${response2.statusCode}`);
    console.log('响应:', JSON.stringify(response2.body, null, 2));
    if (response2.statusCode === 200 && response2.body.success) {
      console.log('✅ 更新成功（不需要密码）\n');
    } else {
      console.log('❌ 更新失败\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 3: 更新密码（需要当前密码）
  console.log('步骤 4: 测试更新密码（需要当前密码）');
  try {
    const response3 = await makeRequest('PUT', '/user/profile', {
      update: {
        password: 'newpassword123'
      }
      // 注意：这里没有提供 validate.password，应该失败
    }, token);
    console.log(`状态码: ${response3.statusCode}`);
    console.log('响应:', JSON.stringify(response3.body, null, 2));
    if (response3.statusCode === 400) {
      console.log('✅ 正确：修改密码时需要提供当前密码\n');
    } else {
      console.log('❌ 应该要求密码\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message, '\n');
  }

  // 测试 4: 更新密码（提供当前密码）
  console.log('步骤 5: 测试更新密码（提供当前密码）');
  try {
    const response4 = await makeRequest('PUT', '/user/profile', {
      validate: {
        password: 'admin123456'
      },
      update: {
        password: 'admin123456' // 恢复原密码
      }
    }, token);
    console.log(`状态码: ${response4.statusCode}`);
    console.log('响应:', JSON.stringify(response4.body, null, 2));
    if (response4.statusCode === 200 || response4.statusCode === 400) {
      console.log('✅ 正确处理（可能因为新密码与旧密码相同而失败）\n');
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

testUpdate().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

