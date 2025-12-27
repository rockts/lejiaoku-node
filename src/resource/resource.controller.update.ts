/**
 * 资源编辑接口
 * PUT /api/resources/:id
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceByIdForAdmin, updateResource } from './resource.service';
import { enrichResourceWithCatalogInfo } from './resource-helper.service';
import { getFullUrl } from './resource.controller';
import { bindResourceToCatalogByAutoMeta } from '../textbook/textbook.service';
import * as resourceUnitValidationService from './resource-unit-validation.service';
import { connection } from '../app/database/mysql';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

/**
 * 更新资源
 * PUT /api/resources/:id
 */
export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return next(new Error('INVALID_RESOURCE_ID'));
    }

    // 1. 获取资源信息（用于权限验证）
    const existingResource: any = await getResourceByIdForAdmin(resourceId);
    if (!existingResource) {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }

    // 2. 权限验证：admin、editor 或资源所有者可修改
    // 注意：此处的权限验证已由 resourcePermissionGuard 中间件完成
    // 这里保留作为双重检查（防御性编程）
    const userId = request.user?.id;
    const userRole = (request.user as any)?.role || 'user';
    const isAdmin = userRole === 'admin';
    const isEditor = userRole === 'editor';
    const isContributor = userRole === 'contributor';
    const isOwner = existingResource.user_id === userId;

    // user 角色不允许修改任何资源
    if (userRole === 'user') {
      return response.status(403).json({
        success: false,
        message: 'user 角色不允许修改资源',
        error: 'FORBIDDEN',
      });
    }

    // admin 和 editor 可以修改任何资源
    if (isAdmin || isEditor) {
      // 允许修改
    } else if (isContributor && isOwner) {
      // contributor 只能修改自己的资源
    } else {
      return response.status(403).json({
        success: false,
        message: '无权修改此资源',
        error: 'FORBIDDEN',
      });
    }

    // 3. 处理封面上传（如果有新封面上传，删除旧封面）
    let newCoverUrl: string | undefined;
    
    // 调试日志：检查 request.files 结构
    console.log('🔍 [更新资源] 检查封面上传:');
    console.log('  request.files:', request.files);
    console.log('  request.files?.cover:', (request.files as any)?.cover);
    
    const coverFile = request.files && (request.files as any).cover?.[0];
    console.log('  coverFile:', coverFile ? { filename: coverFile.filename, fieldname: coverFile.fieldname } : 'null');
    
    if (coverFile) {
      // 有新封面上传：使用上传的封面文件
      newCoverUrl = `/uploads/cover/${coverFile.filename}`;
      console.log('✅ [更新资源] 检测到新封面上传:', newCoverUrl);
      
      // 删除旧封面文件（如果存在）
      if (existingResource.cover_url) {
        try {
          let oldCoverPath = existingResource.cover_url;
          
          // 如果是完整URL，提取路径部分
          if (oldCoverPath.startsWith('http://') || oldCoverPath.startsWith('https://')) {
            const urlObj = new URL(oldCoverPath);
            oldCoverPath = urlObj.pathname;
          }
          
          // 转换为绝对路径
          if (oldCoverPath.startsWith('/')) {
            const absoluteCoverPath = path.join(process.cwd(), oldCoverPath);
            
            // 删除原始封面文件
            if (fs.existsSync(absoluteCoverPath)) {
              fs.unlink(absoluteCoverPath, (error) => {
                if (error) {
                  console.error(`删除旧封面文件失败: ${absoluteCoverPath}`, error);
                } else {
                  console.log(`✅ 旧封面文件已删除: ${absoluteCoverPath}`);
                }
              });
            }

            // 删除 resized 版本的封面文件
            const coverFilename = path.basename(oldCoverPath);
            const resizedDir = path.join(process.cwd(), 'uploads/cover/resized');
            const resizedSizes = ['thumbnail', 'medium', 'large'];
            
            resizedSizes.forEach((size) => {
              const resizedPath = path.join(resizedDir, `${coverFilename}-${size}`);
              if (fs.existsSync(resizedPath)) {
                fs.unlink(resizedPath, (error) => {
                  if (error) {
                    console.error(`删除旧封面 resized 文件失败: ${resizedPath}`, error);
                  } else {
                    console.log(`✅ 旧封面 resized 文件已删除: ${resizedPath}`);
                  }
                });
              }
            });
          }
        } catch (error) {
          // 删除旧封面失败不影响新封面上传，只记录错误
          console.error('删除旧封面过程中发生错误:', error);
        }
      }
    }

    // 4. 准备更新数据
    const {
      title,
      category,
      description,
      subject,
      grade,
      textbook,
      chapter_info,
      cover_url,
      unit,
      unit_index,
      catalog_id, // 教材目录ID（可选，用于绑定教材目录）
    } = request.body;

    // 【系统级不变量】教材单元完整性硬约束
    // 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
    const isBoundToCatalog = await resourceUnitValidationService.isResourceBoundToCatalog(resourceId);
    
    // 如果资源已绑定 catalog，且更新后 unit 为空，则拒绝
    if (isBoundToCatalog) {
      const newUnit = unit !== undefined ? unit : existingResource.unit;
      if (!newUnit || (typeof newUnit === 'string' && newUnit.trim() === '')) {
        return response.status(400).json({
          success: false,
          message: '该资源已绑定教材，必须选择所属单元',
          error: 'UNIT_REQUIRED_FOR_CATALOG',
        });
      }
    }

    // 构建更新对象（只包含提供的字段）
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (grade !== undefined) updates.grade = grade;
    if (textbook !== undefined) updates.textbook = textbook;
    if (chapter_info !== undefined) updates.chapter_info = chapter_info;
    if (unit !== undefined) updates.unit = unit; // 【系统级不变量】资源所属单元（显式字段，唯一合法来源）
    if (unit_index !== undefined) updates.unit_index = unit_index;
    
    // 优先使用上传的新封面，否则使用 cover_url（如果提供）
    if (newCoverUrl) {
      updates.cover_url = newCoverUrl;
      console.log('✅ [更新资源] 将使用上传的新封面:', newCoverUrl);
    } else if (cover_url !== undefined) {
      updates.cover_url = cover_url;
      console.log('✅ [更新资源] 将使用提供的 cover_url:', cover_url);
    } else {
      console.log('⚠️ [更新资源] 没有提供新封面，cover_url 保持不变');
    }
    
    console.log('📦 [更新资源] 更新对象:', JSON.stringify(updates, null, 2));

    // 如果没有要更新的字段，返回错误
    if (Object.keys(updates).length === 0) {
      return response.status(400).send({
        success: false,
        message: '没有提供要更新的字段',
      });
    }

    // 5. 执行更新
    try {
      await updateResource(resourceId, updates);
      console.log('✅ [更新资源] 数据库更新成功');
    } catch (error) {
      console.error('❌ [更新资源] 数据库更新失败:', error);
      // 如果是数据库错误，返回更详细的错误信息
      if ((error as any).code) {
        console.error('  错误代码:', (error as any).code);
        console.error('  错误消息:', (error as any).sqlMessage || (error as any).message);
      }
      throw error; // 重新抛出错误，让错误处理器处理
    }

    // 6. 处理教材目录绑定（如果提供了 catalog_id）
    if (catalog_id !== undefined && catalog_id !== null && catalog_id !== '') {
      const catalogIdNum = parseInt(String(catalog_id), 10);
      if (!isNaN(catalogIdNum)) {
        try {
          // 验证教材目录是否存在
          const [catalogCheck]: any = await connection.promise().query(
            'SELECT id FROM textbook_catalog WHERE id = ?',
            [catalogIdNum]
          );
          
          if (!catalogCheck || catalogCheck.length === 0) {
            console.warn(`⚠️ [更新资源] 教材目录 ${catalogIdNum} 不存在，跳过绑定`);
          } else {
            // 绑定资源到教材目录（幂等操作）
            const bindStatement = `
              INSERT INTO resource_textbook_map (resource_id, textbook_catalog_id, source)
              VALUES (?, ?, 'manual')
              ON DUPLICATE KEY UPDATE 
                textbook_catalog_id = VALUES(textbook_catalog_id),
                source = 'manual',
                updated_at = CURRENT_TIMESTAMP
            `;
            
            await connection.promise().query(bindStatement, [resourceId, catalogIdNum]);
            console.log(`✅ [更新资源] 已绑定资源 ${resourceId} 到教材目录 ${catalogIdNum}`);
            
            // 如果绑定了 catalog，必须确保 unit 不为空
            const finalUnit = unit !== undefined ? unit : existingResource.unit;
            if (!finalUnit || (typeof finalUnit === 'string' && finalUnit.trim() === '')) {
              console.warn(`⚠️ [更新资源] 资源 ${resourceId} 已绑定教材目录，但 unit 为空`);
              // 这里不强制要求，因为用户可能稍后填写 unit
            }
          }
        } catch (bindError) {
          console.error(`❌ [更新资源] 绑定教材目录失败:`, bindError);
          // 绑定失败不影响资源更新，只记录错误
        }
      }
    }
    
    // 7. 如果修改了 subject/grade/textbook 等字段，可以尝试自动匹配教材目录
    // 这里暂时不自动更新，因为需要匹配 textbook_catalog 表
    // 如果需要，可以调用 bindResourceToCatalogByAutoMeta 函数

    // 7. 获取更新后的资源
    const updatedResource: any = await getResourceByIdForAdmin(resourceId);

    // 8. 转换 URL（如果需要）
    if (updatedResource.file_url && updatedResource.file_url.startsWith('/')) {
      updatedResource.file_url = getFullUrl(request, updatedResource.file_url);
    }
    if (updatedResource.cover_url && updatedResource.cover_url.startsWith('/')) {
      updatedResource.cover_url = getFullUrl(request, updatedResource.cover_url);
    }

    // 9. 添加 catalog_info（如果已绑定教材目录）
    const resourceWithCatalogInfo = await enrichResourceWithCatalogInfo(updatedResource);

    // 10. 返回更新后的资源
    response.send(resourceWithCatalogInfo);
  } catch (error) {
    if ((error as any).message === 'NOT_FOUND') {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }
    console.error('更新资源失败:', error);
    next(error);
  }
};

