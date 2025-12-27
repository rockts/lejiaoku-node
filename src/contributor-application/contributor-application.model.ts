/**
 * Contributor 申请模型
 */

export class ContributorApplicationModel {
  id?: number;
  user_id: number; // 申请用户ID
  status?: 'pending' | 'approved' | 'rejected'; // 申请状态
  reviewed_by?: number | null; // 审核人ID（管理员）
  reviewed_at?: Date | null; // 审核时间
  created_at?: Date; // 申请时间
  updated_at?: Date; // 更新时间
}


