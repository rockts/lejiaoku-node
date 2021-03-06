import express from 'express';
import cors from 'cors';
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
 */
app.use(express.json());

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
  classificationRouter
);

/**
 * 默认异常处理器
 */
app.use(defaultErrorHandler);

/**
 * 导出应用
 */
export default app;
