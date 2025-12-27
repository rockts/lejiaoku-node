import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { TextbookModel, TextbookStructureModel } from './textbook.model';

/**
 * 从PDF文件名和内容提取教材基本信息
 */
export async function extractTextbookInfo(
  filePath: string,
  filename: string,
  resourceId: number
): Promise<Partial<TextbookModel>> {
  const info: Partial<TextbookModel> = {
    resource_id: resourceId,
  };

  // 从文件名提取基本信息
  const nameWithoutExt = filename
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+-/, '')
    .replace(/^file-?/, '');

  // 学科关键词
  const subjects = ['语文', '数学', '英语', '道德与法治', '科学', '物理', '化学', '生物'];
  for (const subject of subjects) {
    if (nameWithoutExt.includes(subject)) {
      info.subject = subject;
      break;
    }
  }

  // 学段关键词
  if (nameWithoutExt.includes('小学') || nameWithoutExt.includes('小')) {
    info.education_level = '小学';
  } else if (nameWithoutExt.includes('初中') || nameWithoutExt.includes('初')) {
    info.education_level = '初中';
  }

  // 版本关键词
  const versions = ['人教版', '苏教版', '北师大版'];
  for (const version of versions) {
    if (nameWithoutExt.includes(version)) {
      info.textbook_version = version;
      break;
    }
  }

  // 册次关键词
  if (nameWithoutExt.includes('上册') || nameWithoutExt.includes('上')) {
    info.volume = '上册';
  } else if (nameWithoutExt.includes('下册') || nameWithoutExt.includes('下')) {
    info.volume = '下册';
  } else if (nameWithoutExt.includes('全一册')) {
    info.volume = '全一册';
  }

  // 从PDF内容提取更多信息（前3页）
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, { max: 3000 }); // 前3页
    const text = pdfData.text.substring(0, 5000);

    // 如果文件名中没有识别到学科，从内容中提取
    if (!info.subject) {
      for (const subject of subjects) {
        if (text.includes(subject)) {
          info.subject = subject;
          break;
        }
      }
    }

    // 提取标题（第一行的非空文本）
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0 && lines[0].length > 5 && lines[0].length < 100) {
      info.title = lines[0];
    }

    // 提取描述（前200字）
    if (text.length > 200) {
      info.description = text.substring(0, 200) + '...';
    } else {
      info.description = text;
    }
  } catch (error) {
    console.error('PDF解析错误:', error);
  }

  // 如果没有识别到标题，使用文件名（清理后）
  if (!info.title) {
    info.title = nameWithoutExt || filename.replace(/\.[^.]+$/, '');
  }

  // 设置默认值
  if (!info.education_level) {
    info.education_level = '小学'; // 默认小学
  }
  if (!info.volume) {
    info.volume = '上册'; // 默认上册
  }

  return info;
}

/**
 * 从PDF内容解析目录结构
 */
export async function parseTextbookStructure(
  filePath: string,
  textbookId: number
): Promise<TextbookStructureModel[]> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, { max: 10 }); // 前10页（通常目录在前10页）
    const text = pdfData.text;

    // 查找目录部分（通常在"目录"、"Contents"之后）
    const tocKeywords = ['目录', 'Contents', 'CONTENTS'];
    let tocStartIndex = -1;
    
    for (const keyword of tocKeywords) {
      const index = text.indexOf(keyword);
      if (index >= 0) {
        tocStartIndex = index + keyword.length;
        break;
      }
    }

    // 如果没有找到"目录"，从前1000字符开始
    if (tocStartIndex < 0) {
      tocStartIndex = 0;
    }

    // 提取目录文本（最多5000字符）
    const tocText = text.substring(tocStartIndex, tocStartIndex + 5000);

    // 解析目录结构
    const structures = parseTocText(tocText, textbookId);

    return structures;
  } catch (error) {
    console.error('解析目录结构失败:', error);
    return [];
  }
}

/**
 * 解析目录文本，提取层级结构
 */
function parseTocText(text: string, textbookId: number): TextbookStructureModel[] {
  const structures: TextbookStructureModel[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentUnit: TextbookStructureModel | null = null;
  let unitOrderIndex = 0;
  let lessonOrderIndex = 0;

  for (const line of lines) {
    // 跳过页码行（只包含数字或数字+...）
    if (/^\d+\.?\.\.?\.?\d*$/.test(line)) {
      continue;
    }

    // Level 1: 单元（Unit）
    // 匹配模式：第一单元、第1单元、Unit 1、第一单元 xxx
    const unitMatch = line.match(/^(第[一二三四五六七八九十\d]+单元|Unit\s*\d+|单元\s*\d+)[^\d]*(.+)?/i);
    if (unitMatch) {
      // 保存上一个单元
      if (currentUnit) {
        structures.push(currentUnit);
      }

      // 创建新单元
      const unitTitle = unitMatch[0].trim();
      currentUnit = {
        textbook_id: textbookId,
        level: 1,
        parent_id: null,
        order_index: unitOrderIndex++,
        title: unitTitle,
        description: null,
        raw_text: line,
      };
      lessonOrderIndex = 0; // 重置课序号
      continue;
    }

    // Level 2: 课/章节（Lesson/Chapter）
    // 匹配模式：第1课、第1章、Lesson 1、1. xxx、第一章 xxx
    const lessonMatch = line.match(/^(第[一二三四五六七八九十\d]+[课章]|Lesson\s*\d+|Chapter\s*\d+|\d+[\.、])\s*(.+)/i);
    if (lessonMatch) {
      if (currentUnit) {
        // 有单元，作为课添加到单元下
        structures.push({
          textbook_id: textbookId,
          level: 2,
          parent_id: currentUnit.id || null, // 将在插入后设置
          order_index: lessonOrderIndex++,
          title: line.trim(),
          description: null,
          raw_text: line,
        });
      } else {
        // 没有单元，直接作为顶级课（Level 2）
        structures.push({
          textbook_id: textbookId,
          level: 2,
          parent_id: null,
          order_index: lessonOrderIndex++,
          title: line.trim(),
          description: null,
          raw_text: line,
        });
      }
      continue;
    }

    // Level 3: 子目（可选）
    // 匹配模式：1.1、1-1、一、等
    const subItemMatch = line.match(/^[\d一二三四五六七八九十]+[\.、\-]\s*(.+)/);
    if (subItemMatch && structures.length > 0) {
      // 找到最近的 Level 2 节点作为父节点
      let parentNode: any = null;
      for (let i = structures.length - 1; i >= 0; i--) {
        if (structures[i].level === 2) {
          parentNode = structures[i];
          break;
        }
      }

      if (parentNode) {
        structures.push({
          textbook_id: textbookId,
          level: 3,
          parent_id: parentNode.id || null,
          order_index: 0,
          title: line.trim(),
          description: null,
          raw_text: line,
        });
      }
    }
  }

  // 保存最后一个单元
  if (currentUnit) {
    structures.push(currentUnit);
  }

  return structures;
}


