-- 用户表结构迁移脚本
-- 添加缺失的字段并更新现有字段

-- 1. 添加 username 字段（如果不存在）
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) NULL UNIQUE COMMENT '用户名（用于登录）' AFTER name;

-- 2. 将现有的 name 字段值复制到 username（如果 username 为空）
UPDATE user SET username = name WHERE username IS NULL OR username = '';

-- 3. 添加 nickname 字段
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) NULL COMMENT '昵称' AFTER username;

-- 4. 添加 avatar_url 字段
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL COMMENT '头像URL' AFTER nickname;

-- 5. 添加 status 字段
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '用户状态：active(激活) / disabled(禁用)' AFTER role;

-- 6. 更新现有用户的 status 为 active
UPDATE user SET status = 'active' WHERE status IS NULL;

-- 7. 确保 role 字段有默认值
ALTER TABLE user 
MODIFY COLUMN role VARCHAR(50) DEFAULT 'user' COMMENT '用户角色：user(普通用户) / editor(编辑) / admin(管理员)';

-- 8. 更新现有用户的 role（如果没有设置）
UPDATE user SET role = 'user' WHERE role IS NULL OR role = '';

-- 9. 确保 username 不为空（如果可能）
-- 注意：如果某些用户的 name 也为空，需要手动处理
UPDATE user SET username = CONCAT('user_', id) WHERE (username IS NULL OR username = '') AND name IS NOT NULL AND name != '';
