/**
 * 资源编辑接口
 * PUT /api/resources/:id
 */

import { Request, Response, NextFunction } from 'express';
import { getResourceByIdForAdmin, updateResource } from './resource.service';
import { enrichResourceWithCatalogInfo } from './resource-helper.service';
import { getFullUrl } from './resource.controller';
import { bindResourceToCatalogByAutoMeta } from '../textbook/textbook.service';

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

    // 3. 准备更新数据
    const {
      title,
      category,
      description,
      subject,
      grade,
      textbook,
      chapter_info,
      cover_url,
    } = request.body;

    // 构建更新对象（只包含提供的字段）
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (grade !== undefined) updates.grade = grade;
    if (textbook !== undefined) updates.textbook = textbook;
    if (chapter_info !== undefined) updates.chapter_info = chapter_info;
    if (cover_url !== undefined) updates.cover_url = cover_url;

    // 如果没有要更新的字段，返回错误
    if (Object.keys(updates).length === 0) {
      return response.status(400).send({
        success: false,
        message: '没有提供要更新的字段',
      });
    }

    // 4. 执行更新
    await updateResource(resourceId, updates);

    // 5. 如果修改了 subject/grade/textbook 等字段，尝试更新 catalog_info
    // 这里暂时不自动更新，因为需要匹配 textbook_catalog 表
    // 如果需要，可以调用 bindResourceToCatalogByAutoMeta 函数

    // 6. 获取更新后的资源
    const updatedResource: any = await getResourceByIdForAdmin(resourceId);

    // 7. 转换 URL（如果需要）
    if (updatedResource.file_url && updatedResource.file_url.startsWith('/')) {
      updatedResource.file_url = getFullUrl(request, updatedResource.file_url);
    }
    if (updatedResource.cover_url && updatedResource.cover_url.startsWith('/')) {
      updatedResource.cover_url = getFullUrl(request, updatedResource.cover_url);
    }

    // 8. 添加 catalog_info（如果已绑定教材目录）
    const resourceWithCatalogInfo = await enrichResourceWithCatalogInfo(updatedResource);

    // 9. 返回更新后的资源
    response.send(resourceWithCatalogInfo);
  } catch (error) {
    if ((error as any).message === 'NOT_FOUND') {
      return next(new Error('RESOURCE_NOT_FOUND'));
    }
    console.error('更新资源失败:', error);
    next(error);
  }
};

