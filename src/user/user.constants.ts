/**
 * 用户相关常量
 */

/**
 * 用户名格式验证规则
 * - 4-20位字符
 * - 以字母开头
 * - 可包含字母、数字、下划线(_)或短横线(-)
 */
export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;

/**
 * 用户名格式说明
 */
export const USERNAME_FORMAT_DESCRIPTION = '用户名必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)';

