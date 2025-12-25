/**
 * 资源删除接口
 * DELETE /api/resources/:id
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { connection } from '../app/database/mysql';
import { getResourceByIdForAdmin } from './resource.service';

/**
 * 删除资源
 * DELETE /api/resources/:id
 * 权限：仅创建者或 admin 可删除
 */
export const destroy = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const resourceId = parseInt(id, 10);

    if (isNaN(resourceId)) {
      return response.status(400).json({
        success: false,
        message: '无效的资源ID',
        error: 'INVALID_RESOURCE_ID',
      });
    }

    // 1. 获取资源信息（用于权限验证，已在 resourcePermissionGuard 中完成，这里作为双重检查）
    const existingResource: any = await getResourceByIdForAdmin(resourceId);
    if (!existingResource) {
      return response.status(404).json({
        success: false,
        message: '资源不存在',
        error: 'RESOURCE_NOT_FOUND',
      });
    }

    // 2. 权限验证（已在 resourcePermissionGuard 中完成，这里保留作为双重检查）
    // 删除权限规则：admin 可删除任何资源，user 不允许删除，contributor/editor 只能删除自己的资源
    const userId = request.user?.id;
    const userRole = (request.user as any)?.role || 'user';
    const isAdmin = userRole === 'admin';
    const isOwner = existingResource.user_id === userId;

    // user 角色不允许删除任何资源
    if (userRole === 'user') {
      return response.status(403).json({
        success: false,
        message: 'user 角色不允许删除资源',
        error: 'FORBIDDEN',
      });
    }

    // admin 可以删除任何资源
    if (isAdmin) {
      // 允许删除
    } else if (isOwner) {
      // contributor 和 editor 只能删除自己的资源
    } else {
      return response.status(403).json({
        success: false,
        message: '无权删除此资源',
        error: 'FORBIDDEN',
      });
    }

    // 3. 删除文件系统中的文件
    try {
      // 删除资源文件（file_url）
      if (existingResource.file_url) {
        let filePath = existingResource.file_url;
        
        // 如果是完整URL，提取路径部分
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          const urlObj = new URL(filePath);
          filePath = urlObj.pathname;
        }
        
        // 转换为绝对路径
        if (filePath.startsWith('/')) {
          const absolutePath = path.join(process.cwd(), filePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlink(absolutePath, (error) => {
              if (error) {
                console.error(`删除资源文件失败: ${absolutePath}`, error);
              } else {
                console.log(`✅ 资源文件已删除: ${absolutePath}`);
              }
            });
          }
        }
      }

      // 删除封面文件（cover_url 及其 resized 版本）
      if (existingResource.cover_url) {
        let coverPath = existingResource.cover_url;
        
        // 如果是完整URL，提取路径部分
        if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
          const urlObj = new URL(coverPath);
          coverPath = urlObj.pathname;
        }
        
        // 转换为绝对路径
        if (coverPath.startsWith('/')) {
          const absoluteCoverPath = path.join(process.cwd(), coverPath);
          
          // 删除原始封面文件
          if (fs.existsSync(absoluteCoverPath)) {
            fs.unlink(absoluteCoverPath, (error) => {
              if (error) {
                console.error(`删除封面文件失败: ${absoluteCoverPath}`, error);
              } else {
                console.log(`✅ 封面文件已删除: ${absoluteCoverPath}`);
              }
            });
          }

          // 删除 resized 版本的封面文件
          // 从 cover_url 中提取完整文件名（包含扩展名）
          // resized 文件命名格式：{完整文件名}-{size}
          // 例如：1766507487391-test-cover.png-medium
          const coverFilename = path.basename(coverPath);
          
          // 删除 resized 目录中的文件
          const resizedDir = path.join(process.cwd(), 'uploads/cover/resized');
          const resizedSizes = ['thumbnail', 'medium', 'large'];
          
          resizedSizes.forEach((size) => {
            // resized 文件格式：{完整文件名}-{size}
            const resizedPath = path.join(resizedDir, `${coverFilename}-${size}`);
            if (fs.existsSync(resizedPath)) {
              fs.unlink(resizedPath, (error) => {
                if (error) {
                  console.error(`删除封面 resized 文件失败: ${resizedPath}`, error);
                } else {
                  console.log(`✅ 封面 resized 文件已删除: ${resizedPath}`);
                }
              });
            }
          });
        }
      }
    } catch (fileError) {
      // 文件删除失败不影响数据库删除，只记录错误
      console.error('删除资源文件时出错:', fileError);
    }

    // 4. 删除数据库记录
    const statement = `
      DELETE FROM resource
      WHERE id = ?
    `;

    await connection.promise().query(statement, [resourceId]);

    // 5. 返回成功响应
    response.json({
      success: true,
      message: '资源删除成功',
      resource_id: resourceId,
    });
  } catch (error) {
    console.error('删除资源失败:', error);
    next(error);
  }
};

