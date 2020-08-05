import path from 'path';
import Jimp from 'jimp';
import { connection } from '../app/database/mysql';
import { CoverModel } from './cover.model';

/**
 * 存储文件信息
 */
export const createCover = async (cover: CoverModel) => {
  // 准备查询
  const statement = `
    INSERT INTO cover
    SET ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, cover);

  // 提供数据
  return data;
};

/**
 * 按 ID 查找文件
 */
export const findCoverById = async (CoverId: number) => {
  // 准备查询
  const statement = `
    SELECT * FROM cover
    WHERE id = ?
  `;

  // 执行查询
  const [data] = await connection.promise().query(statement, CoverId);

  // 提供数据
  return data[0];
};

/**
 * 调整图像尺寸
 */
export const imageResizer = async (image: Jimp, cover: Express.Multer.File) => {
  // 图像尺寸
  const { imageSize } = image['_exif'];

  // 文件路径
  const CoverPath = path.join(cover.destination, 'resized', cover.filename);

  // 大尺寸
  if (imageSize.width > 1280) {
    image
      .resize(1280, Jimp.AUTO)
      .quality(85)
      .write(`${CoverPath}-large`);
  }

  // 中等尺寸
  if (imageSize.width > 640) {
    image
      .resize(640, Jimp.AUTO)
      .quality(85)
      .write(`${CoverPath}-medium`);
  }

  // 缩略图
  if (imageSize.width > 320) {
    image
      .resize(320, Jimp.AUTO)
      .quality(85)
      .write(`${CoverPath}-thumbnail`);
  }
};
