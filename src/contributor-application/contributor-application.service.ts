/**
 * Contributor 申请服务
 * 处理数据库操作
 */

import { connection } from '../app/database/mysql';
import { ContributorApplicationModel } from './contributor-application.model';

/**
 * 创建申请
 */
export const createApplication = async (application: ContributorApplicationModel) => {
  const statement = `
    INSERT INTO contributor_applications
    SET ?
  `;

  const [data] = await connection.promise().query(statement, application);
  return data;
};

/**
 * 获取用户的待审核申请
 */
export const getPendingApplicationByUserId = async (userId: number) => {
  const statement = `
    SELECT *
    FROM contributor_applications
    WHERE user_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const [data] = await connection.promise().query(statement, [userId]);
  return (data as any[])[0] || null;
};

/**
 * 获取所有待审核申请（包含用户信息）
 */
export const getPendingApplications = async () => {
  const statement = `
    SELECT 
      ca.id,
      ca.user_id,
      ca.status,
      ca.reviewed_by,
      ca.reviewed_at,
      ca.created_at,
      ca.updated_at,
      u.id as user_id,
      u.username,
      u.name,
      u.email,
      u.role,
      u.nickname,
      u.created_at as user_created_at
    FROM contributor_applications ca
    INNER JOIN user u ON ca.user_id = u.id
    WHERE ca.status = 'pending'
    ORDER BY ca.created_at ASC
  `;

  const [data] = await connection.promise().query(statement);
  return data;
};

/**
 * 根据ID获取申请（包含用户信息）
 */
export const getApplicationById = async (applicationId: number) => {
  const statement = `
    SELECT 
      ca.id,
      ca.user_id,
      ca.status,
      ca.reviewed_by,
      ca.reviewed_at,
      ca.created_at,
      ca.updated_at,
      u.id as user_id,
      u.username,
      u.name,
      u.email,
      u.role,
      u.nickname,
      u.created_at as user_created_at
    FROM contributor_applications ca
    INNER JOIN user u ON ca.user_id = u.id
    WHERE ca.id = ?
  `;

  const [data] = await connection.promise().query(statement, [applicationId]);
  return (data as any[])[0] || null;
};

/**
 * 更新申请状态
 */
export const updateApplicationStatus = async (
  applicationId: number,
  status: 'approved' | 'rejected',
  reviewedBy: number,
) => {
  const statement = `
    UPDATE contributor_applications
    SET status = ?,
        reviewed_by = ?,
        reviewed_at = NOW()
    WHERE id = ?
  `;

  const [data] = await connection.promise().query(statement, [status, reviewedBy, applicationId]);
  return data;
};

/**
 * 更新用户角色
 */
export const updateUserRole = async (userId: number, role: string) => {
  const statement = `
    UPDATE user
    SET role = ?
    WHERE id = ?
  `;

  const [data] = await connection.promise().query(statement, [role, userId]);
  return data;
};

/**
 * 原子操作：审核通过申请并更新用户角色
 * 使用事务确保原子性
 */
export const approveApplicationAndUpdateRole = async (
  applicationId: number,
  userId: number,
  reviewerId: number,
) => {
  // 开始事务
  await connection.promise().query('START TRANSACTION');

  try {
    // 1. 更新申请状态
    await updateApplicationStatus(applicationId, 'approved', reviewerId);

    // 2. 更新用户角色
    await updateUserRole(userId, 'contributor');

    // 提交事务
    await connection.promise().query('COMMIT');
  } catch (error) {
    // 回滚事务
    await connection.promise().query('ROLLBACK');
    throw error;
  }
};

