import { connection } from '../app/database/mysql';
import { ClassificationModel } from './classification.model';

/**
 * 获取 classification
 */
export const getClassification = () => {
  var classificationObj = {
    category: {},
    grade: {},
    version: {},
    subject: {}
  }
  classificationObj.category = getCategory();
  classificationObj.grade = getGrade();
  classificationObj.version = getVersion();
  classificationObj.subject = getSubject();
  return classificationObj;


};

/**
 * 获取 category 列表
 */
export const getCategory = async () => {
  const statement = `
    SELECT
      DISTINCT(category)
    FROM post
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取 grade 列表
 */
export const getGrade = async () => {
  const statement = `
    SELECT
      DISTINCT(grade)
    FROM post
    ORDER BY FIELD(SUBSTRING(grade,1,1),'一','二','三','四','五','六','七','八','九');
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取 version 列表
 */
export const getVersion = async () => {
  const statement = `
    SELECT
      DISTINCT(version)
    FROM post
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};

/**
 * 获取 subject 列表
 */
export const getSubject = async () => {
  const statement = `
    SELECT
      DISTINCT(subject)
    FROM post
  `;

  const [data] = await connection.promise().query(statement);

  return data;
};




