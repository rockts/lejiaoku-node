import { Request, Response, NextFunction } from 'express';

/**
 * 过滤器
 */
export const filter = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  // 解构查询符
  const { resources, user, action } = request.query;

  // 默认的过滤
  request.filter = {
    name: 'default',
    sql: 'comment.parentId IS NULL',
  };

  // 内容的评论
  if (resources && !user && !action) {
    request.filter = {
      name: 'resourcesComments',
      sql: 'comment.parentId IS NULL AND comment.resourcesId = ?',
      param: resources,
    };
  }

  // 用户的评论
  if (user && action == 'published' && !resources) {
    request.filter = {
      name: 'userPublished',
      sql: 'comment.parentId IS NULL AND comment.userId = ?',
      param: user,
    };
  }

  // 用户的回复
  if (user && action == 'replied' && !resources) {
    request.filter = {
      name: 'userReplied',
      sql: 'comment.parentId IS NOT NULL AND comment.userId = ?',
      param: user,
    };
  }

  // 下一步
  next();
};
