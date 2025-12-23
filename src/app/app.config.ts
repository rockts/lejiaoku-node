import dotenv from 'dotenv';
import path from 'path';

// 明确指定 .env 文件路径
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * 应用配置
 */
export const { APP_PORT } = process.env;

/**
 * 数据仓库配置
 */
export const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = process.env;

/**
 * 密钥配置
 */
export let { PRIVATE_KEY, PUBLIC_KEY } = process.env;
if (!PRIVATE_KEY || !PUBLIC_KEY) {
  throw new Error('PRIVATE_KEY 和 PUBLIC_KEY 环境变量必须配置');
}
PRIVATE_KEY = Buffer.from(PRIVATE_KEY, 'base64').toString();
PUBLIC_KEY = Buffer.from(PUBLIC_KEY, 'base64').toString();

/**
 * 内容分页
 */
export const POSTS_PER_PAGE = parseInt(process.env['POSTS_PER_PAGE'], 10);

/**
 * 评论分页
 */
export const COMMENTS_PER_PAGE = parseInt(process.env['COMMENTS_PER_PAGE'], 10);
