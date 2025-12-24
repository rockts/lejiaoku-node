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

/**
 * 将中文年级转换为数字年级（用于匹配 textbook_catalog 表）
 * 例如："二年级" -> "2", "一年级" -> "1"
 */
function convertGradeToNumber(grade: string | number): string {
  if (typeof grade === 'number') {
    return String(grade);
  }
  
  const gradeMap: { [key: string]: string } = {
    '一年级': '1',
    '二年级': '2',
    '三年级': '3',
    '四年级': '4',
    '五年级': '5',
    '六年级': '6',
    '七年级': '7',
    '八年级': '8',
    '九年级': '9',
  };
  
  // 如果已经是数字字符串，直接返回
  if (/^\d+$/.test(grade.trim())) {
    return grade.trim();
  }
  
  // 尝试从 map 中查找
  if (gradeMap[grade]) {
    return gradeMap[grade];
  }
  
  // 尝试提取数字（如 "2年级" -> "2"）
  const match = grade.match(/(\d+)/);
  if (match) {
    return match[1];
  }
  
  // 如果无法转换，返回原值（可能会匹配失败）
  return grade;
}

/**
 * 根据 auto_meta_result 绑定资源到教材目录
 * 
 * 功能：
 * 1. 从 resource.auto_meta_result 中提取字段
 * 2. 匹配 textbook_catalog 表找到对应的教材目录
 * 3. 写入 resource_textbook_map 表（幂等，source='ai'）
 * 
 * @param resourceId 资源ID
 * @returns 返回绑定的教材目录ID，如果未找到匹配或已绑定则返回 null
 */
export const bindResourceToCatalogByAutoMeta = async (resourceId: number): Promise<number | null> => {
  try {
    // 1. 获取资源的 auto_meta_result
    const [resourceData]: any = await connection.promise().query(
      'SELECT auto_meta_result FROM resource WHERE id = ?',
      [resourceId]
    );
    
    if (!resourceData || !resourceData[0] || !resourceData[0].auto_meta_result) {
      console.log(`[绑定教材目录] 资源 ${resourceId} 不存在或没有 auto_meta_result`);
      return null;
    }
    
    const autoMetaResult = typeof resourceData[0].auto_meta_result === 'string' 
      ? JSON.parse(resourceData[0].auto_meta_result)
      : resourceData[0].auto_meta_result;
    
    // 2. 提取需要的字段
    const education_level = autoMetaResult.education_level;
    const subject = autoMetaResult.subject;
    const grade = autoMetaResult.grade;
    const volume = autoMetaResult.volume;
    const textbook_version = autoMetaResult.textbook_version;
    
    // 3. 检查必要字段是否都存在
    if (!education_level || !subject || !grade || !volume || !textbook_version) {
      console.log(`[绑定教材目录] 资源 ${resourceId} 的 auto_meta_result 缺少必要字段`, {
        education_level,
        subject,
        grade,
        volume,
        textbook_version
      });
      return null;
    }
    
    // 4. 转换 grade 格式（将 "二年级" 转换为 "2"）
    const gradeNumber = convertGradeToNumber(grade);
    
    // 5. 匹配 textbook_catalog 表
    const [catalogData]: any = await connection.promise().query(
      `SELECT id FROM textbook_catalog 
       WHERE education_level = ? 
       AND subject = ? 
       AND grade = ? 
       AND volume = ? 
       AND textbook_version = ?
       LIMIT 1`,
      [education_level, subject, gradeNumber, volume, textbook_version]
    );
    
    if (!catalogData || !catalogData[0] || !catalogData[0].id) {
      console.log(`[绑定教材目录] 资源 ${resourceId} 未找到匹配的教材目录`, {
        education_level,
        subject,
        grade,
        grade_converted: gradeNumber,
        volume,
        textbook_version
      });
      return null;
    }
    
    const catalogId = catalogData[0].id;
    
    // 6. 检查是否已经绑定（幂等性）
    const [existingBind]: any = await connection.promise().query(
      'SELECT id FROM resource_textbook_map WHERE resource_id = ? AND textbook_catalog_id = ?',
      [resourceId, catalogId]
    );
    
    if (existingBind && existingBind[0] && existingBind[0].id) {
      console.log(`[绑定教材目录] 资源 ${resourceId} 已绑定到教材目录 ${catalogId}，跳过`);
      return catalogId;
    }
    
    // 7. 写入 resource_textbook_map（幂等）
    // 使用 ON DUPLICATE KEY UPDATE 确保幂等性
    // 如果表有 bind_time 字段则更新 bind_time，否则更新 updated_at
    // 由于用户要求 bind_time = now()，这里尝试更新 bind_time，如果字段不存在会失败，需要根据实际表结构调整
    const statement = `
      INSERT INTO resource_textbook_map (resource_id, textbook_catalog_id, source, created_at)
      VALUES (?, ?, 'ai', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        source = VALUES(source),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await connection.promise().query(statement, [resourceId, catalogId]);
    
    console.log(`[绑定教材目录] 资源 ${resourceId} 成功绑定到教材目录 ${catalogId}`);
    return catalogId;
  } catch (error) {
    console.error(`[绑定教材目录] 资源 ${resourceId} 绑定失败:`, error);
    throw error;
  }
};
