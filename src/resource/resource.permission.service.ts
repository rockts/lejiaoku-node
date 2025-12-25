/**
 * 资源权限判断服务
 * 提供统一的权限判断方法
 */

import { Request } from 'express';

/**
 * 用户角色类型
 */
export type UserRole = 'user' | 'contributor' | 'editor' | 'admin';

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: number;
  role?: UserRole;
}

/**
 * 资源信息接口
 */
export interface ResourceInfo {
  user_id?: number;
  status?: string;
}

/**
 * 判断用户是否可以上传资源
 * @param user 用户信息
 * @returns true 如果可以上传，false 如果不可以
 */
export const canUpload = (user: UserInfo | null): boolean => {
  if (!user || !user.id) {
    return false;
  }

  const role = user.role || 'user';

  // user 角色不允许上传
  if (role === 'user') {
    return false;
  }

  // contributor, editor, admin 可以上传
  return ['contributor', 'editor', 'admin'].includes(role);
};

/**
 * 判断用户是否可以编辑资源
 * @param user 用户信息
 * @param resource 资源信息
 * @returns true 如果可以编辑，false 如果不可以
 */
export const canEditResource = (user: UserInfo | null, resource: ResourceInfo | null): boolean => {
  if (!user || !user.id) {
    return false;
  }

  if (!resource) {
    return false;
  }

  const role = user.role || 'user';
  const isOwner = resource.user_id === user.id;

  // user 角色不允许编辑任何资源
  if (role === 'user') {
    return false;
  }

  // admin 可以编辑任何资源
  if (role === 'admin') {
    return true;
  }

  // editor 可以编辑任何资源
  if (role === 'editor') {
    return true;
  }

  // contributor 只能编辑自己上传的资源
  if (role === 'contributor') {
    return isOwner;
  }

  return false;
};

/**
 * 判断用户是否可以审核资源
 * @param user 用户信息
 * @returns true 如果可以审核，false 如果不可以
 */
export const canReview = (user: UserInfo | null): boolean => {
  if (!user || !user.id) {
    return false;
  }

  const role = user.role || 'user';

  // 只有 editor 和 admin 可以审核
  return role === 'editor' || role === 'admin';
};

/**
 * 判断用户是否可以删除资源
 * @param user 用户信息
 * @param resource 资源信息
 * @returns true 如果可以删除，false 如果不可以
 */
export const canDeleteResource = (user: UserInfo | null, resource: ResourceInfo | null): boolean => {
  if (!user || !user.id) {
    return false;
  }

  if (!resource) {
    return false;
  }

  const role = user.role || 'user';
  const isOwner = resource.user_id === user.id;

  // admin 可以删除任何资源
  if (role === 'admin') {
    return true;
  }

  // 其他角色只能删除自己的资源
  return isOwner;
};

/**
 * 从请求中获取用户信息
 * @param request Express 请求对象
 * @returns 用户信息或 null
 */
export const getUserFromRequest = (request: Request): UserInfo | null => {
  const user = request.user;
  if (!user || !user.id) {
    return null;
  }

  return {
    id: user.id,
    role: (user as any).role as UserRole || 'user',
  };
};

