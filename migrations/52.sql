ALTER TABLE `pokemon`
ADD COLUMN `display_pokemon_id` smallint unsigned;

ALTER TABLE `gym`
ADD COLUMN `raid_pokemon_gender` tinyint unsigned;
