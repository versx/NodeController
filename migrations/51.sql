CREATE TABLE IF NOT EXISTS `device_group` (
  `name` varchar(30) UNIQUE NOT NULL,
  `instance_name` varchar(30) NOT NULL,
  PRIMARY KEY (`name`)
);

