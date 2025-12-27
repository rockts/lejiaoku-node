import express from 'express';
import cors from 'cors';
import path from 'path';
// @deprecated Post 模块已废弃，请使用 Resource 模块
// 保留此导入仅用于向后兼容，新功能请使用 Resource 模块
import postRouter from '../post/post.router';
import userRouter from '../user/user.router';
import authRouter from '../auth/auth.router';
import coverRouter from '../cover/cover.router';
// @deprecated File 模块已废弃，请使用 Resource 模块
// import fileRouter from '../file/file.router';
import { currentUser } from '../auth/auth.middleware';
import tagRouter from '../tag/tag.router';
import commentRouter from '../comment/comment.router';
import avatarRouter from '../avatar/avatar.router';
import likeRouter from '../like/like.router';
import saveRouter from '../save/save.router';
import appRouter from './app.router';
import resourceRouter from '../resource/resource.router';
import textbookRouter from '../textbook/textbook.router';
import contributorApplicationRouter from '../contributor-application/contributor-application.router';
import taskRouter from '../task/task.router';
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
      postRouter, // @deprecated Post 模块已废弃，请使用 Resource 模块
      userRouter,
      authRouter,
      coverRouter,
      // fileRouter, // @deprecated File 模块已废弃，请使用 Resource 模块
      tagRouter,
      avatarRouter,
      commentRouter,
      likeRouter,
      saveRouter,
      appRouter,
      resourceRouter, // /resources - 资源管理（唯一权威模型）
      textbookRouter // /textbook-catalog, /resources/:id/bind-textbook
    );

    /**
     * API 路由（统一挂载在 /api 下）
     * 包括用户管理、资源管理等后台接口
     */
    app.use('/api', userRouter);
    app.use('/api', resourceRouter);
    app.use('/api', avatarRouter); // 头像上传接口
    app.use('/api', contributorApplicationRouter); // Contributor 申请接口
    app.use('/api', taskRouter); // Catalog 任务接口
    app.use('/', taskRouter); // 支持 /my/tasks 路径（不带 /api 前缀）
    
    /**
     * 后台管理路由（支持 /admin/* 路径，兼容前端直接访问）
     * 注意：这些路由已经在 /api 下挂载，这里是为了兼容前端可能访问的路径
     * 前端开发服务器应该将 /admin/* 代理到后端，或者前端应该访问 /api/admin/*
     */
    app.use('/admin', userRouter);
    app.use('/admin', resourceRouter);
    app.use('/admin', contributorApplicationRouter); // Contributor 申请接口（兼容 /admin 路径）
    
    /**
     * Textbook API 路由
     */
    app.use('/api', textbookRouter);

/**
 * Classification 兼容路由（静态返回，用于向后兼容）
 * @deprecated 请使用 Resource.category 字段，此接口仅用于向后兼容
 * 前端应直接从资源列表获取分类选项，不再依赖此接口
 */
app.get('/classifications', (req, res) => {
  res.json(['教材', '教案', '课件', '习题', '其他']);
});

app.get('/classifications/category', (req, res) => {
  res.json(['教材', '教案', '课件', '习题', '其他']);
});

/**
 * 默认异常处理器
 */
app.use(defaultErrorHandler);

/**
 * 导出应用
 */
export default app;
