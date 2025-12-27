-- Catalog 任务表
-- 用于记录用户主动点击的行动
CREATE TABLE IF NOT EXISTS `catalog_tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_type` ENUM('add_resources', 'organize_units') NOT NULL COMMENT '任务类型：add_resources(补充资源) / organize_units(整理单元)',
  `catalog_id` INT NOT NULL COMMENT '教材目录ID',
  `unit` VARCHAR(32) NULL DEFAULT NULL COMMENT '单元名称（可选）',
  `created_by` INT NOT NULL COMMENT '创建任务的用户ID',
  `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '任务状态：pending(待处理) / completed(已完成) / cancelled(已取消)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_catalog_id` (`catalog_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_status` (`status`),
  KEY `idx_task_type` (`task_type`),
  CONSTRAINT `fk_catalog_tasks_catalog` FOREIGN KEY (`catalog_id`) REFERENCES `textbook_catalog` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_catalog_tasks_user` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalog 任务表（记录用户主动点击的行动）';

