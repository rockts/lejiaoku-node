export class UserModel {
  id?: number;
  name?: string;
  username?: string; // 用户名（用于登录）
  password?: string;
  email?: string;
  role?: 'user' | 'admin'; // 用户角色：user(普通用户) / admin(管理员)
  updated_at?: Date;
  created_at?: Date;
  avatar?: number;
}