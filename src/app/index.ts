import express from 'express';
import resourcesRouter from '../resources/resources.router';
import userRouter from '../user/user.router';
import authRouter from '../auth/auth.router';
import fileRouter from '../file/file.router';
import tagRouter from '../tag/tag.router';
import commentRouter from '../comment/comment.router';
import avatarRouter from '../avatar/avatar.router';
import likeRouter from '../like/like.router';
import appRouter from './app.router';
import typeRouter from '../type/type.router';
import subjectRouter from '../subject/subject.router';
import gradeRouter from '../grade/grade.router';
import { defaultErrorHandler } from './app.middleware';

/**
 * 创建应用
 */
const app = express();

/**
 * 处理 JSON
 */
app.use(express.json());

/**
 * 路由
 */
app.use(
  resourcesRouter,
  userRouter,
  authRouter,
  fileRouter,
  tagRouter,
  avatarRouter,
  commentRouter,
  likeRouter,
  appRouter,
  typeRouter,
  subjectRouter,
  gradeRouter,
);

/**
 * 默认异常处理器
 */
app.use(defaultErrorHandler);

/**
 * 导出应用
 */
export default app;
