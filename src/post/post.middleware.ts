import { Request, Response, NextFunction } from 'express';

/**
 * 排序方式
 */
export const sort = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 获取客户端的排序方式
    const { sort } = request.query;

    // 排序用的 SQL
    let sqlSort: string;

    // 设置排序用的 SQL
    switch (sort) {
        case 'earliest':
            sqlSort = 'post.id ASC';
            break;
        case 'latest':
            sqlSort = 'post.id DESC';
            break;
        case 'most_comments':
            sqlSort = 'totalComments DESC ,post.id DESC';
            break;
        default:
            sqlSort = 'post.id DESC';
            break;
    }

    // 在请求中添加排序
    request.sort = sqlSort;

    // 下一步
    next();
};

/**
 * 过滤列表
 */
export const filter = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    // 解构查询符
    const { tag, user, action, grade, subject, version, category } = request.query;

    // 设置默认的过滤
    request.filter = {
        name: 'default',
        sql: 'post.id IS NOT NULL',
    };

    // 组合过滤
    if (category || grade || version || subject) {
        var sql = ' 1=1 '
        if (category) {
            sql += "and category='" + category + "'";
        }
        if (grade) {
            sql += "and grade='" + grade + "'";
        }
        if (version) {
            sql += "and version='" + version + "'";
        }
        if (subject) {
            sql += "and subject='" + subject + "'";
        }
        request.filter = {
            name: 'default',
            sql: sql,
        };
    }

    // 按年级过滤
    if (grade && !tag && !user && !action && !subject && !version && !category) {
        request.filter = {
            name: 'grade',
            sql: 'grade = ?',
            param: grade,
        };
    }

    // 按学科过滤
    if (subject && !tag && !user && !action && !grade && !version && !category) {
        request.filter = {
            name: 'subject',
            sql: 'subject = ?',
            param: subject,
        };
    }

    // 按版本过滤
    if (version && !tag && !user && !action && !grade && !subject && !category) {
        request.filter = {
            name: 'version',
            sql: 'version = ?',
            param: version,
        };
    }

    // 按类型过滤
    if (category && !tag && !user && !action && !grade && !version && !subject) {
        request.filter = {
            name: 'category',
            sql: 'category = ?',
            param: category,
        };
    }

    // 按标签名过滤
    if (tag && !user && !action) {
        request.filter = {
            name: 'tagName',
            sql: 'tag.name = ?',
            param: tag,
        };
    }

    // 过滤出用户发布的内容
    if (user && action == 'published' && !tag) {
        request.filter = {
            name: 'userPublished',
            sql: 'user.id = ?',
            param: user,
        };
    }

    // 过滤出用户赞过的内容
    if (user && action == 'liked' && !tag) {
        request.filter = {
            name: 'userLiked',
            sql: 'user_like_post.userId = ?',
            param: user,
        };
    }

    // 过滤出用户保存的内容
    if (user && action == 'saved' && !tag) {
        request.filter = {
            name: 'userSaved',
            sql: 'user_save_post.userId = ?',
            param: user,
        };
    }

    // 下一步
    next();
};

/**
 * 内容分页
 */
export const paginate = (itemsPerPage: number) => {
    return async (request: Request, response: Response, next: NextFunction) => {
        // 当前页码
        const { page = 1 } = request.query;

        // 每页内容数量
        const limit = itemsPerPage || 30;

        // 计算出偏移量
        const offset = limit * (page - 1);

        // 设置请求中的分页
        request.pagination = { limit, offset };

        // 下一步
        next();
    };
};
