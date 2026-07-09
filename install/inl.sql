SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for mok_admin
-- ----------------------------
DROP TABLE IF EXISTS `mok_admin`;
CREATE TABLE `mok_admin`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_admin
-- ----------------------------
INSERT INTO `mok_admin` VALUES (1, 'admin', '$2y$12$JCl9FOqRNc9WQhrWovs6HebqtoJnmq8FJu.NqcomUKqxtXvqd0O0.');

-- ----------------------------
-- Table structure for mok_application
-- ----------------------------
DROP TABLE IF EXISTS `mok_application`;
CREATE TABLE `mok_application`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '申请ID，自增主键',
  `app_type` tinyint(1) NOT NULL COMMENT '申请类型：1-好友申请 2-群聊申请',
  `applicant_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请人ID（关联mok_user.id）',
  `target_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '目标对象ID（好友申请时为好友user_id，群聊申请时为群group_id）',
  `reason` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '申请理由/验证消息',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '申请状态：0-已拒绝 1-待处理 2-已同意 3-已过期 4-已取消',
  `apply_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `handle_time` datetime NULL DEFAULT NULL COMMENT '处理时间',
  `expire_time` datetime NULL DEFAULT NULL COMMENT '过期时间（NULL表示永不过期）',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息（如拒绝理由等）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_applicant`(`applicant_id`) USING BTREE COMMENT '索引：按申请人查询申请记录',
  INDEX `idx_target`(`target_id`) USING BTREE COMMENT '索引：按目标对象查询申请记录',
  INDEX `idx_status`(`status`) USING BTREE COMMENT '索引：按申请状态筛选',
  INDEX `idx_apply_time`(`apply_time`) USING BTREE COMMENT '索引：按申请时间排序',
  INDEX `idx_type_status`(`app_type`, `status`) USING BTREE COMMENT '联合索引：按类型和状态查询',
  INDEX `idx_target_status`(`target_id`, `app_type`, `status`) USING BTREE COMMENT '联合索引：查询指定对象的待处理申请',
  INDEX `idx_applicant_status`(`applicant_id`, `status`) USING BTREE COMMENT '联合索引：查询用户指定状态的申请',
  INDEX `idx_expire_time`(`expire_time`, `status`) USING BTREE COMMENT '索引：查询过期的待处理申请'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '申请管理表（好友申请/群聊申请）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_application
-- ----------------------------

-- ----------------------------
-- Table structure for mok_cdk
-- ----------------------------
DROP TABLE IF EXISTS `mok_cdk`;
CREATE TABLE `mok_cdk`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '激活码',
  `item_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'gcoin' COMMENT '奖励类型: gcoin/item',
  `reward` int(11) NOT NULL COMMENT '奖励数量',
  `item_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'G币' COMMENT '奖励名称',
  `use_type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1-单人单次 2-范围次数 3-全服无限',
  `max_uses` int(11) NULL DEFAULT NULL COMMENT '最大使用次数(use_type=2时有效)',
  `used_count` int(11) NOT NULL DEFAULT 0 COMMENT '已使用次数',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '1-有效 0-无效',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expire_time` datetime NOT NULL COMMENT '过期时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_code`(`code`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'CDK兑换码表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_cdk
-- ----------------------------

-- ----------------------------
-- Table structure for mok_cdk_usage
-- ----------------------------
DROP TABLE IF EXISTS `mok_cdk_usage`;
CREATE TABLE `mok_cdk_usage`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `cdk_id` bigint(20) NOT NULL,
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `use_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_cdk_user`(`cdk_id`, `user_id`) USING BTREE,
  INDEX `idx_cdk_id`(`cdk_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'CDK使用记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_cdk_usage
-- ----------------------------

-- ----------------------------
-- Table structure for mok_checkin
-- ----------------------------
DROP TABLE IF EXISTS `mok_checkin`;
CREATE TABLE `mok_checkin`  (
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `last_checkin_date` date NOT NULL COMMENT '最后签到日期',
  `streak` int(11) NOT NULL DEFAULT 0 COMMENT '连续签到天数',
  `total_days` int(11) NOT NULL DEFAULT 0 COMMENT '累计签到天数',
  `last_reward` int(11) NOT NULL DEFAULT 0 COMMENT '最后获得奖励',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户签到状态表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_checkin
-- ----------------------------

-- ----------------------------
-- Table structure for mok_contact
-- ----------------------------
DROP TABLE IF EXISTS `mok_contact`;
CREATE TABLE `mok_contact`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '当前用户ID（关联mok_user.id）',
  `friend_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '好友用户ID（关联mok_user.id）',
  `friend_alias` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '好友备注名',
  `friend_group` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '默认分组' COMMENT '好友分组（如：家人/同事/朋友）',
  `add_status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '好友状态：0-已删除 1-正常 2-拉黑 3-待验证（好友申请中）',
  `add_time` datetime NOT NULL COMMENT '添加好友时间',
  `verify_msg` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '添加好友时的验证消息',
  `last_interact_time` datetime NULL DEFAULT NULL COMMENT '最后互动时间（如：查看资料）',
  `sort_weight` int(11) NOT NULL DEFAULT 0 COMMENT '好友列表排序权重（值越大越靠前）',
  `ispin` tinyint(1) NULL DEFAULT 0 COMMENT '是否置顶 0-否 1-是',
  `permission` json NULL COMMENT '好友权限设置：{\"view_moment\": true/false, \"view_album\": true/false}',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_user_friend`(`user_id`, `friend_id`) USING BTREE COMMENT '唯一索引：避免重复添加好友',
  INDEX `idx_user_status`(`user_id`, `add_status`) USING BTREE COMMENT '索引：按用户+状态查询好友',
  INDEX `idx_friend_id`(`friend_id`) USING BTREE COMMENT '索引：反向查询（谁加了我为好友）'
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '好友联系人' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_contact
-- ----------------------------

-- ----------------------------
-- Table structure for mok_email_verify
-- ----------------------------
DROP TABLE IF EXISTS `mok_email_verify`;
CREATE TABLE `mok_email_verify`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱地址',
  `token` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证令牌',
  `expire_time` datetime NOT NULL COMMENT '过期时间',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0-未验证 1-已验证',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_token`(`token`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '邮箱验证表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_email_verify
-- ----------------------------

-- ----------------------------
-- Table structure for mok_file_archive
-- ----------------------------
DROP TABLE IF EXISTS `mok_file_archive`;
CREATE TABLE `mok_file_archive`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `file_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件唯一标识（UUID）',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上传者用户ID，关联mok_user.id',
  `object_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'S3对象键名（完整路径）',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
  `file_size` bigint(20) NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
  `file_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件哈希值（SHA-256），用于去重',
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件MIME类型',
  `file_extension` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件扩展名',
  `bucket_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储桶名称',
  `etag` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'S3 ETag',
  `upload_method` tinyint(1) NOT NULL DEFAULT 1 COMMENT '上传方式：1-简单上传 2-分片上传',
  `upload_status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '上传状态：0-上传中 1-已完成 2-失败 3-已删除',
  `download_count` int(11) NOT NULL DEFAULT 0 COMMENT '下载次数',
  `metadata` json NULL COMMENT '自定义元数据（JSON格式）',
  `upload_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `last_access_time` datetime NULL DEFAULT NULL COMMENT '最后访问时间',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间（软删除）',
  `expire_time` datetime NULL DEFAULT NULL COMMENT '过期时间（自动清理）',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '索引：按用户查询上传文件',
  INDEX `idx_upload_time`(`upload_time`) USING BTREE COMMENT '索引：按上传时间排序',
  INDEX `idx_upload_status`(`upload_status`) USING BTREE COMMENT '索引：按上传状态筛选',
  INDEX `idx_object_key`(`object_key`(255)) USING BTREE COMMENT '索引：按对象键名查询',
  INDEX `idx_user_status`(`user_id`, `upload_status`) USING BTREE COMMENT '联合索引：查询用户指定状态的文件',
  INDEX `idx_expire_time`(`expire_time`, `upload_status`) USING BTREE COMMENT '索引：查询过期文件'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '文件归档索引表 - 记录所有S3文件元数据' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_file_archive
-- ----------------------------

-- ----------------------------
-- Table structure for mok_group_announcement
-- ----------------------------
DROP TABLE IF EXISTS `mok_group_announcement`;
CREATE TABLE `mok_group_announcement`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '公告ID，自增主键',
  `group_id` bigint(20) NOT NULL COMMENT '所属群ID，关联mok_group_chat.id',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告内容',
  `creator_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建者用户ID，关联mok_user.id',
  `is_top` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0-否 1-是',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '公告状态：0-已删除 1-正常 2-已过期',
  `publish_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `expire_time` datetime NULL DEFAULT NULL COMMENT '过期时间（NULL表示永不过期）',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_group_id`(`group_id`) USING BTREE COMMENT '索引：按群ID查询公告列表',
  INDEX `idx_group_status`(`group_id`, `status`) USING BTREE COMMENT '联合索引：查询指定群的有效公告',
  INDEX `idx_group_top`(`group_id`, `is_top`, `publish_time`) USING BTREE COMMENT '联合索引：查询指定群置顶公告（按时间排序）',
  INDEX `idx_publish_time`(`publish_time`) USING BTREE COMMENT '索引：按发布时间排序',
  INDEX `idx_creator_id`(`creator_id`) USING BTREE COMMENT '索引：按创建者查询公告',
  INDEX `idx_group_expire`(`group_id`, `expire_time`, `status`) USING BTREE COMMENT '联合索引：查询指定群未过期的公告',
  CONSTRAINT `fk_announcement_group` FOREIGN KEY (`group_id`) REFERENCES `mok_group_chat` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_announcement_user` FOREIGN KEY (`creator_id`) REFERENCES `mok_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群公告表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_group_announcement
-- ----------------------------

-- ----------------------------
-- Table structure for mok_group_chat
-- ----------------------------
DROP TABLE IF EXISTS `mok_group_chat`;
CREATE TABLE `mok_group_chat`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键（群ID）',
  `group_name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '群名称',
  `group_avatar` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '群头像（关联文件路径）',
  `owner_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '群主ID',
  `group_desc` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '群描述/简介',
  `group_status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '群状态：0-已解散 1-正常 2-封禁 3-仅群主可发言',
  `max_member` int(11) NOT NULL DEFAULT 200 COMMENT '群最大成员数',
  `create_time` datetime NOT NULL COMMENT '群创建时间',
  `modify_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '群信息最后修改时间',
  `verify_join` tinyint(1) NOT NULL DEFAULT 1 COMMENT '加入验证：0-禁止搜索 1-禁止加入 2-无需验证\r\n3-需群主/管理员验证 4.仅邀请可加入',
  `usettings` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '群配置文件',
  `searnum` int(13) NULL DEFAULT NULL COMMENT '搜索群ID',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_owner_id`(`owner_id`) USING BTREE COMMENT '索引：按群主查询群聊',
  INDEX `idx_group_status`(`group_status`) USING BTREE COMMENT '索引：按群状态筛选',
  INDEX `idx_create_time`(`create_time`) USING BTREE COMMENT '索引：按创建时间排序',
  INDEX `idx_create_time_status`(`create_time`, `group_status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群聊基础信息表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_group_chat
-- ----------------------------

-- ----------------------------
-- Table structure for mok_group_file
-- ----------------------------
DROP TABLE IF EXISTS `mok_group_file`;
CREATE TABLE `mok_group_file`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `file_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件唯一标识',
  `group_id` bigint(20) NOT NULL COMMENT '所属群ID，关联mok_group_chat.id',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上传者用户ID，关联mok_user.id',
  `object_key` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'S3对象键名（完整路径）',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
  `file_size` bigint(20) NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
  `file_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件哈希值（SHA-256）',
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件MIME类型',
  `file_extension` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '文件扩展名',
  `bucket_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储桶名称',
  `etag` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT 'S3 ETag',
  `upload_method` tinyint(1) NOT NULL DEFAULT 2 COMMENT '上传方式：2-分片上传',
  `upload_status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '上传状态：1-已完成，3-已删除',
  `download_count` int(11) NOT NULL DEFAULT 0 COMMENT '下载次数',
  `metadata` json NULL COMMENT '自定义元数据（JSON格式）',
  `upload_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `last_access_time` datetime NULL DEFAULT NULL COMMENT '最后访问时间',
  `delete_time` datetime NULL DEFAULT NULL COMMENT '删除时间（软删除）',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_file_id`(`file_id`) USING BTREE,
  INDEX `idx_group_id`(`group_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_group_status`(`group_id`, `upload_status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群文件表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_group_file
-- ----------------------------

-- ----------------------------
-- Table structure for mok_group_log
-- ----------------------------
DROP TABLE IF EXISTS `mok_group_log`;
CREATE TABLE `mok_group_log`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '日志ID，自增主键',
  `group_id` bigint(20) NOT NULL COMMENT '群聊ID，关联mok_group_chat.id',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作者用户ID，关联mok_user.id',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型：create_group-创建群聊，update_info-更新群信息，add_admin-添加管理员，remove_admin-移除管理员，kick_member-踢出成员，quit_group-退出群聊，dismiss_group-解散群聊，ban_member-禁言成员，unban_member-解除禁言\r\npin-置顶公告 unpin-取消置顶公告\r\ndelete_announcement-删除公告\r\nupdate_announcement修改公告',
  `action_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `old_data` json NULL COMMENT '修改前的数据（JSON格式），用于记录变更前的状态',
  `new_data` json NULL COMMENT '修改后的数据（JSON格式），用于记录变更后的状态',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作者IP地址，支持IPv6',
  `user_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '用户代理信息',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '备注信息，用于记录额外说明',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_group_id`(`group_id`) USING BTREE COMMENT '索引：按群聊ID查询操作日志',
  INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '索引：按操作用户查询日志',
  INDEX `idx_action`(`action`) USING BTREE COMMENT '索引：按操作类型筛选',
  INDEX `idx_action_time`(`action_time`) USING BTREE COMMENT '索引：按操作时间排序和筛选',
  INDEX `idx_group_time`(`group_id`, `action_time`) USING BTREE COMMENT '联合索引：查询指定群聊的操作历史',
  INDEX `idx_user_time`(`user_id`, `action_time`) USING BTREE COMMENT '联合索引：查询指定用户的操作历史',
  INDEX `idx_group_action`(`group_id`, `action`) USING BTREE COMMENT '联合索引：查询指定群聊的特定操作',
  CONSTRAINT `fk_group_log_group` FOREIGN KEY (`group_id`) REFERENCES `mok_group_chat` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_group_log_user` FOREIGN KEY (`user_id`) REFERENCES `mok_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群聊操作日志表，记录所有群聊相关的操作行为' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_group_log
-- ----------------------------

-- ----------------------------
-- Table structure for mok_group_member
-- ----------------------------
DROP TABLE IF EXISTS `mok_group_member`;
CREATE TABLE `mok_group_member`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `group_id` bigint(20) NOT NULL COMMENT '关联群聊表mok_group_chat.id',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '群成员ID',
  `is_admin` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为群管理员：0-普通成员 1-管理员（群主默认是管理员）',
  `join_time` datetime NOT NULL COMMENT '加入群聊时间',
  `quit_time` datetime NULL DEFAULT NULL COMMENT '退出/被移出群聊时间（NULL表示仍在群内）',
  `join_type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '加入方式：0-被邀请 1-主动申请 2-扫码加入',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '成员状态：0-已退出 1-正常 2-被禁言 3-被踢出',
  `last_active_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间（发言/查看群聊等）',
  `isPinned` int(1) NULL DEFAULT NULL COMMENT '是否置顶',
  `galias` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '群聊备注',
  `nalsay` datetime NULL DEFAULT NULL COMMENT '是否被禁言',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_group_user`(`group_id`, `user_id`) USING BTREE COMMENT '唯一索引：一个用户在一个群内仅一条记录',
  INDEX `idx_group_admin`(`group_id`, `is_admin`) USING BTREE COMMENT '联合索引：快速查询群内管理员',
  INDEX `idx_user_status`(`user_id`, `status`) USING BTREE COMMENT '联合索引：查询用户的群聊状态',
  INDEX `idx_group_status_time`(`group_id`, `status`, `last_active_time`) USING BTREE,
  INDEX `idx_group_user_status`(`group_id`, `user_id`, `status`) USING BTREE,
  INDEX `idx_user_status_group`(`user_id`, `status`, `group_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群聊成员表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_group_member
-- ----------------------------

-- ----------------------------
-- Table structure for mok_intimacy
-- ----------------------------
DROP TABLE IF EXISTS `mok_intimacy`;
CREATE TABLE `mok_intimacy`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` int(11) NOT NULL DEFAULT 0 COMMENT '亲密度值',
  `alias` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '关系备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_user_target`(`user_id`, `target_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '亲密度表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_intimacy
-- ----------------------------

-- ----------------------------
-- Table structure for mok_loan
-- ----------------------------
DROP TABLE IF EXISTS `mok_loan`;
CREATE TABLE `mok_loan`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '借款人',
  `amount` int(11) NOT NULL COMMENT '借款总额',
  `repaid` int(11) NOT NULL DEFAULT 0 COMMENT '已还金额',
  `loan_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '借款时间',
  `repay_time` datetime NULL DEFAULT NULL COMMENT '还款时间(全部还清时)',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1-进行中 2-已还清 3-逾期',
  `last_repay_time` datetime NULL DEFAULT NULL COMMENT '最近一次还款时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_status`(`status`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '借款记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_loan
-- ----------------------------

-- ----------------------------
-- Table structure for mok_mail
-- ----------------------------
DROP TABLE IF EXISTS `mok_mail`;
CREATE TABLE `mok_mail`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '邮件ID',
  `from_id` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '发件人ID',
  `to_id` varchar(30) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '收件人ID',
  `title` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '邮件标题',
  `content` text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '邮件内容',
  `is_read` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读 1-已读',
  `is_delete` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否删除：0-未删除 1-已删除',
  `send_time` datetime NOT NULL COMMENT '发送时间',
  `read_time` datetime NULL DEFAULT NULL COMMENT '阅读时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_from_id`(`from_id`) USING BTREE,
  INDEX `idx_to_id`(`to_id`) USING BTREE,
  INDEX `idx_send_time`(`send_time`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_general_ci COMMENT = '邮件表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_mail
-- ----------------------------

-- ----------------------------
-- Table structure for mok_match_record
-- ----------------------------
DROP TABLE IF EXISTS `mok_match_record`;
CREATE TABLE `mok_match_record`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `game_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '比赛名称',
  `game_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '游戏类型：quiz-race等',
  `winner_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '胜者用户ID',
  `loser_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '败者用户ID',
  `winner_score` int(11) NOT NULL DEFAULT 0 COMMENT '胜者得分',
  `loser_score` int(11) NOT NULL DEFAULT 0 COMMENT '败者得分',
  `bet_enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否启用押注：0-否 1-是',
  `bet_amount` int(11) NOT NULL DEFAULT 0 COMMENT '押注金额（G币）',
  `bet_odds` int(11) NOT NULL DEFAULT 2 COMMENT '赔率',
  `bet_total` int(11) NOT NULL DEFAULT 0 COMMENT '总奖金 = 押注金额 * 赔率',
  `winner_gcoin_change` int(11) NOT NULL DEFAULT 0 COMMENT '胜者G币变化（正数）',
  `loser_gcoin_change` int(11) NOT NULL DEFAULT 0 COMMENT '败者G币变化（负数）',
  `game_data` json NULL COMMENT '游戏详细数据（JSON格式）',
  `start_time` datetime NOT NULL COMMENT '游戏开始时间',
  `end_time` datetime NOT NULL COMMENT '游戏结束时间',
  `duration` int(11) NOT NULL DEFAULT 0 COMMENT '游戏时长（秒）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_winner_id`(`winner_id`) USING BTREE COMMENT '索引：按胜者查询',
  INDEX `idx_loser_id`(`loser_id`) USING BTREE COMMENT '索引：按败者查询',
  INDEX `idx_game_type`(`game_type`) USING BTREE COMMENT '索引：按游戏类型查询',
  INDEX `idx_create_time`(`create_time`) USING BTREE COMMENT '索引：按创建时间排序',
  INDEX `idx_winner_loser`(`winner_id`, `loser_id`) USING BTREE COMMENT '联合索引：查询两人对战记录'
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '比赛记录表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_match_record
-- ----------------------------

-- ----------------------------
-- Table structure for mok_moment
-- ----------------------------
DROP TABLE IF EXISTS `mok_moment`;
CREATE TABLE `mok_moment`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '动态ID',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发布者ID',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '位置',
  `visibility` tinyint(1) NOT NULL DEFAULT 1 COMMENT '可见性：1-公开 2-好友 3-私密',
  `like_count` int(11) NOT NULL DEFAULT 0 COMMENT '点赞数',
  `comment_count` int(11) NOT NULL DEFAULT 0 COMMENT '评论数',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：1-正常 0-删除',
  `publish_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_publish_time`(`publish_time`) USING BTREE,
  INDEX `idx_user_status_time`(`user_id`, `status`, `publish_time`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '朋友圈动态表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_moment
-- ----------------------------

-- ----------------------------
-- Table structure for mok_moment_interact
-- ----------------------------
DROP TABLE IF EXISTS `mok_moment_interact`;
CREATE TABLE `mok_moment_interact`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `moment_id` bigint(20) NOT NULL COMMENT '动态ID',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作用户ID',
  `type` tinyint(1) NOT NULL COMMENT '类型：1-点赞 2-评论',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `reply_to` bigint(20) NULL DEFAULT NULL COMMENT '回复的评论ID（type=2时有效，支持二级回复）',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：1-正常 0-删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `like_unique` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`type` = 1) then concat(`moment_id`,'-',`user_id`) else NULL end)) STORED NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_unique_like`(`like_unique`) USING BTREE,
  INDEX `idx_moment_id`(`moment_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE,
  INDEX `idx_type_time`(`type`, `create_time`) USING BTREE,
  INDEX `idx_moment_user_type`(`moment_id`, `user_id`, `type`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '朋友圈互动表（点赞+评论）' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_moment_interact
-- ----------------------------

-- ----------------------------
-- Table structure for mok_offline_message
-- ----------------------------
DROP TABLE IF EXISTS `mok_offline_message`;
CREATE TABLE `mok_offline_message`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收者用户ID',
  `sender_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者用户ID',
  `conversation_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话ID（私聊: user_id_friend_id，群聊: group_xxx）',
  `message_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息唯一ID',
  `message_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text' COMMENT '消息类型: text/image/file/audio/video/system',
  `content` json NOT NULL COMMENT '消息内容（JSON格式，支持富文本/链式哈希等）',
  `is_group` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否群消息: 0-私聊 1-群聊',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统消息',
  `is_scheduled` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否定时消息',
  `schedule_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '关联的定时消息ID（如果是定时消息）',
  `send_time` bigint(20) NOT NULL COMMENT '消息发送时间戳（毫秒）',
  `lock_data` json NULL COMMENT '消息锁数据（chain_hash/chain_prev_hash等）',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-待发送 2-已发送 3-已撤回',
  `sent_time` bigint(20) NULL DEFAULT NULL COMMENT '实际发送时间戳（用户上线时）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_message_id`(`message_id`) USING BTREE,
  INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '按接收者查询离线消息',
  INDEX `idx_sender_id`(`sender_id`) USING BTREE COMMENT '按发送者查询',
  INDEX `idx_conversation`(`conversation_id`) USING BTREE COMMENT '按会话查询',
  INDEX `idx_status_sendtime`(`status`, `send_time`) USING BTREE COMMENT '按状态+时间查询待发送消息',
  INDEX `idx_user_status`(`user_id`, `status`) USING BTREE COMMENT '按用户+状态查询',
  INDEX `idx_schedule_id`(`schedule_id`) USING BTREE COMMENT '按定时任务ID查询'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '离线消息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_offline_message
-- ----------------------------

-- ----------------------------
-- Table structure for mok_redpacket
-- ----------------------------
DROP TABLE IF EXISTS `mok_redpacket`;
CREATE TABLE `mok_redpacket`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '红包ID，自增主键',
  `packet_no` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '红包唯一编号（用于领取时查询，如 RP20260705001）',
  `sender_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者用户ID，关联mok_user.id',
  `group_id` bigint(20) NOT NULL COMMENT '所属群ID，关联mok_group_chat.id',
  `total_amount` int(11) NOT NULL COMMENT '红包总金额（单位：G币）',
  `total_count` int(11) NOT NULL COMMENT '红包总个数',
  `remain_amount` int(11) NOT NULL COMMENT '剩余金额（单位：G币）',
  `remain_count` int(11) NOT NULL COMMENT '剩余个数',
  `blessing` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '恭喜发财，大吉大利' COMMENT '祝福语',
  `type` tinyint(1) NOT NULL DEFAULT 1 COMMENT '红包类型：1-拼手气（随机金额） 2-平均红包',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '红包状态：1-有效 2-已抢完 3-已过期 4-已退款',
  `expire_time` datetime NOT NULL COMMENT '过期时间（默认24小时后）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_packet_no`(`packet_no`) USING BTREE COMMENT '唯一索引：红包编号',
  INDEX `idx_sender_id`(`sender_id`) USING BTREE COMMENT '索引：按发送者查询',
  INDEX `idx_group_id`(`group_id`) USING BTREE COMMENT '索引：按群ID查询红包',
  INDEX `idx_status`(`status`) USING BTREE COMMENT '索引：按状态筛选',
  INDEX `idx_expire_time`(`expire_time`, `status`) USING BTREE COMMENT '索引：查询过期红包',
  INDEX `idx_create_time`(`create_time`) USING BTREE COMMENT '索引：按创建时间排序',
  INDEX `idx_group_status`(`group_id`, `status`) USING BTREE COMMENT '联合索引：查询指定群的有效红包',
  CONSTRAINT `fk_redpacket_group` FOREIGN KEY (`group_id`) REFERENCES `mok_group_chat` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_redpacket_sender` FOREIGN KEY (`sender_id`) REFERENCES `mok_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '群红包主表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_redpacket
-- ----------------------------

-- ----------------------------
-- Table structure for mok_redpacket_record
-- ----------------------------
DROP TABLE IF EXISTS `mok_redpacket_record`;
CREATE TABLE `mok_redpacket_record`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '记录ID，自增主键',
  `packet_id` bigint(20) NOT NULL COMMENT '红包ID，关联mok_redpacket.id',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领取者用户ID，关联mok_user.id',
  `amount` int(11) NOT NULL COMMENT '领取金额（单位：G币）',
  `is_luckiest` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为手气最佳：0-否 1-是',
  `receive_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_packet_user`(`packet_id`, `user_id`) USING BTREE COMMENT '唯一索引：一个用户对一个红包只能领取一次',
  INDEX `idx_packet_id`(`packet_id`) USING BTREE COMMENT '索引：按红包ID查询领取记录',
  INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '索引：按用户查询领取记录',
  INDEX `idx_receive_time`(`receive_time`) USING BTREE COMMENT '索引：按领取时间排序',
  CONSTRAINT `fk_record_packet` FOREIGN KEY (`packet_id`) REFERENCES `mok_redpacket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_record_user` FOREIGN KEY (`user_id`) REFERENCES `mok_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '红包领取记录表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_redpacket_record
-- ----------------------------

-- ----------------------------
-- Table structure for mok_scheduled_message
-- ----------------------------
DROP TABLE IF EXISTS `mok_scheduled_message`;
CREATE TABLE `mok_scheduled_message`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `schedule_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '定时消息唯一ID（格式: sched_时间戳_随机串）',
  `sender_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者用户ID',
  `receiver_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '私聊接收者ID（群聊时为NULL）',
  `conversation_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话ID（私聊: user_id_friend_id，群聊: group_xxx）',
  `message_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text' COMMENT '消息类型',
  `content` json NOT NULL COMMENT '消息内容（JSON格式）',
  `schedule_time` bigint(20) NOT NULL COMMENT '计划发送时间戳（毫秒）',
  `repeat_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '重复类型: none-不重复 daily-每天 weekly-每周 monthly-每月',
  `repeat_days` json NULL COMMENT '重复的星期几（weekly模式）: [1,3,5] 表示周一三五',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态: 1-待发送 2-已完成 3-已取消 4-已失败',
  `is_group` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否群消息: 0-私聊 1-群聊',
  `sender_name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '发送者昵称（快照，防止改名后显示异常）',
  `send_count` int(11) NOT NULL DEFAULT 0 COMMENT '已发送次数（重复消息累计）',
  `last_sent_time` bigint(20) NULL DEFAULT NULL COMMENT '最后一次发送时间戳',
  `error_msg` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '失败原因（status=4时记录）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_schedule_id`(`schedule_id`) USING BTREE,
  INDEX `idx_sender_id`(`sender_id`) USING BTREE COMMENT '按发送者查询定时消息',
  INDEX `idx_receiver_id`(`receiver_id`) USING BTREE COMMENT '按接收者查询',
  INDEX `idx_conversation`(`conversation_id`) USING BTREE COMMENT '按会话查询',
  INDEX `idx_status_time`(`status`, `schedule_time`) USING BTREE COMMENT '按状态+计划时间查询待执行任务',
  INDEX `idx_sender_status`(`sender_id`, `status`) USING BTREE COMMENT '按用户+状态查询',
  INDEX `idx_repeat_type`(`repeat_type`) USING BTREE COMMENT '按重复类型查询'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '定时消息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mok_scheduled_message
-- ----------------------------

-- ----------------------------
-- Table structure for mok_smallworld_timeline
-- ----------------------------
DROP TABLE IF EXISTS `mok_smallworld_timeline`;
CREATE TABLE `mok_smallworld_timeline`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID（谁触发的）',
  `target_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '对方用户ID',
  `event_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件类型：friend_add/msg_milestone/music_share/tree_hole',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件标题',
  `description` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '事件描述',
  `icon` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '✨' COMMENT '事件图标',
  `event_date` date NOT NULL COMMENT '事件发生日期',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_pair`(`user_id`, `target_id`) USING BTREE COMMENT '索引：查询两人的时间线',
  INDEX `idx_event_date`(`event_date`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '小世界-时间线（双向）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_smallworld_timeline
-- ----------------------------

-- ----------------------------
-- Table structure for mok_smallworld_treehole
-- ----------------------------
DROP TABLE IF EXISTS `mok_smallworld_treehole`;
CREATE TABLE `mok_smallworld_treehole`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '留言用户ID',
  `target_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '对方用户ID（留言对象的ID）',
  `content` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '留言内容',
  `mood_icon` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT '?' COMMENT '心情图标',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '留言时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_pair`(`user_id`, `target_id`) USING BTREE COMMENT '索引：查询两人的树洞留言',
  INDEX `idx_create_time`(`create_time`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '小世界-树洞留言（双向）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_smallworld_treehole
-- ----------------------------

-- ----------------------------
-- Table structure for mok_user
-- ----------------------------
DROP TABLE IF EXISTS `mok_user`;
CREATE TABLE `mok_user`  (
  `id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '账号ID',
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '用户名',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '密码',
  `tximg` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '头像',
  `uname` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '昵称',
  `sayed` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '签名',
  `qddate` datetime NULL DEFAULT NULL COMMENT '签到时间',
  `bdmail` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '绑定邮箱',
  `credit` int(11) NOT NULL DEFAULT 0 COMMENT '信誉分',
  `spkcin` int(11) NOT NULL DEFAULT 0 COMMENT '货币',
  `regtime` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `isban` int(1) NULL DEFAULT NULL COMMENT '状态\r\n0正常\r\n1封禁\r\n2注销',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_username`(`username`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_user
-- ----------------------------

-- ----------------------------
-- Table structure for mok_user_setting
-- ----------------------------
DROP TABLE IF EXISTS `mok_user_setting`;
CREATE TABLE `mok_user_setting`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `setting_json` json NOT NULL COMMENT '用户个性化配置（JSON格式）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '配置创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '配置最后更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '唯一索引：一个用户仅一条配置记录'
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户个性数据设置表（JSON存储）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_user_setting
-- ----------------------------

-- ----------------------------
-- Table structure for mok_user_traffic
-- ----------------------------
DROP TABLE IF EXISTS `mok_user_traffic`;
CREATE TABLE `mok_user_traffic`  (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID，关联mok_user.id',
  `period_date` date NOT NULL COMMENT '统计周期日期（按月统计：2026-07-01 代表7月）',
  `upload_bytes` bigint(20) NOT NULL DEFAULT 0 COMMENT '上传流量（字节）',
  `download_bytes` bigint(20) NOT NULL DEFAULT 0 COMMENT '下载流量（字节）',
  `upload_count` int(11) NOT NULL DEFAULT 0 COMMENT '上传次数',
  `download_count` int(11) NOT NULL DEFAULT 0 COMMENT '下载次数',
  `file_count` int(11) NOT NULL DEFAULT 0 COMMENT '当前存储文件数',
  `total_used_bytes` bigint(20) NOT NULL DEFAULT 0 COMMENT '当前存储总大小（字节）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_user_period`(`user_id`, `period_date`) USING BTREE COMMENT '唯一索引：每个用户每月一条记录',
  INDEX `idx_period_date`(`period_date`) USING BTREE COMMENT '索引：按周期查询',
  INDEX `idx_user_id`(`user_id`) USING BTREE COMMENT '索引：按用户查询'
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户流量统计表 - 按月度统计' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mok_user_traffic
-- ----------------------------



SET FOREIGN_KEY_CHECKS = 1;
