CREATE TABLE IF NOT EXISTS `account` (
  `username` varchar(32) NOT NULL,
  `password` varchar(32) NOT NULL,
  `first_warning_timestamp` int(11) unsigned DEFAULT NULL,
  `failed_timestamp` int(11) unsigned DEFAULT NULL,
  `failed` varchar(32) DEFAULT NULL,
  `level` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `last_encounter_lat` double(18,14) DEFAULT NULL,
  `last_encounter_lon` double(18,14) DEFAULT NULL,
  `last_encounter_time` int(11) unsigned DEFAULT NULL,
  `spins` smallint(6) unsigned NOT NULL DEFAULT 0,
  `tutorial` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `ptcToken` text DEFAULT NULL,
  `last_uuid` varchar(40) DEFAULT NULL,
  `last_instance` varchar(30) DEFAULT NULL,
  `creation_timestamp_ms` int(11) unsigned DEFAULT NULL,
  `warn` tinyint(1) unsigned DEFAULT NULL,
  `warn_expire_ms` int(11) unsigned DEFAULT NULL,
  `warn_message_acknowledged` tinyint(1) unsigned DEFAULT NULL,
  `suspended_message_acknowledged` tinyint(1) unsigned DEFAULT NULL,
  `was_suspended` tinyint(1) unsigned DEFAULT NULL,
  `banned` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`username`)
);

CREATE TABLE IF NOT EXISTS `accounts_dashboard` (
  `username` tinyint NOT NULL,
  `level` tinyint NOT NULL
);

CREATE TABLE IF NOT EXISTS `s2cell` (
  `id` bigint(20) unsigned NOT NULL,
  `level` tinyint(3) unsigned DEFAULT NULL,
  `center_lat` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `center_lon` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `updated` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`center_lat`,`center_lon`),
  KEY `ix_updated` (`updated`)
);

CREATE TABLE IF NOT EXISTS `instance` (
  `name` varchar(30) NOT NULL,
  `type` enum('circle_pokemon','circle_raid','circle_smart_raid','auto_quest','pokemon_iv','gather_token','leveling') NOT NULL,
  `data` longtext NOT NULL,
  PRIMARY KEY (`name`)
);

CREATE TABLE IF NOT EXISTS `device` (
  `uuid` varchar(40) NOT NULL,
  `instance_name` varchar(30) DEFAULT NULL,
  `last_host` varchar(30) DEFAULT NULL,
  `last_seen` int(11) unsigned NOT NULL DEFAULT 0,
  `account_username` varchar(32) DEFAULT NULL,
  `device_group` varchar(30) DEFAULT NULL,
  `last_lat` double DEFAULT 0,
  `last_lon` double DEFAULT 0,
  `device_level` tinyint(3) unsigned DEFAULT 0,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uk_iaccount_username` (`account_username`),
  KEY `fk_instance_name` (`instance_name`),
  CONSTRAINT `fk_account_username` FOREIGN KEY (`account_username`) REFERENCES `account` (`username`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_instance_name` FOREIGN KEY (`instance_name`) REFERENCES `instance` (`name`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `assignment` (
  `device_uuid` varchar(40) NOT NULL,
  `instance_name` varchar(30) NOT NULL,
  `time` mediumint(6) unsigned NOT NULL,
  `enabled` tinyint(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`device_uuid`,`instance_name`,`time`),
  KEY `assignment_fk_instance_name` (`instance_name`),
  CONSTRAINT `assignment_fk_device_uuid` FOREIGN KEY (`device_uuid`) REFERENCES `device` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `assignment_fk_instance_name` FOREIGN KEY (`instance_name`) REFERENCES `instance` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `device_group` (
  `name` varchar(30) NOT NULL,
  `instance_name` varchar(30) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
);

CREATE TABLE IF NOT EXISTS `spawnpoint` (
  `id` bigint(15) unsigned NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `updated` int(11) unsigned NOT NULL DEFAULT 0,
  `despawn_sec` smallint(6) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`lat`,`lon`),
  KEY `ix_updated` (`updated`)
);

CREATE TABLE IF NOT EXISTS `gym` (
  `id` varchar(35) NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `name` varchar(128) DEFAULT NULL,
  `url` varchar(200) DEFAULT NULL,
  `last_modified_timestamp` int(11) unsigned DEFAULT NULL,
  `raid_end_timestamp` int(11) unsigned DEFAULT NULL,
  `raid_spawn_timestamp` int(11) unsigned DEFAULT NULL,
  `raid_battle_timestamp` int(11) unsigned DEFAULT NULL,
  `updated` int(11) unsigned NOT NULL,
  `raid_pokemon_id` smallint(6) unsigned DEFAULT NULL,
  `guarding_pokemon_id` smallint(6) unsigned DEFAULT NULL,
  `availble_slots` smallint(6) unsigned DEFAULT NULL,
  `team_id` tinyint(3) unsigned DEFAULT NULL,
  `raid_level` tinyint(3) unsigned DEFAULT NULL,
  `enabled` tinyint(1) unsigned DEFAULT NULL,
  `ex_raid_eligible` tinyint(1) unsigned DEFAULT NULL,
  `in_battle` tinyint(1) unsigned DEFAULT NULL,
  `raid_pokemon_move_1` smallint(6) unsigned DEFAULT NULL,
  `raid_pokemon_move_2` smallint(6) unsigned DEFAULT NULL,
  `raid_pokemon_form` mediumint(5) unsigned DEFAULT NULL,
  `raid_pokemon_cp` mediumint(5) unsigned DEFAULT NULL,
  `raid_is_exclusive` tinyint(1) unsigned DEFAULT NULL,
  `cell_id` bigint(20) unsigned DEFAULT NULL,
  `deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `total_cp` int(11) DEFAULT NULL,
  `first_seen_timestamp` int(11) unsigned NOT NULL,
  `raid_pokemon_gender` tinyint(3) unsigned DEFAULT NULL,
  `sponsor_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`lat`,`lon`),
  KEY `ix_raid_end_timestamp` (`raid_end_timestamp`),
  KEY `ix_updated` (`updated`),
  KEY `ix_raid_pokemon_id` (`raid_pokemon_id`),
  KEY `fk_gym_cell_id` (`cell_id`),
  KEY `ix_gym_deleted` (`deleted`),
  CONSTRAINT `fk_gym_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `invasion_stats` (
  `date` date NOT NULL,
  `grunt_type` smallint(5) unsigned NOT NULL DEFAULT 0,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`grunt_type`)
);

CREATE TABLE IF NOT EXISTS `metadata` (
  `key` varchar(200) NOT NULL,
  `value` text DEFAULT NULL,
  PRIMARY KEY (`key`)
);

CREATE TABLE IF NOT EXISTS `pokemon_iv_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
);

CREATE TABLE IF NOT EXISTS `pokemon_shiny_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
);

CREATE TABLE IF NOT EXISTS `pokemon_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
);

CREATE TABLE IF NOT EXISTS `pokestop` (
  `id` varchar(35) NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `name` varchar(128) DEFAULT NULL,
  `url` varchar(200) DEFAULT NULL,
  `lure_expire_timestamp` int(11) unsigned DEFAULT NULL,
  `last_modified_timestamp` int(11) unsigned DEFAULT NULL,
  `updated` int(11) unsigned NOT NULL,
  `enabled` tinyint(1) unsigned DEFAULT NULL,
  `quest_type` int(11) unsigned DEFAULT NULL,
  `quest_timestamp` int(11) unsigned DEFAULT NULL,
  `quest_target` smallint(6) unsigned DEFAULT NULL,
  `quest_conditions` text DEFAULT NULL,
  `quest_rewards` text DEFAULT NULL,
  `quest_template` varchar(100) DEFAULT NULL,
  `quest_pokemon_id` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,_utf8mb4'$[*].info.pokemon_id'),_utf8mb4'$[0]')) VIRTUAL,
  `quest_reward_type` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,_utf8mb4'$[*].type'),_utf8mb4'$[0]')) VIRTUAL,
  `quest_item_id` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,_utf8mb4'$[*].info.item_id'),_utf8mb4'$[0]')) VIRTUAL,
  `cell_id` bigint(20) unsigned DEFAULT NULL,
  `deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `lure_id` smallint(5) DEFAULT 0,
  `pokestop_display` smallint(5) DEFAULT 0,
  `incident_expire_timestamp` int(11) unsigned DEFAULT NULL,
  `first_seen_timestamp` int(11) unsigned NOT NULL,
  `grunt_type` smallint(5) unsigned DEFAULT 0,
  `sponsor_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`lat`,`lon`),
  KEY `ix_lure_expire_timestamp` (`lure_expire_timestamp`),
  KEY `ix_updated` (`updated`),
  KEY `fk_pokestop_cell_id` (`cell_id`),
  KEY `ix_pokestop_deleted` (`deleted`),
  KEY `ix_quest_pokemon_id` (`quest_pokemon_id`),
  KEY `ix_quest_reward_type` (`quest_reward_type`),
  KEY `ix_quest_item_id` (`quest_item_id`),
  KEY `ix_incident_expire_timestamp` (`incident_expire_timestamp`),
  CONSTRAINT `fk_pokestop_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `pokemon` (
  `id` varchar(25) NOT NULL,
  `pokestop_id` varchar(35) DEFAULT NULL,
  `spawn_id` bigint(15) unsigned DEFAULT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `weight` double(18,14) DEFAULT NULL,
  `size` double(18,14) DEFAULT NULL,
  `expire_timestamp` int(11) unsigned DEFAULT NULL,
  `updated` int(11) unsigned DEFAULT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `move_1` smallint(6) unsigned DEFAULT NULL,
  `move_2` smallint(6) unsigned DEFAULT NULL,
  `gender` tinyint(3) unsigned DEFAULT NULL,
  `cp` smallint(6) unsigned DEFAULT NULL,
  `atk_iv` tinyint(3) unsigned DEFAULT NULL,
  `def_iv` tinyint(3) unsigned DEFAULT NULL,
  `sta_iv` tinyint(3) unsigned DEFAULT NULL,
  `form` smallint(5) unsigned DEFAULT NULL,
  `level` tinyint(3) unsigned DEFAULT NULL,
  `weather` tinyint(3) unsigned DEFAULT NULL,
  `costume` tinyint(3) unsigned DEFAULT NULL,
  `first_seen_timestamp` int(11) unsigned NOT NULL,
  `changed` int(11) unsigned NOT NULL DEFAULT 0,
  `iv` float(5,2) unsigned GENERATED ALWAYS AS ((`atk_iv` + `def_iv` + `sta_iv`) * 100 / 45) VIRTUAL,
  `cell_id` bigint(20) unsigned DEFAULT NULL,
  `expire_timestamp_verified` tinyint(1) unsigned NOT NULL,
  `shiny` tinyint(1) DEFAULT 0,
  `username` varchar(15) DEFAULT NULL,
  `is_ditto` tinyint(3) unsigned DEFAULT 0,
  `display_pokemon_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`lat`,`lon`),
  KEY `ix_pokemon_id` (`pokemon_id`),
  KEY `ix_updated` (`updated`),
  KEY `fk_spawn_id` (`spawn_id`),
  KEY `fk_pokestop_id` (`pokestop_id`),
  KEY `ix_atk_iv` (`atk_iv`),
  KEY `ix_def_iv` (`def_iv`),
  KEY `ix_sta_iv` (`sta_iv`),
  KEY `ix_changed` (`changed`),
  KEY `ix_level` (`level`),
  KEY `fk_pokemon_cell_id` (`cell_id`),
  KEY `ix_expire_timestamp` (`expire_timestamp`),
  KEY `ix_iv` (`iv`),
  CONSTRAINT `fk_pokemon_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pokestop_id` FOREIGN KEY (`pokestop_id`) REFERENCES `pokestop` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_spawn_id` FOREIGN KEY (`spawn_id`) REFERENCES `spawnpoint` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `quest_stats` (
  `date` date NOT NULL,
  `reward_type` smallint(6) unsigned NOT NULL DEFAULT 0,
  `pokemon_id` smallint(6) unsigned NOT NULL DEFAULT 0,
  `item_id` smallint(6) unsigned NOT NULL DEFAULT 0,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`reward_type`,`pokemon_id`,`item_id`)
);

CREATE TABLE IF NOT EXISTS `raid_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  `level` smallint(3) unsigned DEFAULT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
);

CREATE TABLE IF NOT EXISTS `weather` (
  `id` bigint(30) NOT NULL,
  `level` tinyint(2) unsigned DEFAULT NULL,
  `latitude` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `longitude` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `gameplay_condition` tinyint(3) unsigned DEFAULT NULL,
  `wind_direction` mediumint(8) DEFAULT NULL,
  `cloud_level` tinyint(3) unsigned DEFAULT NULL,
  `rain_level` tinyint(3) unsigned DEFAULT NULL,
  `wind_level` tinyint(3) unsigned DEFAULT NULL,
  `snow_level` tinyint(3) unsigned DEFAULT NULL,
  `fog_level` tinyint(3) unsigned DEFAULT NULL,
  `special_effect_level` tinyint(3) unsigned DEFAULT NULL,
  `severity` tinyint(3) unsigned DEFAULT NULL,
  `warn_weather` tinyint(3) unsigned DEFAULT NULL,
  `updated` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`)
);