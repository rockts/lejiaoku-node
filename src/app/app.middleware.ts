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
    if (error.message === 'VIDEO_FILE_NOT_ACCEPT') {
      statusCode = 400;
      message = '暂不支持视频资源上传';
      return response.status(statusCode).send({ message });
    }
    if (error.message === 'FILE_TYPE_NOT_ACCEPT') {
      statusCode = 400;
      message = '文件类型不允许，支持：PDF、PPT、DOC、图片';
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
    case 'USERNAME_ALREADY_EXIST':
      statusCode = 409;
      message = '用户名已被占用';
      break;
    case 'USERNAME_FORMAT_INVALID':
      statusCode = 400;
      message = '用户名格式无效，必须是4-20位，以字母开头，可包含字母、数字、下划线(_)或短横线(-)';
      break;
    case 'EMAIL_ALREADY_EXIST':
      statusCode = 409;
      message = '邮箱已被占用';
      break;
    case 'USERNAME_OR_NAME_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户名';
      break;
    case 'USERNAME_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户名';
      break;
    case 'USERNAME_OR_EMAIL_IS_REQUIRED':
      statusCode = 400;
      message = '请提供用户名或邮箱';
      break;
    case 'INVALID_ROLE':
      statusCode = 400;
      message = '无效的角色，只能是 user 或 admin';
      break;
    case 'FORBIDDEN':
      statusCode = 403;
      message = '无权执行此操作';
      break;
    case 'USER_DOES_NOT_EXIST':
      statusCode = 400;
      message = '用户不存在';
      break;
    case 'PASSWORD_DOES_NOT_MATCH':
      statusCode = 400;
      message = '用户名或密码错误';
      break;
    case 'UNAUTHORIZED':
      statusCode = 401;
      message = '未授权，请先登录';
      break;
    case 'RESOURCE_NOT_FOUND':
      statusCode = 404;
      message = '资源不存在';
      break;
    case 'INVALID_RESOURCE_ID':
      statusCode = 400;
      message = '无效的资源ID';
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
          case 'INVALID_STATUS':
            statusCode = 400;
            message = '状态值无效，只能是 approved 或 rejected';
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
    case 'TEXTBOOK_CATALOG_ID_IS_REQUIRED':
      statusCode = 400;
      message = '请提供教材目录ID';
      break;
    case 'INVALID_ID':
      statusCode = 400;
      message = '无效的ID参数';
      break;
    case 'RESOURCE_NOT_FOUND':
      statusCode = 404;
      message = '资源不存在';
      break;
    case 'TEXTBOOK_CATALOG_NOT_FOUND':
      statusCode = 404;
      message = '教材目录不存在';
      break;
    case 'UPDATE_DATA_REQUIRED':
      statusCode = 400;
      message = '请提供要更新的数据';
      break;
    case 'NO_UPDATE_FIELDS':
      statusCode = 400;
      message = '没有要更新的字段';
      break;
    default:
      statusCode = 500;
      message = '服务暂时出了点问题 ~~ 🌴';
      console.log('❌ 未处理的错误:', error.message, error);
      // 如果是数据库错误，提供更详细的错误信息
      if (error.code && error.code.startsWith('ER_')) {
        console.log('  数据库错误代码:', error.code);
        console.log('  SQL 错误消息:', error.sqlMessage);
        // 可以根据不同的数据库错误返回不同的提示
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          message = '数据关联错误，请检查数据完整性';
        } else if (error.code === 'ER_DUP_ENTRY') {
          message = '数据已存在，请勿重复提交';
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
          message = '数据库字段错误，请联系管理员';
        }
      }
      break;
  }

  response.status(statusCode).send({ message });
};
