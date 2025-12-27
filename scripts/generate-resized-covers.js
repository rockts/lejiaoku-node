const mysql = require('mysql2/promise');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 为封面生成 resized 版本
 */
async function generateResizedCovers() {
  let connection;

  try {
    console.log('🔧 开始为现有封面生成 Resized 版本...\n');

    // 连接数据库
    const connectionConfig = {
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '8363678',
      database: process.env.MYSQL_DATABASE || 'lejiaoku_node',
      charset: 'utf8mb4',
    };

    // 如果是本地数据库，尝试使用 socket 连接
    if ((process.env.MYSQL_HOST === 'localhost' || process.env.MYSQL_HOST === '127.0.0.1')) {
      const socketPath = '/opt/local/var/run/mariadb-10.11/mysqld.sock';
      if (fs.existsSync(socketPath)) {
        connectionConfig.socketPath = socketPath;
      } else {
        connectionConfig.host = process.env.MYSQL_HOST || '127.0.0.1';
        connectionConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
      }
    } else {
      connectionConfig.host = process.env.MYSQL_HOST || '127.0.0.1';
      connectionConfig.port = parseInt(process.env.MYSQL_PORT || '3306', 10);
    }

    connection = await mysql.createConnection(connectionConfig);

    // 确保 resized 目录存在
    const coverResizedDir = path.join(process.cwd(), 'uploads', 'cover', 'resized');
    if (!fs.existsSync(coverResizedDir)) {
      fs.mkdirSync(coverResizedDir, { recursive: true });
      console.log('✅ 创建 resized 目录:', coverResizedDir);
    }

    // 1. 处理 Cover 模块的封面
    console.log('\n📦 处理 Cover 模块的封面...');
    const [covers] = await connection.query('SELECT id, filename, mimetype FROM cover');
    console.log(`   找到 ${covers.length} 个封面`);

    let coverProcessed = 0;
    let coverSkipped = 0;
    let coverErrors = 0;

    for (const cover of covers) {
      const originalPath = path.join(process.cwd(), 'uploads', 'cover', cover.filename);
      const resizedBasePath = path.join(coverResizedDir, cover.filename);

      // 检查原始文件是否存在
      if (!fs.existsSync(originalPath)) {
        console.log(`   ⚠️  封面 ID ${cover.id}: 原始文件不存在 - ${cover.filename}`);
        coverSkipped++;
        continue;
      }

      // 检查是否已经生成了所有尺寸
      const hasLarge = fs.existsSync(`${resizedBasePath}-large`);
      const hasMedium = fs.existsSync(`${resizedBasePath}-medium`);
      const hasThumbnail = fs.existsSync(`${resizedBasePath}-thumbnail`);

      if (hasLarge && hasMedium && hasThumbnail) {
        console.log(`   ✓ 封面 ID ${cover.id}: 已存在所有尺寸 - ${cover.filename}`);
        coverSkipped++;
        continue;
      }

      try {
        // 读取图片
        const image = await Jimp.read(originalPath);
        const { width, height } = image['bitmap'];

        // 生成大尺寸（1280px宽度）
        if (width > 1280 && !hasLarge) {
          image
            .clone()
            .resize(1280, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-large`);
          console.log(`   ✅ 封面 ID ${cover.id}: 生成 large 尺寸`);
        }

        // 生成中等尺寸（640px宽度）
        if (width > 640 && !hasMedium) {
          image
            .clone()
            .resize(640, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-medium`);
          console.log(`   ✅ 封面 ID ${cover.id}: 生成 medium 尺寸`);
        }

        // 生成缩略图（320px宽度）
        if (width > 320 && !hasThumbnail) {
          image
            .clone()
            .resize(320, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-thumbnail`);
          console.log(`   ✅ 封面 ID ${cover.id}: 生成 thumbnail 尺寸`);
        }

        coverProcessed++;
      } catch (error) {
        console.error(`   ❌ 封面 ID ${cover.id}: 处理失败 - ${error.message}`);
        coverErrors++;
      }
    }

    // 2. 处理 Resource 模块的封面
    console.log('\n📦 处理 Resource 模块的封面...');
    const [resources] = await connection.query(
      "SELECT id, cover_url FROM resource WHERE cover_url IS NOT NULL AND cover_url != ''"
    );
    console.log(`   找到 ${resources.length} 个资源封面`);

    let resourceProcessed = 0;
    let resourceSkipped = 0;
    let resourceErrors = 0;

    for (const resource of resources) {
      // 从 cover_url 中提取文件名
      // cover_url 格式: /uploads/cover/{filename}
      let filename = resource.cover_url;
      if (filename.startsWith('/uploads/cover/')) {
        filename = filename.replace('/uploads/cover/', '');
      } else if (filename.startsWith('uploads/cover/')) {
        filename = filename.replace('uploads/cover/', '');
      } else {
        console.log(`   ⚠️  资源 ID ${resource.id}: 无效的 cover_url 格式 - ${resource.cover_url}`);
        resourceSkipped++;
        continue;
      }

      const originalPath = path.join(process.cwd(), 'uploads', 'cover', filename);
      const resizedBasePath = path.join(coverResizedDir, filename);

      // 检查原始文件是否存在
      if (!fs.existsSync(originalPath)) {
        console.log(`   ⚠️  资源 ID ${resource.id}: 原始文件不存在 - ${filename}`);
        resourceSkipped++;
        continue;
      }

      // 检查是否已经生成了所有尺寸
      const hasLarge = fs.existsSync(`${resizedBasePath}-large`);
      const hasMedium = fs.existsSync(`${resizedBasePath}-medium`);
      const hasThumbnail = fs.existsSync(`${resizedBasePath}-thumbnail`);

      if (hasLarge && hasMedium && hasThumbnail) {
        console.log(`   ✓ 资源 ID ${resource.id}: 已存在所有尺寸 - ${filename}`);
        resourceSkipped++;
        continue;
      }

      try {
        // 读取图片
        const image = await Jimp.read(originalPath);
        const { width, height } = image['bitmap'];

        // 生成大尺寸（1280px宽度）
        if (width > 1280 && !hasLarge) {
          image
            .clone()
            .resize(1280, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-large`);
          console.log(`   ✅ 资源 ID ${resource.id}: 生成 large 尺寸`);
        }

        // 生成中等尺寸（640px宽度）
        if (width > 640 && !hasMedium) {
          image
            .clone()
            .resize(640, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-medium`);
          console.log(`   ✅ 资源 ID ${resource.id}: 生成 medium 尺寸`);
        }

        // 生成缩略图（320px宽度）
        if (width > 320 && !hasThumbnail) {
          image
            .clone()
            .resize(320, Jimp.AUTO)
            .quality(85)
            .write(`${resizedBasePath}-thumbnail`);
          console.log(`   ✅ 资源 ID ${resource.id}: 生成 thumbnail 尺寸`);
        }

        resourceProcessed++;
      } catch (error) {
        console.error(`   ❌ 资源 ID ${resource.id}: 处理失败 - ${error.message}`);
        resourceErrors++;
      }
    }

    // 输出统计信息
    console.log('\n📊 处理完成统计：');
    console.log('\nCover 模块：');
    console.log(`   ✅ 成功处理: ${coverProcessed} 个`);
    console.log(`   ⏭️  跳过: ${coverSkipped} 个`);
    console.log(`   ❌ 错误: ${coverErrors} 个`);

    console.log('\nResource 模块：');
    console.log(`   ✅ 成功处理: ${resourceProcessed} 个`);
    console.log(`   ⏭️  跳过: ${resourceSkipped} 个`);
    console.log(`   ❌ 错误: ${resourceErrors} 个`);

    console.log('\n✨ 所有封面 Resized 处理完成！');

  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行脚本
generateResizedCovers().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

