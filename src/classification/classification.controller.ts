import { Request, Response, NextFunction, request } from 'express';
import _ from 'lodash';
import { getCategory, getSubject, getGrade, getVersion } from './classification.service';

/**
 * classification 列表
 */
export const index = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {

    try {
        const category = await getCategory();
        const grade = await getGrade();
        const version = await getVersion();
        const subject = await getSubject();

        response.send({
            category,
            grade,
            version,
            subject
        });
    } catch (error) {
        next(error);
    }
};

// 获取类型
export const category = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const category = await getCategory();
        response.send(category);
    } catch (error) {
        next(error)
    }
}

// 获取年级
export const grade = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const grade = await getGrade();
        response.send(grade);
    } catch (error) {
        next(error)
    }
}

// 获取版本 
export const version = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const version = await getVersion();
        response.send(version);
    } catch (error) {
        next(error)
    }
}

// 获取学科 
export const subject = async (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    try {
        const subject = await getSubject();
        response.send(subject);
    } catch (error) {
        next(error)
    }
}

/**
 * 单个类型
 */
// export const show = async (
//     request: Request,
//     response: Response,
//     next: NextFunction,
// ) => {
//     // 准备数据
//     const { AttrName } = request.params;
//     const AttrName = { category, grade, version, subject }

//     // 调取内容
//     try {
//         const category = await getClassificationByName(AttrName);

//         // 做出响应
//         response.send(category)
//     } catch (error) {
//         next(error)
//     }
// };






