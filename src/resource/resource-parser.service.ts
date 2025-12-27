import fs from 'fs';
import path from 'path';
// @ts-ignore - pdf-parse 类型定义不完整
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { AIParseResult } from './resource-auto-meta.model';

/**
 * 从PDF文件中提取文本
 */
export async function extractTextFromPDF(filePath: string, maxPages: number = 5): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer, {
      max: maxPages * 1000, // 大约每页1000字符
    });

    // 限制提取的文本长度（前8000字符）
    const text = data.text.substring(0, 8000);
    return text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw error;
  }
}

/**
 * 从DOCX文件中提取文本
 */
export async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;

    // 限制提取的文本长度（前8000字符）
    return text.substring(0, 8000);
  } catch (error) {
    console.error('DOCX解析错误:', error);
    throw error;
  }
}

/**
 * 根据文件扩展名提取文本
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return await extractTextFromPDF(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    return await extractTextFromDOCX(filePath);
  } else {
    throw new Error('不支持的文件格式');
  }
}

/**
 * 使用AI解析教材信息
 * 注意：这里使用占位实现，实际应该调用AI API
 */
export async function parseTextbookWithAI(text: string): Promise<AIParseResult> {
  try {
    // TODO: 实际实现应该调用AI API（如OpenAI、Claude等）
    // 这里提供一个示例结构，实际使用时需要根据你的AI服务提供商进行实现
    
    // 示例：简单的关键词匹配（临时方案）
    // 实际应该使用AI API进行结构化解析
    
    const result: AIParseResult = {
      title: null,
      subject: null,
      grade: null,
      volume: null,
      textbook_version: null,
      description: null,
      confidence: 0.5,
    };

    // 简单的关键词提取示例（实际应该使用AI）
    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '道德与法治'];
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'];
    const volumes = ['上册', '下册'];
    const versions = ['人教版', '苏教版', '北师大版', '外研版', '沪教版', '冀教版', '浙教版', '湘教版'];

    // 尝试提取学科
    for (const subject of subjects) {
      if (text.includes(subject)) {
        result.subject = subject;
        break;
      }
    }

    // 尝试提取年级
    for (const grade of grades) {
      if (text.includes(grade)) {
        result.grade = grade;
        break;
      }
    }

    // 尝试提取册别
    for (const volume of volumes) {
      if (text.includes(volume)) {
        result.volume = volume;
        break;
      }
    }

    // 尝试提取版本
    for (const version of versions) {
      if (text.includes(version)) {
        result.textbook_version = version;
        break;
      }
    }

    // 提取标题（取前50个字符作为标题）
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      result.title = lines[0].substring(0, 50);
    }

    // 生成描述（取前200个字符）
    if (text.length > 200) {
      result.description = text.substring(0, 200) + '...';
    } else {
      result.description = text;
    }

    return result;
  } catch (error) {
    console.error('AI解析错误:', error);
    return {
      title: null,
      subject: null,
      grade: null,
      volume: null,
      textbook_version: null,
      description: null,
      confidence: 0,
    };
  }
}

/**
 * 生成封面图（PDF：截取第一页；DOCX：生成占位图）
 */
export async function generateCoverImage(filePath: string, resourceId: number): Promise<string | null> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const coverDir = path.join(process.cwd(), 'uploads', 'cover', 'auto');
    
    // 确保目录存在
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true });
    }

    if (ext === '.pdf') {
      // PDF封面：使用pdf-parse提取第一页，然后转换为图片
      // 注意：pdf-parse只能提取文本，不能生成图片
      // 实际应该使用pdf-lib或pdf2pic等工具
      // 这里先返回null，后续可以集成pdf2pic
      
      // TODO: 实现PDF第一页转图片
      // 临时方案：返回null，表示封面生成失败
      return null;
    } else if (ext === '.docx' || ext === '.doc') {
      // DOCX封面：生成占位图
      // TODO: 实现DOCX封面生成
      // 临时方案：返回null
      return null;
    }

    return null;
  } catch (error) {
    console.error('封面生成错误:', error);
    return null;
  }
}

