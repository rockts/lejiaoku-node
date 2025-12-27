/**
 * Contributor 申请控制器
 */

import { Request, Response, NextFunction } from 'express';
import {
  createApplication,
  getPendingApplicationByUserId,
  getPendingApplications,
  getApplicationById,
  updateApplicationStatus,
  approveApplicationAndUpdateRole,
  getMyApplication as getMyApplicationService,
} from './contributor-application.service';
import { ContributorApplicationModel } from './contributor-application.model';

/**
 * 创建申请
 * POST /api/contributor-applications
 * 权限：仅 user 角色可调用
 */
export const store = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = request.user?.id;
    const userRole = (request.user as any)?.role || 'user';

    // 仅 user 角色可以申请
    if (userRole !== 'user') {
      return response.status(403).json({
        success: false,
        message: '只有 user 角色可以申请成为 contributor',
        error: 'FORBIDDEN',
      });
    }

    // 检查是否已有待审核的申请
    const existingApplication = await getPendingApplicationByUserId(userId);
    if (existingApplication) {
      return response.status(400).json({
        success: false,
        message: '您已有待审核的申请，请等待审核结果',
        error: 'PENDING_APPLICATION_EXISTS',
      });
    }

    // 创建申请
    const application: ContributorApplicationModel = {
      user_id: userId,
      status: 'pending' as const,
    };

    await createApplication(application);

    // 获取刚创建的申请信息（包含生成的 ID 和时间戳）
    const newApplication = await getPendingApplicationByUserId(userId);

    // 返回成功响应，包含申请信息，方便前端更新按钮状态
    response.status(201).json({
      success: true,
      message: '申请已提交，等待管理员审核',
      data: newApplication ? {
        id: newApplication.id,
        user_id: newApplication.user_id,
        status: newApplication.status,
        created_at: newApplication.created_at,
        updated_at: newApplication.updated_at,
      } : null,
    });
  } catch (error) {
    console.error('创建申请失败:', error);
    next(error);
  }
};

/**
 * 获取当前用户的申请状态
 * GET /api/contributor-applications/my
 * 权限：需要登录
 * 用于前端判断按钮状态
 */
export const getMyApplication = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const userId = request.user?.id;

    if (!userId) {
      return response.status(401).json({
        success: false,
        message: '未授权，请先登录',
        error: 'UNAUTHORIZED',
      });
    }

    // 获取当前用户的最新申请（包括所有状态）
    const application = await getMyApplicationService(userId);

    if (!application) {
      // 没有申请记录
      return response.json({
        success: true,
        data: null,
        hasApplication: false,
        status: null,
      });
    }

    // 返回申请信息
    response.json({
      success: true,
      data: {
        id: application.id,
        user_id: application.user_id,
        status: application.status,
        reviewed_by: application.reviewed_by,
        reviewed_at: application.reviewed_at,
        created_at: application.created_at,
        updated_at: application.updated_at,
      },
      hasApplication: true,
      status: application.status,
    });
  } catch (error) {
    console.error('获取我的申请状态失败:', error);
    next(error);
  }
};

/**
 * 获取待审核申请列表（管理员接口）
 * GET /api/admin/contributor-applications
 * 权限：仅 admin
 */
export const getPendingList = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const applications = await getPendingApplications();

    // 格式化返回数据
    const formattedApplications = applications.map((app: any) => ({
      id: app.id,
      user_id: app.user_id,
      status: app.status,
      reviewed_by: app.reviewed_by,
      reviewed_at: app.reviewed_at,
      created_at: app.created_at,
      updated_at: app.updated_at,
      user: {
        id: app.user_id,
        username: app.username,
        name: app.name,
        email: app.email,
        role: app.role,
        nickname: app.nickname,
        created_at: app.user_created_at,
      },
    }));

    response.json({
      success: true,
      data: formattedApplications,
    });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    next(error);
  }
};

/**
 * 审核通过申请
 * POST /api/admin/contributor-applications/:id/approve
 * 权限：仅 admin
 * 原子操作：更新申请状态 + 更新用户角色
 */
export const approve = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const applicationId = parseInt(id, 10);
    const reviewerId = request.user?.id;

    if (isNaN(applicationId)) {
      return response.status(400).json({
        success: false,
        message: '无效的申请ID',
        error: 'INVALID_APPLICATION_ID',
      });
    }

    if (!reviewerId) {
      return response.status(401).json({
        success: false,
        message: '未授权',
        error: 'UNAUTHORIZED',
      });
    }

    // 获取申请信息
    const application = await getApplicationById(applicationId);
    if (!application) {
      return response.status(404).json({
        success: false,
        message: '申请不存在',
        error: 'APPLICATION_NOT_FOUND',
      });
    }

    // 检查申请状态
    if (application.status !== 'pending') {
      return response.status(400).json({
        success: false,
        message: '该申请已被处理，无法再次审核',
        error: 'APPLICATION_ALREADY_PROCESSED',
      });
    }

    // 原子操作：更新申请状态 + 更新用户角色
    await approveApplicationAndUpdateRole(applicationId, application.user_id, reviewerId);

    // 返回成功响应
    response.json({
      success: true,
      message: '申请已通过，用户角色已更新为 contributor',
    });
  } catch (error) {
    console.error('审核通过失败:', error);
    next(error);
  }
};

/**
 * 拒绝申请
 * POST /api/admin/contributor-applications/:id/reject
 * 权限：仅 admin
 */
export const reject = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const applicationId = parseInt(id, 10);
    const reviewerId = request.user?.id;

    if (isNaN(applicationId)) {
      return response.status(400).json({
        success: false,
        message: '无效的申请ID',
        error: 'INVALID_APPLICATION_ID',
      });
    }

    // 获取申请信息
    const application = await getApplicationById(applicationId);
    if (!application) {
      return response.status(404).json({
        success: false,
        message: '申请不存在',
        error: 'APPLICATION_NOT_FOUND',
      });
    }

    // 检查申请状态
    if (application.status !== 'pending') {
      return response.status(400).json({
        success: false,
        message: '该申请已被处理，无法再次审核',
        error: 'APPLICATION_ALREADY_PROCESSED',
      });
    }

    // 更新申请状态（不更新用户角色）
    await updateApplicationStatus(applicationId, 'rejected', reviewerId);

    // 返回成功响应
    response.json({
      success: true,
      message: '申请已拒绝',
    });
  } catch (error) {
    console.error('拒绝申请失败:', error);
    next(error);
  }
};

