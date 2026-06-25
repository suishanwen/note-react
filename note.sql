-- note 笔记表（单表设计），字符集统一 utf8mb4 以支持 emoji
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `note` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent` int(11) DEFAULT -1 COMMENT '父级 id，预留层级，默认 -1',
  `content` mediumtext COLLATE utf8mb4_unicode_ci COMMENT 'Markdown 正文',
  `edit_time` datetime DEFAULT NULL COMMENT '最后编辑时间',
  `post_time` datetime DEFAULT NULL COMMENT '发布时间',
  `poster` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标题',
  `ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发布者 IP',
  `tag` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签，| 分隔',
  `recommend` int(11) DEFAULT 0 COMMENT '是否置顶：0 否 1 是',
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '摘要',
  PRIMARY KEY (`id`),
  KEY `idx_post_time` (`post_time`),
  KEY `idx_edit_time` (`edit_time`),
  KEY `idx_recommend` (`recommend`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
