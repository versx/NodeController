-- MariaDB dump 10.17  Distrib 10.4.10-MariaDB, for debian-linux-gnu (x86_64)
--
-- ------------------------------------------------------
-- Server version	10.4.10-MariaDB-1:10.4.10+maria~bionic

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account` (
  `username` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_warning_timestamp` int(11) unsigned DEFAULT NULL,
  `failed_timestamp` int(11) unsigned DEFAULT NULL,
  `failed` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `last_encounter_lat` double(18,14) DEFAULT NULL,
  `last_encounter_lon` double(18,14) DEFAULT NULL,
  `last_encounter_time` int(11) unsigned DEFAULT NULL,
  `spins` smallint(6) unsigned NOT NULL DEFAULT 0,
  `tutorial` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `ptcToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_uuid` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_instance` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creation_timestamp_ms` int(11) unsigned DEFAULT NULL,
  `warn` tinyint(1) unsigned DEFAULT NULL,
  `warn_expire_ms` int(11) unsigned DEFAULT NULL,
  `warn_message_acknowledged` tinyint(1) unsigned DEFAULT NULL,
  `suspended_message_acknowledged` tinyint(1) unsigned DEFAULT NULL,
  `was_suspended` tinyint(1) unsigned DEFAULT NULL,
  `banned` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `accounts_dashboard`
--

DROP TABLE IF EXISTS `accounts_dashboard`;
/*!50001 DROP VIEW IF EXISTS `accounts_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `accounts_dashboard` (
  `username` tinyint NOT NULL,
  `level` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `assignment`
--

DROP TABLE IF EXISTS `assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assignment` (
  `device_uuid` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time` mediumint(6) unsigned NOT NULL,
  `enabled` tinyint(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`device_uuid`,`instance_name`,`time`),
  KEY `assignment_fk_instance_name` (`instance_name`),
  CONSTRAINT `assignment_fk_device_uuid` FOREIGN KEY (`device_uuid`) REFERENCES `device` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `assignment_fk_instance_name` FOREIGN KEY (`instance_name`) REFERENCES `instance` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `device`
--

DROP TABLE IF EXISTS `device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `device` (
  `uuid` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_host` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_seen` int(11) unsigned NOT NULL DEFAULT 0,
  `account_username` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_group` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_lat` double DEFAULT 0,
  `last_lon` double DEFAULT 0,
  `device_level` tinyint(3) unsigned DEFAULT 0,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uk_iaccount_username` (`account_username`),
  KEY `fk_instance_name` (`instance_name`),
  CONSTRAINT `fk_account_username` FOREIGN KEY (`account_username`) REFERENCES `account` (`username`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_instance_name` FOREIGN KEY (`instance_name`) REFERENCES `instance` (`name`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER updateDeviceManagerTable AFTER UPDATE ON device FOR EACH ROW BEGIN UPDATE DeviceManagerDevices SET uuid = NEW.uuid , last_seen = NEW.last_seen , instance_name = NEW.instance_name , account_username = NEW.account_username

WHERE uuid = NEW.uuid;    
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `device_group`
--

DROP TABLE IF EXISTS `device_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `device_group` (
  `name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gym`
--

DROP TABLE IF EXISTS `gym`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gym` (
  `id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `gym_inserted` AFTER INSERT ON `gym` FOR EACH ROW BEGIN
  IF (NEW.raid_pokemon_id IS NOT NULL AND NEW.raid_pokemon_id != 0) THEN
    INSERT INTO raid_stats (pokemon_id, level, count, date)
    VALUES
      (NEW.raid_pokemon_id, NEW.raid_level, 1, DATE(FROM_UNIXTIME(NEW.raid_end_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER `gym_updated` BEFORE UPDATE ON `gym` FOR EACH ROW BEGIN
  IF ((OLD.raid_pokemon_id IS NULL OR OLD.raid_pokemon_id = 0) AND (NEW.raid_pokemon_id IS NOT NULL AND NEW.raid_pokemon_id != 0)) THEN
    INSERT INTO raid_stats (pokemon_id, level, count, date)
    VALUES
      (NEW.raid_pokemon_id, NEW.raid_level, 1, DATE(FROM_UNIXTIME(NEW.raid_end_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `instance`
--

DROP TABLE IF EXISTS `instance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `instance` (
  `name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('circle_pokemon','circle_raid','circle_smart_raid','auto_quest','pokemon_iv','gather_token','leveling') COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invasion_stats`
--

DROP TABLE IF EXISTS `invasion_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invasion_stats` (
  `date` date NOT NULL,
  `grunt_type` smallint(5) unsigned NOT NULL DEFAULT 0,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`grunt_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metadata`
--

DROP TABLE IF EXISTS `metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metadata` (
  `key` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pokemon`
--

DROP TABLE IF EXISTS `pokemon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pokemon` (
  `id` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pokestop_id` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `username` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER pokemon_inserted
BEFORE INSERT ON pokemon
FOR EACH ROW BEGIN
  INSERT INTO pokemon_stats (pokemon_id, count, date)
  VALUES
    (NEW.pokemon_id, 1, DATE(FROM_UNIXTIME(NEW.expire_timestamp)))
  ON DUPLICATE KEY UPDATE
    count = count + 1;
  IF (NEW.iv IS NOT NULL) THEN BEGIN
      INSERT INTO pokemon_iv_stats (pokemon_id, count, date)
      VALUES
        (NEW.pokemon_id, 1, DATE(FROM_UNIXTIME(NEW.expire_timestamp)))
      ON DUPLICATE KEY UPDATE
        count = count + 1;
      END;
  END IF;
  IF (NEW.shiny = 1) THEN BEGIN
      INSERT INTO pokemon_shiny_stats (pokemon_id, count, date)
      VALUES
        (NEW.pokemon_id, 1, DATE(FROM_UNIXTIME(NEW.expire_timestamp)))
      ON DUPLICATE KEY UPDATE
        count = count + 1;
      END;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER pokemon_updated
BEFORE UPDATE ON pokemon
FOR EACH ROW BEGIN
  IF (NEW.iv IS NOT NULL AND OLD.iv IS NULL) THEN BEGIN
      INSERT INTO pokemon_iv_stats (pokemon_id, count, date)
        VALUES
      (NEW.pokemon_id, 1, DATE(FROM_UNIXTIME(NEW.expire_timestamp)))
        ON DUPLICATE KEY UPDATE
      count = count + 1;
      END;
  END IF;
  IF (NEW.shiny = 1 AND (OLD.shiny = 0 OR OLD.shiny IS NULL)) THEN BEGIN
      INSERT INTO pokemon_shiny_stats (pokemon_id, count, date)
      VALUES
        (NEW.pokemon_id, 1, DATE(FROM_UNIXTIME(NEW.expire_timestamp)))
      ON DUPLICATE KEY UPDATE
        count = count + 1;
      END;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `pokemon_iv_stats`
--

DROP TABLE IF EXISTS `pokemon_iv_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pokemon_iv_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pokemon_shiny_stats`
--

DROP TABLE IF EXISTS `pokemon_shiny_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pokemon_shiny_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pokemon_stats`
--

DROP TABLE IF EXISTS `pokemon_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pokemon_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pokestop`
--

DROP TABLE IF EXISTS `pokestop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pokestop` (
  `id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lure_expire_timestamp` int(11) unsigned DEFAULT NULL,
  `last_modified_timestamp` int(11) unsigned DEFAULT NULL,
  `updated` int(11) unsigned NOT NULL,
  `enabled` tinyint(1) unsigned DEFAULT NULL,
  `quest_type` int(11) unsigned DEFAULT NULL,
  `quest_timestamp` int(11) unsigned DEFAULT NULL,
  `quest_target` smallint(6) unsigned DEFAULT NULL,
  `quest_conditions` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quest_rewards` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quest_template` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER pokestop_inserted
AFTER INSERT ON pokestop
FOR EACH ROW BEGIN
  IF (NEW.quest_type IS NOT NULL AND NEW.quest_type != 0) THEN
    INSERT INTO quest_stats (reward_type, pokemon_id, item_id, count, date)
    VALUES
      (NEW.quest_reward_type, IFNULL(NEW.quest_pokemon_id, 0), IFNULL(NEW.quest_item_id, 0), 1, DATE(FROM_UNIXTIME(NEW.quest_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
  
  IF (NEW.grunt_type IS NOT NULL AND NEW.grunt_type != 0) THEN
    INSERT INTO invasion_stats (grunt_type, count, date)
    VALUES
      (NEW.grunt_type, 1, DATE(FROM_UNIXTIME(NEW.incident_expire_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`%`*/ /*!50003 TRIGGER pokestop_updated
BEFORE UPDATE ON pokestop
FOR EACH ROW BEGIN
  IF ((OLD.quest_type IS NULL OR OLD.quest_type = 0) AND (NEW.quest_type IS NOT NULL AND NEW.quest_type != 0)) THEN
    INSERT INTO quest_stats (reward_type, pokemon_id, item_id, count, date)
    VALUES
      (NEW.quest_reward_type, IFNULL(NEW.quest_pokemon_id, 0), IFNULL(NEW.quest_item_id, 0), 1, DATE(FROM_UNIXTIME(NEW.quest_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
  
  IF ((OLD.grunt_type IS NULL OR OLD.grunt_type = 0) AND (NEW.grunt_type IS NOT NULL AND NEW.grunt_type != 0)) THEN
    INSERT INTO invasion_stats (grunt_type, count, date)
    VALUES
      (NEW.grunt_type, 1, DATE(FROM_UNIXTIME(NEW.incident_expire_timestamp)))
    ON DUPLICATE KEY UPDATE
      count = count + 1;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `quest_stats`
--

DROP TABLE IF EXISTS `quest_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quest_stats` (
  `date` date NOT NULL,
  `reward_type` smallint(6) unsigned NOT NULL DEFAULT 0,
  `pokemon_id` smallint(6) unsigned NOT NULL DEFAULT 0,
  `item_id` smallint(6) unsigned NOT NULL DEFAULT 0,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`date`,`reward_type`,`pokemon_id`,`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `raid_stats`
--

DROP TABLE IF EXISTS `raid_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `raid_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned NOT NULL,
  `count` int(11) NOT NULL,
  `level` smallint(3) unsigned DEFAULT NULL,
  PRIMARY KEY (`date`,`pokemon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `s2cell`
--

DROP TABLE IF EXISTS `s2cell`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `s2cell` (
  `id` bigint(20) unsigned NOT NULL,
  `level` tinyint(3) unsigned DEFAULT NULL,
  `center_lat` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `center_lon` double(18,14) NOT NULL DEFAULT 0.00000000000000,
  `updated` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`center_lat`,`center_lon`),
  KEY `ix_updated` (`updated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `spawnpoint`
--

DROP TABLE IF EXISTS `spawnpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `spawnpoint` (
  `id` bigint(15) unsigned NOT NULL,
  `lat` double(18,14) NOT NULL,
  `lon` double(18,14) NOT NULL,
  `updated` int(11) unsigned NOT NULL DEFAULT 0,
  `despawn_sec` smallint(6) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_coords` (`lat`,`lon`),
  KEY `ix_updated` (`updated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `token`
--

DROP TABLE IF EXISTS `token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token` (
  `token` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('confirm_email','reset_password') COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expire_timestamp` int(11) unsigned NOT NULL,
  PRIMARY KEY (`token`),
  KEY `fk_tokem_username` (`username`),
  KEY `ix_expire_timestamp` (`expire_timestamp`),
  CONSTRAINT `token_ibfk_1` FOREIGN KEY (`username`) REFERENCES `user` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weather`
--

DROP TABLE IF EXISTS `weather`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `weather` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `accounts_dashboard`
--

/*!50001 DROP TABLE IF EXISTS `accounts_dashboard`*/;
/*!50001 DROP VIEW IF EXISTS `accounts_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `accounts_dashboard` AS select `account`.`username` AS `username`,`account`.`level` AS `level` from `account` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-01-30 18:05:59
