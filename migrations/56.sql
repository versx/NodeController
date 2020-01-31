ALTER TABLE account
ADD COLUMN `tutorial` tinyint(3) unsigned NOT NULL DEFAULT 0;
ALTER TABLE `account`
ADD COLUMN `ptcToken` text;
ALTER TABLE instance
MODIFY `type` enum('circle_pokemon','circle_raid','circle_smart_raid','auto_quest','pokemon_iv','gather_token', 'leveling') NOT NULL;
