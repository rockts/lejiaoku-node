#!/usr/bin/env node

/**
 * AI 自动识别脚本 - 资源元数据补全
 * 
 * 功能：
 * 1. 扫描 resource 表中 auto_meta_status = 'pending' 的资源
 * 2. 根据文件名和文档内容识别元数据
 * 3. 将结果写入 resource.auto_meta_result 和更新 auto_meta_status
 * 
 * 运行方式：
 * node scripts/auto-meta-generate.js
 */

const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 创建数据库连接
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT, 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

// 学科关键词映射
const SUBJECT_KEYWORDS = {
  '语文': ['语文', '语文', '汉语', '中文', '语文课', '语文教材'],
  '数学': ['数学', '数学', '算数', '数学课', '数学教材'],
  '英语': ['英语', 'English', '英文', '英语课', '英语教材'],
  '物理': ['物理', '物理课', '物理教材'],
  '化学': ['化学', '化学课', '化学教材'],
  '生物': ['生物', '生物课', '生物教材'],
  '历史': ['历史', '历史课', '历史教材'],
  '地理': ['地理', '地理课', '地理教材'],
  '政治': ['政治', '政治课', '思想品德', '道德与法治'],
  '科学': ['科学', '科学课', '科学教材']
};

// 教材版本关键词
const TEXTBOOK_VERSION_KEYWORDS = {
  '人教版': ['人教版', '人民教育出版社', '人民教育'],
  '苏教版': ['苏教版', '江苏教育出版社', '江苏教育'],
  '北师大版': ['北师大版', '北京师范大学出版社', '北师大'],
  '华师大版': ['华师大版', '华东师范大学出版社', '华师大'],
  '外研版': ['外研版', '外语教学与研究出版社', '外研社'],
  '鲁教版': ['鲁教版', '山东教育出版社', '山东教育'],
  '冀教版': ['冀教版', '河北教育出版社', '河北教育'],
  '湘教版': ['湘教版', '湖南教育出版社', '湖南教育'],
  '西师版': ['西师版', '西南师范大学出版社', '西师大']
};

// 年级关键词映射
const GRADE_KEYWORDS = {
  '一年级': ['一年级', '1年级', '一上', '一下', 'Grade 1'],
  '二年级': ['二年级', '2年级', '二上', '二下', 'Grade 2'],
  '三年级': ['三年级', '3年级', '三上', '三下', 'Grade 3'],
  '四年级': ['四年级', '4年级', '四上', '四下', 'Grade 4'],
  '五年级': ['五年级', '5年级', '五上', '五下', 'Grade 5'],
  '六年级': ['六年级', '6年级', '六上', '六下', 'Grade 6'],
  '七年级': ['七年级', '7年级', '七上', '七下', 'Grade 7', '初一', '初一上', '初一下'],
  '八年级': ['八年级', '8年级', '八上', '八下', 'Grade 8', '初二', '初二上', '初二下'],
  '九年级': ['九年级', '9年级', '九上', '九下', 'Grade 9', '初三', '初三上', '初三下'],
  '高一': ['高一', '高一年级', 'Grade 10'],
  '高二': ['高二', '高二年级', 'Grade 11'],
  '高三': ['高三', '高三年级', 'Grade 12']
};

// 册别关键词
const VOLUME_KEYWORDS = {
  '上册': ['上册', '上', '第一册', '第1册'],
  '下册': ['下册', '下', '第二册', '第2册']
};

/**
 * 从文件名提取信息
 */
function extractFromFilename(filename) {
  const result = {
    title: null,
    subject: null,
    grade: null,
    textbook: null,
    chapter_info: null
  };

  // 移除文件扩展名和路径前缀（如时间戳）
  // 处理格式：1766504237720-file.pdf -> file
  const nameWithoutExt = filename
    .replace(/\.[^.]+$/, '')  // 移除扩展名
    .replace(/^\d+-/, '')     // 移除开头的数字和时间戳
    .replace(/^file-?/, '');  // 移除 "file" 前缀

  // 识别学科
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameWithoutExt.includes(keyword)) {
        result.subject = subject;
        break;
      }
    }
    if (result.subject) break;
  }

  // 识别年级
  for (const [grade, keywords] of Object.entries(GRADE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameWithoutExt.includes(keyword)) {
        result.grade = grade;
        break;
      }
    }
    if (result.grade) break;
  }

  // 识别册别
  let volume = null;
  for (const [vol, keywords] of Object.entries(VOLUME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameWithoutExt.includes(keyword)) {
        volume = vol;
        break;
      }
    }
    if (volume) break;
  }

  // 组合年级和册别
  if (result.grade && volume) {
    result.grade = `${result.grade}${volume}`;
  }

  // 识别教材版本
  for (const [version, keywords] of Object.entries(TEXTBOOK_VERSION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameWithoutExt.includes(keyword)) {
        result.textbook = version;
        break;
      }
    }
    if (result.textbook) break;
  }

  // 提取章节信息（如"第一单元"、"第3章"等）
  const chapterMatch = nameWithoutExt.match(/(第[一二三四五六七八九十\d]+单元|第[一二三四五六七八九十\d]+章|Unit\s*\d+|Chapter\s*\d+)/);
  if (chapterMatch) {
    result.chapter_info = chapterMatch[1];
  }

  return result;
}

/**
 * 从文本内容提取信息
 */
function extractFromText(text) {
  const result = {
    title: null,
    subject: null,
    grade: null,
    textbook: null,
    chapter_info: null,
    description: null
  };

  // 只取前 5000 字符进行分析
  const textToAnalyze = text.substring(0, 5000);

  // 识别学科
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        result.subject = subject;
        break;
      }
    }
    if (result.subject) break;
  }

  // 识别年级
  for (const [grade, keywords] of Object.entries(GRADE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        result.grade = grade;
        break;
      }
    }
    if (result.grade) break;
  }

  // 识别册别
  let volume = null;
  for (const [vol, keywords] of Object.entries(VOLUME_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        volume = vol;
        break;
      }
    }
    if (volume) break;
  }

  // 组合年级和册别
  if (result.grade && volume) {
    result.grade = `${result.grade}${volume}`;
  }

  // 识别教材版本
  for (const [version, keywords] of Object.entries(TEXTBOOK_VERSION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        result.textbook = version;
        break;
      }
    }
    if (result.textbook) break;
  }

  // 提取章节信息
  const chapterMatch = textToAnalyze.match(/(第[一二三四五六七八九十\d]+单元[^。，\n]*|第[一二三四五六七八九十\d]+章[^。，\n]*|Unit\s*\d+[^。，\n]*|Chapter\s*\d+[^。，\n]*)/);
  if (chapterMatch) {
    result.chapter_info = chapterMatch[1].trim();
  }

  // 生成描述（取前 120 字）
  const description = textToAnalyze
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
  if (description.length > 0) {
    result.description = description;
  }

  return result;
}

/**
 * 提取 PDF 文本
 */
async function extractPdfText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    // 只取前 3 页的内容（假设每页约 2000 字符）
    return data.text.substring(0, 6000);
  } catch (error) {
    throw new Error(`PDF 解析失败: ${error.message}`);
  }
}

/**
 * 提取 DOCX 文本
 */
async function extractDocxText(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    // 只取前 6000 字符
    return result.value.substring(0, 6000);
  } catch (error) {
    throw new Error(`DOCX 解析失败: ${error.message}`);
  }
}

/**
 * 提取 DOC 文本（简单处理，实际可能需要其他库）
 */
async function extractDocText(filePath) {
  // DOC 格式较复杂，这里先返回空，实际可以使用 antiword 或其他工具
  throw new Error('DOC 格式暂不支持，请转换为 DOCX');
}

/**
 * 识别资源元数据
 */
async function recognizeResource(resource) {
  try {
    // 处理文件路径（可能是相对路径或绝对路径）
    let filePath;
    if (path.isAbsolute(resource.file_url)) {
      filePath = resource.file_url;
    } else if (resource.file_url.startsWith('/')) {
      // 相对路径，如 /uploads/resources/xxx.pdf
      filePath = path.join(process.cwd(), resource.file_url);
    } else {
      // 相对路径，如 uploads/resources/xxx.pdf
      filePath = path.join(process.cwd(), resource.file_url);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 从文件名提取信息
    const filename = path.basename(resource.file_url);
    const filenameInfo = extractFromFilename(filename);

    // 从文件内容提取文本
    let text = '';
    const fileFormat = resource.file_format.toLowerCase();
    
    if (fileFormat === 'pdf') {
      text = await extractPdfText(filePath);
    } else if (fileFormat === 'docx') {
      text = await extractDocxText(filePath);
    } else if (fileFormat === 'doc') {
      // DOC 格式暂不支持
      text = '';
    } else if (fileFormat === 'ppt' || fileFormat === 'pptx') {
      // PPT 格式文本提取较复杂，这里先跳过
      text = '';
    }

    // 从文本提取信息
    const textInfo = text ? extractFromText(text) : {};

    // 合并结果（文本信息优先于文件名信息）
    const result = {
      title: resource.title || filenameInfo.title || textInfo.title || null,
      subject: textInfo.subject || filenameInfo.subject || null,
      grade: textInfo.grade || filenameInfo.grade || null,
      textbook: textInfo.textbook || filenameInfo.textbook || null,
      chapter_info: textInfo.chapter_info || filenameInfo.chapter_info || null,
      description: textInfo.description || null
    };

    // 标记哪些字段可信（从文本提取的字段更可信）
    const confidence = {
      title: result.title ? (textInfo.title ? 'high' : 'medium') : 'low',
      subject: result.subject ? (textInfo.subject ? 'high' : 'medium') : 'low',
      grade: result.grade ? (textInfo.grade ? 'high' : 'medium') : 'low',
      textbook: result.textbook ? (textInfo.textbook ? 'high' : 'medium') : 'low',
      chapter_info: result.chapter_info ? (textInfo.chapter_info ? 'high' : 'medium') : 'low',
      description: result.description ? 'high' : 'low'
    };

    return {
      success: true,
      result: result,
      confidence: confidence,
      error_reason: null
    };
  } catch (error) {
    return {
      success: false,
      result: null,
      confidence: null,
      error_reason: error.message
    };
  }
}

/**
 * 更新资源元数据
 */
async function updateResourceMeta(resourceId, autoMetaResult, autoMetaStatus, errorReason) {
  return new Promise((resolve, reject) => {
    const updateData = {
      auto_meta_status: autoMetaStatus,
      auto_meta_result: autoMetaResult ? JSON.stringify(autoMetaResult) : null
    };

    // 如果有错误原因，也存储到 auto_meta_result 中
    if (errorReason) {
      updateData.auto_meta_result = JSON.stringify({
        error_reason: errorReason
      });
    }

    connection.query(
      'UPDATE resource SET auto_meta_status = ?, auto_meta_result = ? WHERE id = ?',
      [updateData.auto_meta_status, updateData.auto_meta_result, resourceId],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始执行 AI 自动识别脚本...\n');

  try {
    // 查询需要处理的资源
    const query = `
      SELECT id, title, file_url, file_format, auto_meta_status
      FROM resource
      WHERE auto_meta_status = 'pending'
        AND file_format IN ('PDF', 'DOC', 'DOCX', 'PPT', 'PPTX')
      ORDER BY id ASC
    `;

    connection.query(query, async (err, resources) => {
      if (err) {
        console.error('❌ 查询资源失败:', err);
        connection.end();
        process.exit(1);
      }

      if (resources.length === 0) {
        console.log('✅ 没有需要处理的资源\n');
        connection.end();
        process.exit(0);
      }

      console.log(`📋 找到 ${resources.length} 个待处理资源\n`);

      let successCount = 0;
      let failCount = 0;

      // 逐个处理资源
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        console.log(`[${i + 1}/${resources.length}] 处理资源 ID: ${resource.id} - ${resource.title}`);

        try {
          const recognition = await recognizeResource(resource);

          if (recognition.success) {
            // 合并结果和置信度
            const finalResult = {
              ...recognition.result,
              confidence: recognition.confidence,
              recognized_at: new Date().toISOString()
            };

            await updateResourceMeta(
              resource.id,
              finalResult,
              'done',
              null
            );

            console.log(`  ✅ 识别成功`);
            console.log(`     - 学科: ${finalResult.subject || '(未识别)'}`);
            console.log(`     - 年级: ${finalResult.grade || '(未识别)'}`);
            console.log(`     - 版本: ${finalResult.textbook || '(未识别)'}`);
            console.log(`     - 章节: ${finalResult.chapter_info || '(未识别)'}`);
            successCount++;
          } else {
            await updateResourceMeta(
              resource.id,
              null,
              'failed',
              recognition.error_reason
            );

            console.log(`  ❌ 识别失败: ${recognition.error_reason}`);
            failCount++;
          }
        } catch (error) {
          console.error(`  ❌ 处理失败: ${error.message}`);
          await updateResourceMeta(
            resource.id,
            null,
            'failed',
            error.message
          );
          failCount++;
        }

        console.log('');
      }

      console.log('📊 处理完成统计:');
      console.log(`  ✅ 成功: ${successCount}`);
      console.log(`  ❌ 失败: ${failCount}`);
      console.log(`  📦 总计: ${resources.length}\n`);

      connection.end();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 执行失败:', error);
    connection.end();
    process.exit(1);
  }
}

// 执行主函数
main();

