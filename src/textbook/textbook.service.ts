import { connection } from '../app/database/mysql';
import { TextbookModel, TextbookStructureModel } from './textbook.model';

/**
 * 创建教材
 */
export const createTextbook = async (textbook: TextbookModel) => {
  const statement = `
    INSERT INTO textbook
    SET ?
  `;
  
  const [data] = await connection.promise().query(statement, textbook);
  return data as any;
};

/**
 * 根据 ID 获取教材
 */
export const getTextbookById = async (textbookId: number) => {
  const statement = `
    SELECT *
    FROM textbook
    WHERE id = ?
  `;
  
  const [data] = await connection.promise().query(statement, textbookId);
  if (!data || !data[0] || !data[0].id) {
    throw new Error('NOT_FOUND');
  }
  return data[0];
};

/**
 * 根据 resource_id 获取教材
 */
export const getTextbookByResourceId = async (resourceId: number) => {
  const statement = `
    SELECT *
    FROM textbook
    WHERE resource_id = ?
  `;
  
  const [data] = await connection.promise().query(statement, resourceId);
  if (data && data[0] && data[0].id) {
    return data[0];
  }
  return null;
};

/**
 * 创建章节结构节点
 */
export const createTextbookStructure = async (structure: TextbookStructureModel) => {
  const statement = `
    INSERT INTO textbook_structure
    SET ?
  `;
  
  const [data] = await connection.promise().query(statement, structure);
  return data as any;
};

/**
 * 批量创建章节结构节点
 */
export const createTextbookStructures = async (structures: TextbookStructureModel[]) => {
  if (structures.length === 0) {
    return [];
  }
  
  // 按层级分组：先插入 Level 1，再插入 Level 2，最后插入 Level 3
  const level1Structures = structures.filter(s => s.level === 1);
  const level2Structures = structures.filter(s => s.level === 2);
  const level3Structures = structures.filter(s => s.level === 3);
  
  const level1Ids: number[] = [];
  const level2Ids: number[] = [];
  const level3Ids: number[] = [];
  
  // 1. 插入 Level 1 节点（单元）
  if (level1Structures.length > 0) {
    const statement = `
      INSERT INTO textbook_structure (textbook_id, level, parent_id, order_index, title, description, raw_text)
      VALUES ?
    `;
    const values = level1Structures.map(s => [
      s.textbook_id,
      s.level,
      null,
      s.order_index || 0,
      s.title,
      s.description || null,
      s.raw_text || null
    ]);
    const [data]: any = await connection.promise().query(statement, [values]);
    for (let i = 0; i < level1Structures.length; i++) {
      level1Ids.push(data.insertId + i);
    }
  }
  
  // 2. 插入 Level 2 节点（课/章节），设置 parent_id 为对应的 Level 1 节点
  if (level2Structures.length > 0) {
    const statement = `
      INSERT INTO textbook_structure (textbook_id, level, parent_id, order_index, title, description, raw_text)
      VALUES ?
    `;
    const values = level2Structures.map((s, index) => {
      // 找到对应的 Level 1 父节点（根据 order_index）
      let parentId: number | null = null;
      if (level1Ids.length > 0) {
        // 找到最近的 Level 1 节点（order_index 小于等于当前节点的 order_index）
        for (let i = level1Ids.length - 1; i >= 0; i--) {
          if (level1Structures[i].order_index <= (s.order_index || 0)) {
            parentId = level1Ids[i];
            break;
          }
        }
        // 如果没有找到，使用第一个 Level 1 节点
        if (!parentId) {
          parentId = level1Ids[0];
        }
      }
      return [
        s.textbook_id,
        s.level,
        parentId,
        s.order_index || 0,
        s.title,
        s.description || null,
        s.raw_text || null
      ];
    });
    const [data]: any = await connection.promise().query(statement, [values]);
    for (let i = 0; i < level2Structures.length; i++) {
      level2Ids.push(data.insertId + i);
    }
  }
  
  // 3. 插入 Level 3 节点（子目），设置 parent_id 为对应的 Level 2 节点
  if (level3Structures.length > 0) {
    const statement = `
      INSERT INTO textbook_structure (textbook_id, level, parent_id, order_index, title, description, raw_text)
      VALUES ?
    `;
    const values = level3Structures.map((s, index) => {
      // 找到对应的 Level 2 父节点（根据原始结构中的引用或 order_index）
      let parentId: number | null = null;
      if (level2Ids.length > 0) {
        // 简化：使用最近的 Level 2 节点作为父节点
        // 实际应该根据解析时的父子关系来确定
        const parentIndex = Math.min(index, level2Ids.length - 1);
        parentId = level2Ids[parentIndex];
      }
      return [
        s.textbook_id,
        s.level,
        parentId,
        s.order_index || 0,
        s.title,
        s.description || null,
        s.raw_text || null
      ];
    });
    const [data]: any = await connection.promise().query(statement, [values]);
    for (let i = 0; i < level3Structures.length; i++) {
      level3Ids.push(data.insertId + i);
    }
  }
  
  return { insertId: level1Ids[0] || level2Ids[0] || level3Ids[0] || 0 };
};

/**
 * 获取教材的所有章节结构（平铺列表）
 */
export const getTextbookStructures = async (textbookId: number) => {
  const statement = `
    SELECT *
    FROM textbook_structure
    WHERE textbook_id = ?
    ORDER BY level ASC, order_index ASC
  `;
  
  const [data] = await connection.promise().query(statement, textbookId);
  return data;
};

/**
 * 获取教材的章节结构树
 */
export const getTextbookStructureTree = async (textbookId: number) => {
  const structures = await getTextbookStructures(textbookId);
  
  // 构建树结构
  const nodeMap = new Map<number, any>();
  const rootNodes: any[] = [];
  
  // 第一遍：创建所有节点
  structures.forEach((s: any) => {
    nodeMap.set(s.id, {
      id: s.id,
      level: s.level,
      title: s.title,
      description: s.description,
      order_index: s.order_index,
      children: []
    });
  });
  
  // 第二遍：构建父子关系
  structures.forEach((s: any) => {
    const node = nodeMap.get(s.id);
    if (s.parent_id === null) {
      rootNodes.push(node);
    } else {
      const parent = nodeMap.get(s.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });
  
  // 第三遍：排序
  const sortNodes = (nodes: any[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  
  sortNodes(rootNodes);
  
  return rootNodes;
};
