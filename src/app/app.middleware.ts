import { Request, Response, NextFunction } from 'express';

/**
 * 输出请求地址
 */
export const requestUrl = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  console.log(request.url);
  next();
};

/**
 * 默认异常处理器
 */
export const defaultErrorHandler = (
  error: any,
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 输出详细的错误信息
  console.log('🚧 错误信息:', error.message || error);
  if (error.stack) {
    console.log('📚 错误堆栈:', error.stack);
  }
  if (error.code) {
    console.log('🔢 错误代码:', error.code);
  }

  let statusCode: number, message: string;

  /**
   * 处理 Multer 错误
   */
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = '文件大小超过限制（最大20MB）';
    return response.status(statusCode).send({ message });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = '上传了意外的文件字段';
    return response.status(statusCode).send({ message });
  }
  // Multer 文件过滤器错误
  if (error.message === 'FILE_TYPE_NOT_ACCEPT') {
    statusCode = 400;
    message = '文件类型不允许，支持：PDF、PPT、DOC、图片、视频';
    return response.status(statusCode).send({ message });
  }

  /**
   * 处理异常
   */
  switch (error.message) {
    case 'NAME_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户名';
      break;
    case 'PASSWORD_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户密码';
      break;
    case 'EMAIL_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户邮箱';
      break;
    case 'USER_ALREADY_EXIST':
      statusCode = 409;
      message = '用户名已被占用';
      break;
    case 'EMAIL_ALREADY_EXIST':
      statusCode = 409;
      message = '邮箱已被占用';
      break;
    case 'USER_DOES_NOT_EXIST':
      statusCode = 400;
      message = '用户不存在';
      break;
    case 'PASSWORD_DOES_NOT_MATCH':
      statusCode = 400;
      message = '密码不对';
      break;
    case 'UNAUTHORIZED':
      statusCode = 401;
      message = '请先登录';
      break;
    case 'USER_DOES_NOT_OWN_RESOURCE':
      statusCode = 403;
      message = '您不能处理这个内容';
      break;
    case 'COVER_NOT_FOUND':
      statusCode = 404;
      message = '封面不存在';
      break;
    case 'FILE_NOT_FOUND':
      statusCode = 404;
      message = '文件不存在';
      break;
    case 'AVARAR_NOT_FOUND':
      statusCode = 404;
      message = '头像不存在';
      break;
    case 'COVER_NOT_SIZE':
      statusCode = 404;
      message = '请重新上传';
      break;
    case 'TAG_ALREADY_EXISTS':
      statusCode = 400;
      message = '标签已存在';
      break;
    case 'CATEGORY_ALREADY_EXISTS':
      statusCode = 400;
      message = '类型已存在';
      break;
    case 'SUBJECT_ALREADY_EXISTS':
      statusCode = 400;
      message = '学科已存在';
      break;
    case 'GRADE_ALREADY_EXISTS':
      statusCode = 400;
      message = '年级已存在';
      break;
    case 'VERSION_ALREADY_EXISTS':
      statusCode = 400;
      message = '版本已存在';
      break;
    case 'POST_ALREADY_HAS_THIS_TAG':
      statusCode = 400;
      message = '内容已经有这个标签了';
      break;
    case 'POST_ALREADY_HAS_THIS_TYPE':
      statusCode = 400;
      message = '内容已经有这个分类了';
      break;
    case 'UNABLE_TO_REPLY_THIS_COMMENT':
      statusCode = 400;
      message = '无法回复这条评论';
      break;
    case 'COVER_TYPE_NOT_ACCEPT':
      statusCode = 400;
      message = '不能上传此类型文件';
      break;
    case 'FILE_TYPE_NOT_ACCEPT':
      statusCode = 400;
      message = '不能上传此类型文件';
      break;
    case 'TITLE_IS_REQUIRED':
      statusCode = 400;
      message = '请提供资源标题';
      break;
    case 'CATEGORY_IS_REQUIRED':
      statusCode = 400;
      message = '请提供教学用途分类';
      break;
    case 'FILE_FORMAT_IS_REQUIRED':
      statusCode = 400;
      message = '请提供文件格式';
      break;
    case 'FILE_URL_IS_REQUIRED':
      statusCode = 400;
      message = '请提供文件URL';
      break;
    case 'FILE_IS_REQUIRED':
      statusCode = 400;
      message = '请提供资源文件';
      break;
    case 'NOT_FOUND':
      statusCode = 404;
      message = '没找到 ~~ 🦖';
      break;
    case 'USER_NOT_FOUND':
      statusCode = 404;
      message = '没找到这个用户 ~~';
      break;
    case 'PASSWORD_IS_THE_SAME':
      statusCode = 400;
      message = '要修改的密码不能与原密码一样';
      break;
    case 'PASSWORD_IS_THE_SAME':
      statusCode = 400;
      message = '要修改的密码不能与原密码一样';
      break;
    default:
      statusCode = 500;
      message = '服务暂时出了点问题 ~~ 🌴';
      break;
  }

  response.status(statusCode).send({ message });
};
