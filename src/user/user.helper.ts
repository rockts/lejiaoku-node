/**
 * 用户数据辅助函数
 * 用于统一处理用户数据的格式化，确保 avatar_url 等字段正确设置
 */

/**
 * 为用户数据设置 avatar_url
 * 如果用户有头像（avatar === 1），自动设置 avatar_url 为头像API路径
 * 
 * @param user 用户数据对象
 * @param userId 用户ID（如果 user 中没有 id 字段，需要单独传入）
 * @returns 处理后的用户数据
 */
export const enrichUserWithAvatarUrl = (user: any, userId?: number): any => {
  if (!user) {
    return user;
  }

  const uid = userId || user.id;
  if (!uid) {
    return user;
  }

  // 如果有头像（avatar = 1），设置 avatar_url 为头像API的URL
  const hasAvatar = user.avatar === 1;
  if (hasAvatar) {
    user.avatar_url = `/api/users/${uid}/avatar`;
  }

  return user;
};

/**
 * 为用户列表设置 avatar_url
 * 批量处理用户列表，为每个有头像的用户设置 avatar_url
 * 
 * @param users 用户数据数组
 * @returns 处理后的用户数据数组
 */
export const enrichUserListWithAvatarUrl = (users: any[]): any[] => {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map(user => enrichUserWithAvatarUrl(user));
};


