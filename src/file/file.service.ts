import path from 'path';
import Jimp from 'jimp';
import { connection } from '../app/database/mysql';
import { FileModel } from './file.model';

/**
 * 存储文件信息
 */
export const createFile = async (file: FileModel) => {
  // 准备查询
  const statement = `
    INSERT INTO file
    SET id  ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, file);

  // 提供数据
  return data;
};

/**
 * 按资源获取 type ID
 */
export const findResourcesTypeId = async (typeId: number) => {
  // 准备查询
  const statement = `
    SELECT typeId FROM resources
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, typeId);

  // 提供数据
  return data;

}

/**
 * 按 ID 查找文件
 */
export const findFileById = async (fileId: number) => {
  // 准备查询
  const statement = `
    SELECT * FROM file
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, fileId);

  // 提供数据
  return data[0];
};