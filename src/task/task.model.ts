/**
 * Catalog 任务模型
 * 用于记录用户主动点击的行动
 */

export interface CatalogTaskModel {
  id?: number;
  task_type: 'add_resources' | 'organize_units';
  catalog_id: number;
  unit?: string | null;
  created_by: number;
  status?: 'pending' | 'completed' | 'cancelled';
  created_at?: Date;
  updated_at?: Date;
}

