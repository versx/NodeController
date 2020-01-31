ALTER TABLE account
ADD COLUMN `last_uuid` varchar(40) DEFAULT NULL,
ADD COLUMN `last_instance` varchar(30) DEFAULT NULL,
DROP COLUMN creation_timestamp_ms,
DROP COLUMN warn,
DROP COLUMN warn_expire_ms,
DROP COLUMN warn_message_acknowledged,
DROP COLUMN suspended_message_acknowledged,
DROP COLUMN was_suspended,
DROP COLUMN banned;
