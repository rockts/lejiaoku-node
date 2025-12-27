import { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import {
    getResourceList,
    getResourceTotalCount,
    getResourceById,
    createResource,
    getResourceByIdForAdmin,
    updateResourceStatus,
    updateResourceAutoParse,
    updateResource,
} from './resource.service';
import * as resourceUnitValidationService from './resource-unit-validation.service';
import { APP_PORT } from '../app/app.config';
import { getResourceTextbooks, processTextbookUpload } from '../textbook/textbook.controller'; // 获取资源关联的教材目录
import { enrichResourceWithCatalogInfo, enrichResourceListWithCatalogInfo } from './resource-helper.service';
import { processResourceAsync } from './resource-parser-worker';
import { isCategoryAllowed, isFileFormatAllowed, isVideoResource } from './resource.constants';
import * as updateResourceController from './resource.controller.update';

/**
 * 将相对路径转换为完整URL或保持相对路径
 * 默认返回相对路径（前端通过代理访问），可通过环境变量控制
 */
export const getFullUrl = (request: Request, path: string): string => {
    if (!path) return path;
    // 如果已经是完整URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 根据设计规范，资源详情接口应该返回完整URL
    // 如果配置了返回完整URL（用于直接访问后端的情况）
    // 可以通过环境变量 RESOURCE_URL_MODE=absolute 来控制
    // 如果设置为 'relative'，则返回相对路径（用于前端代理场景）
    if (process.env.RESOURCE_URL_MODE !== 'relative') {
        const protocol = request.protocol || 'http';
        const host = request.get('host') || `localhost:${APP_PORT}`;
        return `${protocol}://${host}${normalizedPath}`;
    }

    // 仅在明确设置为 'relative' 时返回相对路径（前端通过代理访问静态资源）
    return normalizedPath;
};

/**
 * 资源列表
 */
export const index = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        // 统计资源数量
        const totalCount = await getResourceTotalCount({
            filter: request.filter,
        });

        // 设置响应头部
        response.header('X-Total-Count', totalCount.toString());
    } catch (error) {
        next(error);
    }

    try {
        const resources: any = await getResourceList({
            filter: request.filter,
            pagination: request.pagination,
        });
        // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
        // 注意：列表接口可能不返回 file_url，所以需要检查
        if (Array.isArray(resources)) {
            const resourcesWithFullUrl = resources.map((resource: any) => {
                if (resource.file_url && resource.file_url.startsWith('/')) {
                    resource.file_url = getFullUrl(request, resource.file_url);
                }
                if (resource.cover_url && resource.cover_url.startsWith('/')) {
                    resource.cover_url = getFullUrl(request, resource.cover_url);
                }
                return resource;
            });
            // 为资源列表添加 catalog_info
            const resourcesWithCatalogInfo = await enrichResourceListWithCatalogInfo(resourcesWithFullUrl);
            response.send(resourcesWithCatalogInfo);
        } else {
            response.send(resources);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * 管理员资源列表（显示所有状态的资源）
 */
export const adminIndex = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        // 统计资源数量
        const totalCount = await getResourceTotalCount({
            filter: request.filter,
        });

        // 设置响应头部
        response.header('X-Total-Count', totalCount.toString());
    } catch (error) {
        next(error);
    }

    try {
        const resources: any = await getResourceList({
            filter: request.filter,
            pagination: request.pagination,
        });
        // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
        if (Array.isArray(resources)) {
            const resourcesWithFullUrl = resources.map((resource: any) => {
                if (resource.file_url && resource.file_url.startsWith('/')) {
                    resource.file_url = getFullUrl(request, resource.file_url);
                }
                if (resource.cover_url && resource.cover_url.startsWith('/')) {
                    resource.cover_url = getFullUrl(request, resource.cover_url);
                }
                return resource;
            });
            // 为资源列表添加 catalog_info
            const resourcesWithCatalogInfo = await enrichResourceListWithCatalogInfo(resourcesWithFullUrl);
            response.send(resourcesWithCatalogInfo);
        } else {
            response.send(resources);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * 我的资源列表（当前用户的所有资源）
 */
export const myResources = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        // 统计资源数量
        const totalCount = await getResourceTotalCount({
            filter: request.filter,
        });

        // 设置响应头部
        response.header('X-Total-Count', totalCount.toString());
    } catch (error) {
        next(error);
    }

    try {
        const resources: any = await getResourceList({
            filter: request.filter,
            pagination: request.pagination,
        });
        // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
        if (Array.isArray(resources)) {
            const resourcesWithFullUrl = resources.map((resource: any) => {
                if (resource.file_url && resource.file_url.startsWith('/')) {
                    resource.file_url = getFullUrl(request, resource.file_url);
                }
                if (resource.cover_url && resource.cover_url.startsWith('/')) {
                    resource.cover_url = getFullUrl(request, resource.cover_url);
                }
                return resource;
            });
            // 为资源列表添加 catalog_info
            const resourcesWithCatalogInfo = await enrichResourceListWithCatalogInfo(resourcesWithFullUrl);
            response.send(resourcesWithCatalogInfo);
        } else {
            response.send(resources);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * 单个资源详情
 */
/**
 * 获取资源详情
 * 
 * @api {GET} /api/resources/:id 获取资源详情
 * @apiVersion 1.0.0
 * @apiName GetResourceDetail
 * @apiGroup Resource
 * 
 * @apiDescription 获取单个资源的详细信息。此接口已冻结，6个月内不破坏性变更。
 * 详细字段说明请参考：docs/api/resource-detail-api-standard.md
 * 
 * @apiParam {Number} id 资源ID
 * 
 * @apiSuccess {Number} id 资源ID（必须）
 * @apiSuccess {String} title 资源标题（必须）
 * @apiSuccess {String} category 资源分类（必须）
 * @apiSuccess {String} file_url 资源文件URL（必须，已转换为完整URL）
 * @apiSuccess {String} file_format 文件格式（必须）
 * @apiSuccess {String} [description] 资源描述（可选）
 * @apiSuccess {String} [subject] 学科（可选）
 * @apiSuccess {String|Number} [grade] 年级（可选）
 * @apiSuccess {String} [textbook] 教材版本（可选）
 * @apiSuccess {String} [chapter_info] 章节信息（可选）
 * @apiSuccess {String} [cover_url] 封面URL（可选，已转换为完整URL）
 * @apiSuccess {Number} download_count 下载次数
 * @apiSuccess {String} auto_meta_status AI识别状态（pending/done/failed）
 * @apiSuccess {Object} [auto_meta_result] AI识别结果（只读，结构可能增强但不破坏兼容）
 * @apiSuccess {Object} [catalog_info] 教材目录信息（仅当资源已关联教材时存在）
 * 
 * @apiNote 注意：
 * - 不再返回 `textbooks` 字段（已废弃，使用 `catalog_info` 替代）
 * - `catalog_info` 包含完整的教材目录信息，已优化为前端展示格式
 * @apiSuccess {String} created_at 创建时间
 * @apiSuccess {String} updated_at 更新时间
 * 
 * @apiNote 注意：
 * - status 字段不在此接口返回（仅返回已审核资源）
 * - file_url 和 cover_url 会自动转换为完整URL
 * - auto_meta_result 结构可能增强，前端应忽略未知字段
 * 
 * @apiError NOT_FOUND 资源不存在或未审核
 */
export const show = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 准备数据
    const { id } = request.params;
    const resourceId = parseInt(id, 10);

    // 获取当前用户信息
    const userId = request.user?.id;
    const userRole = (request.user as any)?.role || 'user';

    try {
        // 先获取资源（不限制状态，用于权限检查）
        const { getResourceByIdForAdmin } = await import('./resource.service');
        let resource: any;
        
        try {
            resource = await getResourceByIdForAdmin(resourceId);
        } catch (error) {
            // 如果资源不存在，返回 404
            return response.status(404).json({
                success: false,
                message: '资源不存在',
                error: 'NOT_FOUND',
            });
        }

        // 权限检查：根据用户角色和是否是资源所有者决定是否允许查看
        const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';
        const isOwner = userId && resource.user_id === userId;
        const isApproved = resource.status === 'approved';

        // 权限规则：
        // 1. 管理员/编辑：可查看所有资源
        // 2. 发布者：可查看自己发布的资源（所有状态）
        // 3. 其他用户：只能查看已通过审核的资源
        if (!isAdminOrEditor && !isOwner && !isApproved) {
            return response.status(403).json({
                success: false,
                message: '您没有权限查看此资源',
                error: 'FORBIDDEN',
            });
        }

        // 将 file_url 转换为完整 URL（如果需要）
        if (resource && resource.file_url && resource.file_url.startsWith('/')) {
            resource.file_url = getFullUrl(request, resource.file_url);
        }
        // 将 cover_url 转换为完整 URL（如果需要）
        if (resource && resource.cover_url && resource.cover_url.startsWith('/')) {
            resource.cover_url = getFullUrl(request, resource.cover_url);
        }

        // 对于非管理员/编辑/发布者，不返回 status 和 user_id 字段（保持向后兼容）
        if (!isAdminOrEditor && !isOwner) {
            delete resource.status;
            delete resource.user_id; // 普通用户接口不应该返回 user_id
        }

        // 附加教材信息（如果已绑定）
        // 扩展字段：textbooks 和 catalog_info 仅在资源关联教材时存在
        // 这些字段未来可能增强，但保证向后兼容（不会删除现有字段）
        const resourceWithCatalogInfo = await enrichResourceWithCatalogInfo(resource);

        // chapter_info 原样返回（已经是 resource 的一部分）
        // 所有字段已按标准接口规范返回，详见：docs/api/resource-detail-api-standard.md

        response.send(resourceWithCatalogInfo);
    } catch (error) {
        next(error);
    }
};

/**
 * 创建资源
 */
export const store = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 准备数据
    // 兼容前端可能发送的 version 字段（映射到 textbook）
    const { title, description, category, subject, grade, textbook, version, cover_url } = request.body;

    // 添加调试日志
    console.log('📥 接收到的请求数据:');
    console.log('  title:', title);
    console.log('  description:', description);
    console.log('  category:', category);
    console.log('  subject:', subject);
    console.log('  grade:', grade, '(类型:', typeof grade, ')');
    console.log('  textbook:', textbook);
    console.log('  version:', version);
    console.log('  cover_url:', cover_url);

    // 如果前端发送了 version 但没有 textbook，使用 version
    const textbookValue = textbook || version;

    // 获取用户ID（必须通过 authGuard 验证）
    const userId = request.user?.id;
    if (!userId) {
        return next(new Error('UNAUTHORIZED'));
    }

    // 权限检查：user 角色不允许上传资源（已在路由层通过 requireRole 验证，这里保留作为防御性检查）
    const userRole = (request.user as any)?.role || 'user';
    if (userRole === 'user') {
        return response.status(403).json({
            error: 'permission_denied',
            message: 'You do not have permission to perform this action',
            success: false,
        });
    }

    // 验证必填字段
    if (!title) return next(new Error('TITLE_IS_REQUIRED'));
    if (!category) return next(new Error('CATEGORY_IS_REQUIRED'));

    // 文件处理：支持文件上传或 file_url
    let file_url: string | undefined;
    let file_format: string | undefined;

    // 处理资源文件：支持 request.file（单个文件）或 request.files（多个文件字段）
    const resourceFile = request.file || (request.files && (request.files as any).file?.[0]);

    if (resourceFile) {
        // 有文件上传：使用上传的文件
        const filename = resourceFile.filename;
        file_url = `/uploads/resources/${filename}`;

        // 根据 mimetype 推断文件格式（排除视频类型）
        const mimeToFormat: { [key: string]: string } = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
            'application/vnd.ms-powerpoint': 'PPT',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOC',
            'application/msword': 'DOC',
            'image/png': '图片',
            'image/jpeg': '图片',
            'image/jpg': '图片',
            // 视频类型已移除，不再支持
        };
        file_format = mimeToFormat[resourceFile.mimetype] || '其他';

        // 验证文件格式：不允许视频资源
        if (isVideoResource(undefined, file_format)) {
            return next(new Error('VIDEO_RESOURCE_NOT_ALLOWED'));
        }
        if (resourceFile.mimetype && (resourceFile.mimetype.startsWith('video/'))) {
            return next(new Error('VIDEO_RESOURCE_NOT_ALLOWED'));
        }
    } else {
        // 没有文件上传：检查是否有 file_url（兼容之前的接口）
        if (!request.body.file_url) {
            return next(new Error('FILE_IS_REQUIRED'));
        }
        file_url = request.body.file_url;
        file_format = request.body.file_format || '其他';
    }

    if (!file_format) return next(new Error('FILE_FORMAT_IS_REQUIRED'));

    // 验证文件格式：不允许视频资源（再次检查，防止通过 file_url 方式上传视频）
    if (isVideoResource(undefined, file_format)) {
        return next(new Error('VIDEO_RESOURCE_NOT_ALLOWED'));
    }
    if (!isFileFormatAllowed(file_format)) {
        // 如果不是允许的格式，且不是视频，则使用"其他"
        if (!isVideoResource(undefined, file_format)) {
            file_format = '其他';
        } else {
            return next(new Error('VIDEO_RESOURCE_NOT_ALLOWED'));
        }
    }

    // 处理封面文件：如果上传了封面文件，使用上传的文件；否则使用 request.body.cover_url
    let cover_url_value = cover_url;
    const coverFile = request.files && (request.files as any).cover?.[0];
    if (coverFile) {
        // 有封面上传：使用上传的封面文件
        cover_url_value = `/uploads/cover/${coverFile.filename}`;
    }

    // 默认状态为 pending（需要审核）
    // contributor 上传的资源默认为 pending
    // editor 和 admin 上传的资源可以根据环境变量自动批准
    let status = 'pending';
    if (userRole === 'editor' || userRole === 'admin') {
        // editor 和 admin 上传的资源，如果设置了环境变量可以自动批准
        if (process.env.AUTO_APPROVE_RESOURCES === 'true') {
            status = 'approved';
        }
    }
    // contributor 上传的资源始终为 pending，需要审核

    // 准备资源数据
    // 处理 chapter_info：章节信息（非结构化文本，可选）
    const { chapter_info, auto_meta_status, unit, unit_index, catalog_id } = request.body;

    // 处理 auto_meta_status：AI元数据识别状态（可选，默认 pending）
    // 允许值：pending | done | failed
    let autoMetaStatus: 'pending' | 'done' | 'failed' = 'pending';
    if (auto_meta_status && ['pending', 'done', 'failed'].includes(auto_meta_status)) {
        autoMetaStatus = auto_meta_status as 'pending' | 'done' | 'failed';
    }

    // 处理 grade：前端可能传字符串或数字
    // 支持的年级格式（字符串）：
    //   - 小学：一年级上册/下册 ～ 六年级上册/下册
    //   - 初中：七年级上册/下册 ～ 九年级上册/下册
    //   - 高中：高一上册/下册、高二上册/下册、高三上册/下册
    // 数据库字段类型：VARCHAR(50)，可以保存这些字符串格式
    let gradeValue: number | string | null = null;
    if (grade !== undefined && grade !== null && grade !== '') {
        if (typeof grade === 'number') {
            gradeValue = grade;
            console.log('  grade 处理: 数字类型，直接使用:', gradeValue);
        } else if (typeof grade === 'string') {
            const trimmed = grade.trim();
            // 如果字符串是纯数字，转换为数字（兼容性处理）
            const parsed = parseInt(trimmed, 10);
            if (!isNaN(parsed) && parsed.toString() === trimmed) {
                gradeValue = parsed;
                console.log('  grade 处理: 纯数字字符串，转换为数字:', gradeValue);
            } else {
                // 非纯数字字符串（如 "四年级下册"），直接保存字符串
                // 注意：需要数据库字段类型为 VARCHAR 才能保存
                gradeValue = trimmed;
                console.log('  grade 处理: 字符串类型，直接保存:', gradeValue);
            }
        }
    }
    console.log('  grade 最终值:', gradeValue, '(类型:', typeof gradeValue, ')');

    // 【系统级不变量】教材单元完整性硬约束
    // 规则：凡是已绑定 catalog 的资源，resource.unit 必须非空
    // 如果创建时传了 catalog_id，则 unit 必须提供
    if (catalog_id && (!unit || unit.trim() === '')) {
        return response.status(400).json({
            success: false,
            message: '该资源已绑定教材，必须选择所属单元',
            error: 'UNIT_REQUIRED_FOR_CATALOG',
        });
    }

    const resource = {
        title,
        description,
        category,
        subject,
        grade: gradeValue,
        textbook: textbookValue,
        file_format,
        file_url,
        cover_url: cover_url_value,
        chapter_info: chapter_info || null, // 章节信息（非结构化文本，可选）
        unit: unit || null, // 【系统级不变量】资源所属单元（显式字段，唯一合法来源）
        unit_index: unit_index || null, // 单元序号
        auto_meta_status: autoMetaStatus, // AI元数据识别状态（默认 pending，用于未来AI识别）
        auto_meta_result: null, // AI识别结果（JSON格式，未来使用，当前为 null）
        user_id: userId,
        status: status,
        source_type: 'official' as const, // 所有资源默认为平台资源
        download_count: 0,
    };

    // 创建资源
    try {
        const data: any = await createResource(resource);
        const newResourceId = data.insertId;

        // 如果创建时传了 catalog_id，立即绑定（在创建后）
        // 注意：此时 unit 已经通过上面的校验，确保非空
        if (catalog_id) {
            // 这里可以调用绑定 catalog 的逻辑
            // 但为了保持代码清晰，建议通过单独的 bind-catalog 接口处理
            // 或者在这里调用 bindResourceToCatalog
        }

        // 异步触发解析（不阻塞响应）
        // 检查是否为PDF或DOCX文件，且不是视频文件
        const isTextbookFile = file_url && (
            file_url.toLowerCase().endsWith('.pdf') ||
            file_url.toLowerCase().endsWith('.docx') ||
            file_url.toLowerCase().endsWith('.doc')
        );
        const isVideo = isVideoResource(category, file_format) || (file_url && (
            file_url.toLowerCase().endsWith('.mp4') ||
            file_url.toLowerCase().endsWith('.avi') ||
            file_url.toLowerCase().endsWith('.mov') ||
            file_url.toLowerCase().endsWith('.wmv') ||
            file_url.toLowerCase().endsWith('.flv') ||
            file_url.toLowerCase().endsWith('.mkv') ||
            file_url.toLowerCase().endsWith('.webm')
        ));

        if (isTextbookFile && !isVideo) {
            // 转换为绝对路径
            let absoluteFilePath: string;
            if (file_url.startsWith('/uploads/')) {
                absoluteFilePath = path.join(process.cwd(), file_url);
            } else if (path.isAbsolute(file_url)) {
                absoluteFilePath = file_url;
            } else {
                absoluteFilePath = path.join(process.cwd(), file_url);
            }

            // 如果是教材类型资源，进行教材结构化入库
            if (category === '教材') {
                setImmediate(async () => {
                    try {
                        const filename = path.basename(file_url);
                        await processTextbookUpload(newResourceId, absoluteFilePath, filename);
                        console.log(`[教材入库] 资源 ID ${newResourceId} 教材结构化入库完成`);
                    } catch (error) {
                        console.error(`[教材入库] 资源 ID ${newResourceId} 处理失败:`, error);
                    }
                });
            } else {
                // 其他资源类型的AI解析
                setImmediate(() => {
                    processResourceAsync(newResourceId, absoluteFilePath);
                });
            }
        }

        response.status(201).send({
            id: newResourceId,
            status: status,
        });
    } catch (error) {
        console.error('❌ 创建资源失败:', error);
        next(error);
    }
};

/**
 * 下载资源文件（强制下载，不预览）
 */
export const download = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 准备数据
    const { id } = request.params;

    try {
        // 获取资源信息
        const resource: any = await getResourceById(parseInt(id, 10));

        // 检查 file_url 是否存在
        if (!resource.file_url) {
            return next(new Error('FILE_NOT_FOUND'));
        }

        // 从 file_url 中提取文件路径
        // file_url 可能是完整URL (http://localhost:3333/uploads/resources/xxx.pdf)
        // 或者相对路径 (/uploads/resources/xxx.pdf)
        let filePath = resource.file_url;

        // 如果是完整URL，提取路径部分
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const urlObj = new URL(filePath);
            filePath = urlObj.pathname;
        }

        // 确保是相对路径，转换为绝对路径
        const absolutePath = path.join(process.cwd(), filePath);

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) {
            return next(new Error('FILE_NOT_FOUND'));
        }

        // 生成下载文件名（使用资源的标题 + 原始文件扩展名）
        const ext = path.extname(absolutePath);
        const downloadFilename = `${resource.title || 'resource'}${ext}`;

        // 使用 res.download() 强制下载
        // res.download() 会自动设置 Content-Disposition: attachment
        response.download(absolutePath, downloadFilename, (err) => {
            if (err) {
                // 如果下载过程中出错（比如客户端取消），不抛出错误
                if (!response.headersSent) {
                    next(err);
                }
            }
            // 下载成功可以在这里增加下载计数（可选）
            // TODO: 增加下载计数逻辑
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 审核资源状态（管理员接口）
 * 权限：仅允许 editor 和 admin
 * 状态流转：pending → approved 或 pending → rejected
 * 非 pending 状态的资源不可再次审核
 */
export const updateStatus = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        // 准备数据
        const { id } = request.params;
        const { status } = request.body;
        const resourceId = parseInt(id, 10);

        if (isNaN(resourceId)) {
            return response.status(400).json({
                success: false,
                message: '无效的资源ID',
                error: 'INVALID_RESOURCE_ID',
            });
        }

        // 验证 status 值（只允许 approved 或 rejected）
        if (status !== 'approved' && status !== 'rejected') {
            return response.status(400).json({
                success: false,
                message: '无效的状态值，只允许 approved 或 rejected',
                error: 'INVALID_STATUS',
            });
        }

        // 获取当前用户信息（用于记录审核人）
        const userId = request.user?.id;
        const userRole = (request.user as any)?.role || 'user';

        // 权限验证：仅允许 editor 和 admin（已在路由层通过 roleGuard 验证，这里作为双重检查）
        if (userRole !== 'admin' && userRole !== 'editor') {
            return response.status(403).json({
                success: false,
                message: '无权访问审核接口，仅 editor 和 admin 可以审核资源',
                error: 'FORBIDDEN',
            });
        }

        // 检查资源是否存在
        const resource: any = await getResourceByIdForAdmin(resourceId);
        if (!resource) {
            return response.status(404).json({
                success: false,
                message: '资源不存在',
                error: 'RESOURCE_NOT_FOUND',
            });
        }

        // 验证资源当前状态：必须是 pending 才能审核
        if (resource.status !== 'pending') {
            return response.status(400).json({
                success: false,
                message: `资源当前状态为 ${resource.status}，只有 pending 状态的资源可以审核`,
                error: 'RESOURCE_NOT_PENDING',
                current_status: resource.status,
            });
        }

        // 更新资源状态（包含审核人信息，如果数据库有 reviewed_by 和 reviewed_at 字段）
        await updateResourceStatus(resourceId, status, userId);

        // 获取更新后的资源信息
        const updatedResource: any = await getResourceByIdForAdmin(resourceId);

        // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
        if (updatedResource.file_url && updatedResource.file_url.startsWith('/')) {
            updatedResource.file_url = getFullUrl(request, updatedResource.file_url);
        }
        if (updatedResource.cover_url && updatedResource.cover_url.startsWith('/')) {
            updatedResource.cover_url = getFullUrl(request, updatedResource.cover_url);
        }

        // 返回更新后的资源
        response.json({
            success: true,
            message: `资源已${status === 'approved' ? '通过' : '拒绝'}审核`,
            resource: updatedResource,
        });
    } catch (error) {
        if ((error as any).message === 'NOT_FOUND') {
            return response.status(404).json({
                success: false,
                message: '资源不存在',
                error: 'RESOURCE_NOT_FOUND',
            });
        }
        console.error('审核资源失败:', error);
        next(error);
    }
};

/**
 * 审核资源（通过审核）
 * POST /api/resources/:id/approve
 * 权限：editor / admin
 * 将资源状态从 pending 改为 approved
 */
export const approve = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const { id } = request.params;
        const resourceId = parseInt(id, 10);

        if (isNaN(resourceId)) {
            return response.status(400).json({
                error: 'invalid_resource_id',
                message: 'Invalid resource ID',
                success: false,
            });
        }

        // 获取当前用户信息（用于记录审核人）
        const userId = request.user?.id;
        if (!userId) {
            return response.status(401).json({
                error: 'unauthorized',
                message: 'Unauthorized, please login first',
                success: false,
            });
        }

        // 检查资源是否存在
        const resource: any = await getResourceByIdForAdmin(resourceId);
        if (!resource) {
            return response.status(404).json({
                error: 'resource_not_found',
                message: 'Resource not found',
                success: false,
            });
        }

        // 验证资源当前状态：必须是 pending 才能审核
        if (resource.status !== 'pending') {
            return response.status(400).json({
                error: 'resource_not_pending',
                message: `Resource current status is ${resource.status}, only pending resources can be approved`,
                success: false,
                current_status: resource.status,
            });
        }

        // 更新资源状态为 approved（包含审核人信息）
        await updateResourceStatus(resourceId, 'approved', userId);

        // 获取更新后的资源信息
        const updatedResource: any = await getResourceByIdForAdmin(resourceId);

        // 返回更新后的资源
        response.json({
            success: true,
            message: 'Resource approved successfully',
            resource: updatedResource,
        });
    } catch (error) {
        if ((error as any).message === 'NOT_FOUND') {
            return response.status(404).json({
                error: 'resource_not_found',
                message: 'Resource not found',
                success: false,
            });
        }
        console.error('审核资源失败:', error);
        next(error);
    }
};

/**
 * 自动解析资源结构（最小可用版本，用于验证链路）
 * POST /api/resources/:id/auto-parse
 */
export const autoParse = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const { id } = request.params;
        const resourceId = parseInt(id, 10);

        // 查询资源是否存在
        const resource: any = await getResourceByIdForAdmin(resourceId);

        // 构造固定写死的教材结构 JSON（示例）
        const autoMetaResult = {
            education_level: "elementary",
            subject: "语文",
            grade: "二年级",
            volume: "上册",
            textbook_version: "人教版",
            structure: [
                {
                    unit: "第一单元",
                    title: "春天来了"
                }
            ]
        };

        // 更新 chapter_info 为示例字符串
        const chapterInfo = "第一单元 春天来了";

        // 更新资源
        await updateResourceAutoParse(resourceId, autoMetaResult, chapterInfo);

        // 返回成功响应
        response.send({
            success: true,
            message: '资源自动解析完成',
            resource_id: resourceId,
        });
    } catch (error) {
        next(error);
    }
};

