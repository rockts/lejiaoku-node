import express from 'express';
import cors from 'cors';
import path from 'path';
import postRouter from '../post/post.router';
import userRouter from '../user/user.router';
import authRouter from '../auth/auth.router';
import coverRouter from '../cover/cover.router';
import fileRouter from '../file/file.router';
import { currentUser } from '../auth/auth.middleware';
import tagRouter from '../tag/tag.router';
import commentRouter from '../comment/comment.router';
import avatarRouter from '../avatar/avatar.router';
import likeRouter from '../like/like.router';
import saveRouter from '../save/save.router';
import appRouter from './app.router';
import classificationRouter from "../classification/classification.router";
import resourceRouter from '../resource/resource.router';
import { defaultErrorHandler } from './app.middleware';

/**
 * 创建应用
 */
const app = express();

/**
 * 跨域资源共享
 */
app.use(
  cors({
    origin: '*',
    exposedHeaders: 'X-Total-Count',
  }),
);

/**
 * 处理 JSON
 * 增加 body size limit 以支持文件上传（multipart/form-data 不受此限制，但增加以保险）
 */
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/**
 * 静态文件服务 - 暴露上传的文件
 * 使用绝对路径确保服务从任何目录运行时都能正确访问文件
 */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/**
 * 验证当前用户
 */
app.use(currentUser);

/**
 * 路由
 */
app.use(
  postRouter,
  userRouter,
  authRouter,
  coverRouter,
  fileRouter,
  tagRouter,
  avatarRouter,
  commentRouter,
  likeRouter,
  saveRouter,
  appRouter,
  classificationRouter,
  resourceRouter // /resources
);

/**
 * Resource API 路由（前端规范路径）
 * 同时支持 /resources 和 /api/resources
 */
app.use('/api', resourceRouter);

/**
 * 默认异常处理器
 */
app.use(defaultErrorHandler);

/**
 * 导出应用
 */
export default app;
