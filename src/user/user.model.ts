export class UserModel {
  id?: number;
  name?: string;
  username?: string; // 用户名（用于登录，唯一）
  password?: string; // 密码（存储为 bcrypt hash）
  email?: string;
  role?: 'user' | 'editor' | 'admin'; // 用户角色：user(普通用户) / editor(编辑) / admin(管理员)
  nickname?: string; // 昵称（可选）
  avatar_url?: string; // 头像URL（可选）
  status?: 'active' | 'disabled'; // 用户状态：active(激活) / disabled(禁用)
  updated_at?: Date;
  created_at?: Date;
  avatar?: number; // 兼容旧字段
}