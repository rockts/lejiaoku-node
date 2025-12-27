/**
 * 资源解析工作器
 * 异步处理资源文件的AI解析
 */
import path from 'path';
import fs from 'fs';
import {
  extractTextFromFile,
  parseTextbookWithAI,
  generateCoverImage,
} from './resource-parser.service';
import {
  createOrUpdateAutoMeta,
} from './resource-auto-meta.service';
import { ResourceAutoMetaModel } from './resource-auto-meta.model';

/**
 * 异步处理资源解析
 */
export async function processResourceAsync(resourceId: number, filePath: string) {
  // 异步执行，不阻塞主流程
  setImmediate(async () => {
    try {
      console.log(`[资源解析] 开始处理资源 ID: ${resourceId}, 文件: ${filePath}`);

      // 初始化状态为 processing
      await createOrUpdateAutoMeta({
        resource_id: resourceId,
        status: 'processing',
      });

      // 检查文件是否存在
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        console.error(`[资源解析] 文件不存在: ${absolutePath}`);
        await createOrUpdateAutoMeta({
          resource_id: resourceId,
          status: 'failed',
        });
        return;
      }

      // 1. 提取文本
      let text: string;
      try {
        text = await extractTextFromFile(absolutePath);
        if (!text || text.trim().length === 0) {
          throw new Error('无法从文件中提取文本');
        }
        console.log(`[资源解析] 文本提取成功，长度: ${text.length}`);
      } catch (error) {
        console.error(`[资源解析] 文本提取失败:`, error);
        await createOrUpdateAutoMeta({
          resource_id: resourceId,
          status: 'failed',
        });
        return;
      }

      // 2. AI解析
      let aiResult;
      try {
        aiResult = await parseTextbookWithAI(text);
        console.log(`[资源解析] AI解析完成:`, aiResult);
      } catch (error) {
        console.error(`[资源解析] AI解析失败:`, error);
        // AI失败不影响流程，设置为failed状态
        await createOrUpdateAutoMeta({
          resource_id: resourceId,
          status: 'failed',
        });
        return;
      }

      // 3. 生成封面（可选，失败不影响主流程）
      let coverUrl: string | null = null;
      try {
        coverUrl = await generateCoverImage(absolutePath, resourceId);
        if (coverUrl) {
          console.log(`[资源解析] 封面生成成功: ${coverUrl}`);
        }
      } catch (error) {
        console.error(`[资源解析] 封面生成失败（不影响主流程）:`, error);
      }

      // 4. 保存解析结果
      const meta: ResourceAutoMetaModel = {
        resource_id: resourceId,
        auto_title: aiResult.title,
        auto_subject: aiResult.subject,
        auto_grade: aiResult.grade,
        auto_volume: aiResult.volume,
        auto_version: aiResult.textbook_version,
        auto_description: aiResult.description,
        auto_cover_url: coverUrl,
        confidence: aiResult.confidence,
        status: 'completed',
      };

      await createOrUpdateAutoMeta(meta);
      console.log(`[资源解析] 资源 ID ${resourceId} 解析完成`);

    } catch (error) {
      console.error(`[资源解析] 资源 ID ${resourceId} 解析失败:`, error);
      // 确保失败状态被记录
      try {
        await createOrUpdateAutoMeta({
          resource_id: resourceId,
          status: 'failed',
        });
      } catch (updateError) {
        console.error(`[资源解析] 更新失败状态时出错:`, updateError);
      }
    }
  });
}


