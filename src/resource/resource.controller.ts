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
} from './resource.service';
import { APP_PORT } from '../app/app.config';
import { getResourceTextbooks } from '../textbook/textbook.controller';
import { processResourceAsync } from './resource-parser-worker';
import { isCategoryAllowed, isFileFormatAllowed, isVideoResource } from './resource.constants';

/**
 * 将相对路径转换为完整URL或保持相对路径
 * 默认返回相对路径（前端通过代理访问），可通过环境变量控制
 */
const getFullUrl = (request: Request, path: string): string => {
    if (!path) return path;
    // 如果已经是完整URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 如果配置了返回完整URL（用于直接访问后端的情况）
    // 可以通过环境变量 RESOURCE_URL_MODE=absolute 来控制
    if (process.env.RESOURCE_URL_MODE === 'absolute') {
        const protocol = request.protocol || 'http';
        const host = request.get('host') || `localhost:${APP_PORT}`;
        return `${protocol}://${host}${normalizedPath}`;
    }

    // 默认返回相对路径（前端通过代理访问静态资源）
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
            response.send(resourcesWithFullUrl);
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
            response.send(resourcesWithFullUrl);
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
            response.send(resourcesWithFullUrl);
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
export const show = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 准备数据
    const { id } = request.params;

    // 获取资源
    try {
        const resource: any = await getResourceById(parseInt(id, 10));
        // 将 file_url 转换为完整 URL（如果需要）
        if (resource && resource.file_url && resource.file_url.startsWith('/')) {
            resource.file_url = getFullUrl(request, resource.file_url);
        }
        // 将 cover_url 转换为完整 URL（如果需要）
        if (resource && resource.cover_url && resource.cover_url.startsWith('/')) {
            resource.cover_url = getFullUrl(request, resource.cover_url);
        }

        // 附加教材信息（如果已绑定）
        try {
            const textbooks = await getResourceTextbooks(resource.id);
            if (textbooks && textbooks.length > 0) {
                resource.textbooks = textbooks;
                // 如果有关联的教材目录，返回简化的 catalog_info（使用第一个关联的目录）
                const firstTextbook = textbooks[0];
                if (firstTextbook) {
                    resource.catalog_info = {
                        education_level: firstTextbook.education_level,
                        grade: firstTextbook.grade,
                        subject: firstTextbook.subject,
                        textbook_version: firstTextbook.textbook_version,
                        volume: firstTextbook.volume,
                    };
                }
            }
        } catch (textbookError) {
            // 获取教材信息失败不影响主流程，继续返回资源信息
            console.error('获取教材信息失败:', textbookError);
        }

        // chapter_info 原样返回（已经是 resource 的一部分）

        response.send(resource);
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

    // 临时测试方案：如果没有用户ID，使用默认测试用户ID 1
    // TODO: 在生产环境中应移除此逻辑，确保必须通过 authGuard
    const userId = request.user?.id || 1;

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
    // 如果需要在开发环境下自动批准，可以设置环境变量 AUTO_APPROVE_RESOURCES=true
    const status = process.env.AUTO_APPROVE_RESOURCES === 'true' ? 'approved' : 'pending';

    // 准备资源数据
    // 处理 chapter_info：章节信息（非结构化文本，可选）
    const { chapter_info, auto_meta_status } = request.body;

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

        // 异步触发教材解析（不阻塞响应）
        // 检查是否为PDF或DOCX文件（排除视频）
        const isTextbookFile = file_url && (
            (file_url.toLowerCase().endsWith('.pdf') ||
                file_url.toLowerCase().endsWith('.docx') ||
                file_url.toLowerCase().endsWith('.doc')) &&
            !file_url.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|mkv|webm)$/i)
        );

        if (isTextbookFile) {
            // 转换为绝对路径
            let absoluteFilePath: string;
            if (file_url.startsWith('/uploads/')) {
                absoluteFilePath = path.join(process.cwd(), file_url);
            } else if (path.isAbsolute(file_url)) {
                absoluteFilePath = file_url;
            } else {
                absoluteFilePath = path.join(process.cwd(), file_url);
            }

            // 异步处理（不阻塞响应）
            processResourceAsync(newResourceId, absoluteFilePath);
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
 * 注意：这是管理员接口，生产环境需要添加权限验证
 * 开发期暂不加 authGuard
 */
export const updateStatus = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 准备数据
    const { id } = request.params;
    const { status } = request.body;

    // 验证 status 值
    if (status !== 'approved' && status !== 'rejected') {
        return next(new Error('INVALID_STATUS'));
    }

    try {
        // 先检查资源是否存在（不检查 status，因为 pending 的资源也需要能审核）
        const resource: any = await getResourceByIdForAdmin(parseInt(id, 10));

        // 更新资源状态
        await updateResourceStatus(parseInt(id, 10), status);

        // 获取更新后的资源信息
        const updatedResource: any = await getResourceByIdForAdmin(parseInt(id, 10));

        // 将 file_url 和 cover_url 转换为完整 URL（如果需要）
        if (updatedResource.file_url && updatedResource.file_url.startsWith('/')) {
            updatedResource.file_url = getFullUrl(request, updatedResource.file_url);
        }
        if (updatedResource.cover_url && updatedResource.cover_url.startsWith('/')) {
            updatedResource.cover_url = getFullUrl(request, updatedResource.cover_url);
        }

        // 返回更新后的资源
        response.send(updatedResource);
    } catch (error) {
        next(error);
    }
};

