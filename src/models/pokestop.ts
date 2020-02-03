"use strict"

import { DbController } from '../controllers/db-controller';
import { WebhookController } from '../controllers/webhook-controller';
import { Database } from '../data/mysql';
import { Instance } from './instance';
import { getCurrentTimestamp, flattenCoords } from '../utils/util';
//import { winston } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

enum QuestReward {
    Unset = 0,
    Experience, // = 1
    Item, // = 2
    Stardust, // = 3
    Candy, // = 4
    AvatarClothing, // = 5
    Quest, // = 6
    PokemonEncounter, // = 7
}

enum ConditionType {
    Unset  = 0,
    PokemonType, // = 1
    PokemonCategory, // = 2
    WeatherBoost, // = 3
    DailyCaptureBonus, // = 4
    DailySpinBonus, // = 5
    WinRaidStatus, // = 6
    RaidLevel, // = 7
    ThrowType, // = 8
    WinGymBattleStatus, // = 9
    SuperEffectiveCharge, // = 10
    Item, // = 11
    UniquePokestop, // = 12
    QuestContext, // = 13
    ThrowTypeInARow, // = 14
    CurveBall, // = 15
    BadgeType, // = 16
    PlayerLevel, // = 17
    WinBattleStatus, // = 18
    NewFriend, // = 19
    DaysInARow, // = 20
    UniquePokemon, // = 21
    NpcCombat, // = 22
    PvpCombat, // = 23
    Location, // = 24
    Distance, // = 25
    PokemonAlignment, // = 26
    InvasionCharacter, // = 27
    Buddy, // = 28
    BuddyInterestingPoi, // = 29
    DailyBuddyAffection // = 30
}

/**
 * Pokestop model class.
 */
class Pokestop {
    static Pokestops = {};
    static LureTime = 1800;

    id: string;
    lat: number;
    lon: number;
    name: string;
    url: string;
    enabled: boolean;
    lastModifiedTimestamp: number;
    lureId: number;
    lureExpireTimestamp: number;
    incidentExpireTimestamp: number;
    pokestopDisplay: number;
    gruntType: number;
    questType: number;
    questTarget: number;
    questTimestamp: number;
    questConditions: any;
    questRewards: any;
    questTemplate: string;
    updated: number;
    sponsorId: number;
    cellId: string;

    /**
     * Initialize new Pokestop object.
     * @param data 
     */
    constructor(data: any) {
        if (data.fort !== undefined) {
            this.id = data.fort.id;
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            if (data.fort.sponsor !== 0) {
                this.sponsorId = data.fort.sponsor;
            }
            this.enabled = data.fort.enabled;
            var lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            if (data.fort.active_fort_modifier !== undefined && data.fort.active_fort_modifier !== null && data.fort.active_fort_modifier.length > 0) {
                if (data.fort.active_fort_modifier.includes(501) ||
                    data.fort.active_fort_modifier.includes(502) ||
                    data.fort.active_fort_modifier.includes(503) ||
                    data.fort.active_fort_modifier.includes(504)) {
                    this.lureExpireTimestamp = lastModifiedTimestamp + DbController.LureTime;
                    this.lureId = data.fort.active_fort_modifier[0].item_id;
                }
            }
            this.lastModifiedTimestamp = lastModifiedTimestamp;
            if (data.fort.image_url !== null) {
                this.url = data.fort.image_url;
            }
            if (data.fort.pokestop_display !== undefined && data.fort.pokestop_display !== null) {
                this.incidentExpireTimestamp = data.fort.pokestop_display.incident_expiration_ms / 1000;
                if (data.fort.pokestop_display.character_display !== undefined && data.fort.pokestop_display.character_display !== null) {
                    this.pokestopDisplay = data.fort.pokestop_display.character_display.style;
                    this.gruntType = data.fort.pokestop_display.character_display.character;
                }
            } else if (data.fort.pokestop_displays !== undefined && data.fort.pokestop_displays.length > 0) {
                this.incidentExpireTimestamp = data.fort.pokestop_displays[0].incident_expiration_ms / 1000;
                if (data.fort.pokestop_displays[0].character_display !== undefined && data.fort.pokestop_displays[0].character_display !== null) {
                    this.pokestopDisplay = data.fort.pokestop_displays[0].character_display.style;
                    this.gruntType = data.fort.pokestop_displays[0].character_display.character;
                }
            }
            this.cellId = data.cellId.toString();
        } else {
            this.id = data.id.toString();
            this.lat = data.lat;
            this.lon = data.lon;
            this.name = data.name;
            this.url = data.url;
            this.enabled = data.enabled;
            this.lureExpireTimestamp = data.lure_expire_timestamp;
            this.lastModifiedTimestamp = data.last_modified_timestamp;
            this.updated = data.updated;
            
            this.questType = data.quest_type;
            this.questTarget = data.quest_target;
            this.questTimestamp = data.quest_timestamp;
            this.questConditions = data.quest_conditions;
            this.questRewards = data.quest_rewards;
            this.questTemplate = data.quest_template;
    
            this.cellId = data.cell_id.toString();
            this.lureId = data.lure_id;
            this.pokestopDisplay = data.pokestop_display;
            this.incidentExpireTimestamp = data.incident_expire_timestamp;
            this.gruntType = data.grunt_type;
            this.sponsorId = data.sponsor_id;
        }
    }
    /**
     * Get all Pokestops within a minimum and maximum latitude and longitude.
     * @param minLat 
     * @param maxLat 
     * @param minLon 
     * @param maxLon 
     * @param updated 
     */
    static async getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number): Promise<Pokestop[]> {
        let sql = `
        SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated, quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR), CAST(quest_rewards AS CHAR), quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id
        FROM pokestop
        WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ? AND updated > ? AND deleted = false
        `;
        let args = [minLat, maxLat, minLon, maxLon, updated];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error:", x);
            });
        console.log("[Pokestop] GetAll:", result)
        let pokestops: Pokestop[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let pokestop = new Pokestop({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                enabled: key.enabled,
                lure_expire_timestamp: key.lure_expire_timestamp,
                last_modified_timestamp: key.last_modified_timestamp,
                updated: key.updated,
                quest_type: key.quest_type,
                quest_timestamp: key.quest_timestamp,
                quest_target: key.quest_target,
                quest_conditions: key.quest_conditions,
                quest_rewards: key.quest_rewards,
                quest_template: key.quest_template,
                cell_id: key.cell_id,
                lure_id: key.lure_id,
                pokestop_display: key.pokestop_display,
                incident_expire_timestamp: key.incident_expire_timestamp,
                grunt_type: key.grunt_type,
                sponsor_id: key.sponsor_id
            });
            pokestops.push(pokestop);
        });
        return pokestops;
    }
    /**
     * Get pokestop by pokestop id.
     * @param pokestopId 
     * @param withDeleted 
     */
    static async getById(pokestopId: string, withDeleted: boolean = false): Promise<Pokestop> {
        let withDeletedSQL: string;
        if (withDeleted) {
            withDeletedSQL = "";
        } else {
            withDeletedSQL = "AND deleted = false";
        }
        let sql = `
        SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated, quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR), CAST(quest_rewards AS CHAR), quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id
        FROM pokestop
        WHERE id = ? ${withDeletedSQL}
        LIMIT 1
        `;
        
        let results = await db.query(sql, pokestopId)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
        let keys = Object.values(results);
        if (keys.length === 0) {
            return null;
        }
        let pokestop: Pokestop;
        keys.forEach(key => {
            pokestop = new Pokestop({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                enabled: key.enabled,
                lure_expire_timestamp: key.lure_expire_timestamp,
                last_modified_timestamp: key.last_modified_timestamp,
                updated: key.updated,
                quest_type: key.quest_type,
                quest_timestamp: key.quest_timestamp,
                quest_target: key.quest_target,
                quest_conditions: key.quest_conditions,
                quest_rewards: key.quest_rewards,
                quest_template: key.quest_template,
                cell_id: key.cell_id,
                lure_id: key.lure_id,
                pokestop_display: key.pokestop_display,
                incident_expire_timestamp: key.incident_expire_timestamp,
                grunt_type: key.grunt_type,
                sponsor_id: key.sponsor_id
            });
            Pokestop.Pokestops[pokestop.id] = pokestop;
        })
        return pokestop;
    }
    /**
     * Get all Pokestops with specific IDs.
     * @param ids 
     */
    static async getInIds(ids: string[]): Promise<Pokestop[]> {
        if (ids.length > 10000) {
            let result: Pokestop[] = [];
            let count = Math.ceil(ids.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let splice = ids.splice(start, end);
                let spliceResult = await this.getInIds(splice);
                spliceResult.forEach(x => result.push(x));
            }
            return result;
        }
        
        if (ids.length === 0) {
            return [];
        }

        let inSQL = "(";
        for (let i = 1; i < ids.length; i++) {
            inSQL += "?, ";
        }
        inSQL += "?)";
        
        let sql = `
            SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated, quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR), CAST(quest_rewards AS CHAR), quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id
            FROM pokestop
            WHERE id IN ${inSQL} AND deleted = false
        `;
        let args = ids;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
       
        let pokestops: Pokestop[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let pokestop = new Pokestop({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                enabled: key.enabled,
                lure_expire_timestamp: key.lure_expire_timestamp,
                last_modified_timestamp: key.last_modified_timestamp,
                updated: key.updated,
                quest_type: key.quest_type,
                quest_timestamp: key.quest_timestamp,
                quest_target: key.quest_target,
                quest_conditions: JSON.parse(key.quest_conditions || {}),
                quest_rewards: JSON.parse(key.quest_rewards || {}),
                quest_template: key.quest_template,
                cell_id: key.cell_id,
                lure_id: key.lure_id,
                pokestop_display: key.pokestop_display,
                incident_expire_timestamp: key.incident_expire_timestamp,
                grunt_type: key.grunt_type,
                sponsor_id: key.sponsor_id
            });
            pokestops.push(pokestop);
            Pokestop.Pokestops[pokestop.id] = pokestop;
        });
        return pokestops;
    }
    /**
     * Clear quests for pokestops by id.
     * @param ids 
     */
    static async clearQuests(ids?: string[]): Promise<void> {
        let whereSQL: String
        if (ids && ids.length > 0) {
            let inSQL = "(";
            for (let i = 0; i < ids.length; i++) {
            //for _ in 1..<ids!.count {
                inSQL += "?, ";
            }
            inSQL += "?)";
            whereSQL = `WHERE id IN ${inSQL}`;
        } else {
            whereSQL = ""
        }
        let sql = `
            UPDATE pokestop
            SET updated = UNIX_TIMESTAMP(), quest_type = NULL, quest_timestamp = NULL, quest_target = NULL, quest_conditions = NULL, quest_rewards = NULL, quest_template = NULL
            ${whereSQL}
        `;
        let result = await db.query(sql, ids)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
        console.log("[Pokestop] ClearQuests:", result);
    }
    /**
     * Clear quests for pokestops by instance.
     * @param instance 
     */
    static async clearQuestsByInstance(instance: Instance): Promise<void> {
        let areaString: string = ""
        let areaType1 = instance.data.area;// as? [[String: Double]]
        let areaType2 = instance.data.area;// as? [[[String: Double]]]
        if (areaType1) {
            // REVIEW: Might need to use Object.keys/values
            areaType1.forEach(coordLine => {
                let lat = coordLine["lat"];
                let lon = coordLine["lon"];
                areaString += `${lat},${lon}\n`;
            });
        } else if (areaType2) {
            // REVIEW: Might need to use Object.keys/values
            areaType2.forEach(geofence => {
                geofence.forEach(coordLine => {
                    let lat = coordLine["lat"];
                    let lon = coordLine["lon"];
                    areaString += `${lat},${lon}\n`;
                })
            })
        }
        let coords = flattenCoords(areaString);
        let sql = `
            UPDATE pokestop
            SET updated = UNIX_TIMESTAMP(), quest_type = NULL, quest_timestamp = NULL, quest_target = NULL, quest_conditions = NULL, quest_rewards = NULL, quest_template = NULL
            WHERE ST_CONTAINS(
                ST_GEOMFROMTEXT('POLYGON((${coords}))'),
                POINT(pokestop.lat, pokestop.lon)
            ) AND quest_type IS NOT NULL
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
        console.log("[Pokestop] ClearQuests:", result);
    }
    /**
     * Add pokestops details.
     * @param fort 
     */
    addDetails(fort: any): void {
        this.id = fort.fortID
        this.lat = fort.latitude
        this.lon = fort.longitude
        if (fort.imageUrls === undefined || fort.imageUrls === null) {
            this.url = fort.imageUrls[0];
        }
        this.name = fort.name;
    }
    /**
     * Add quest proto data to pokestop.
     * @param quest 
     */
    addQuest(quest: any): void {
        this.questType = parseInt(quest.quest_type);
        this.questTarget = parseInt(quest.goal.target);
        this.questTemplate = quest.template_id.toLowerCase();
        
        let conditions = [];
        let rewards = [];
        quest.goal.condition.forEach(condition => {
            let conditionData = {};
            let infoData = {};
            conditionData["type"] = condition.type;
            // TODO: Needs testing
            let info = condition;
            switch (condition.type) {
                case ConditionType.BadgeType:
                    infoData["amount"] = info.badge_type.amount;
                    infoData["badge_rank"] = info.badge_rank;
                    let badgeTypesById: number[] = [];
                    info.badge_type.forEach(badge => {
                        badgeTypesById.push(badge);
                    });
                    infoData["badge_types"] = badgeTypesById;
                    break;
                case ConditionType.Item:
                    if (info.item !== 0) {
                        infoData["item_id"] = info.item;
                    }
                    break;
                case ConditionType.RaidLevel:
                    let raidLevelById: number[] = [];
                    info.raid_level.forEach(raidLevel => {
                        raidLevelById.push(raidLevel);
                    });
                    infoData["raid_levels"] = raidLevelById;
                    break;
                case ConditionType.PokemonType:
                    let pokemonTypesById: number[] = [];
                    info.pokemon_type.forEach(type => {
                        pokemonTypesById.push(type);
                    });
                    infoData["pokemon_type_ids"] = pokemonTypesById;
                    break;
                case ConditionType.PokemonCategory:
                    if (info.pokemon_category.category_name) {
                        infoData["category_name"] = info.pokemon_category.category_name;
                    }
                    break;
                case ConditionType.WinRaidStatus:
                    break;
                case ConditionType.ThrowType:
                    if (info.throw_type !== 0) {
                        infoData["throw_type_id"] = info.throw_type;
                    }
                    break;
                case ConditionType.ThrowTypeInARow:
                    if (info.throw_type !== 0) {
                        infoData["throw_type_id"] = info.throw_type;
                    }
                    break;
                case ConditionType.Location:
                    infoData["cell_ids"] = info.s2_cell_id;
                    break;
                case ConditionType.Distance:
                    infoData["distance"] = info.distance_km;
                    break;
                case ConditionType.PokemonAlignment:
                    infoData["alignment_ids"] = info.pokemon_alignment.alignment.map(x => parseInt(x));
                    break;
                case ConditionType.InvasionCharacter:
                    infoData["character_category_ids"] = info.invasion_character.category.map(x => parseInt(x));
                    break;
                case ConditionType.NpcCombat:
                    infoData["win"] = info.npc_combat.requires_win;
                    infoData["trainer_ids"] = info.npc_combat.combat_npc_trainer_id;
                    break;
                case ConditionType.PvpCombat:
                    infoData["win"] = info.npc_combat.requires_win;
                    infoData["trainer_ids"] = info.pvp_combat.combat_league_template_id;
                    break;
                case ConditionType.Buddy:
                    infoData["min_buddy_level"] = info.buddy.min_buddy_level;
                    infoData["must_be_on_map"] = info.buddy.must_be_on_map;
                    break;
                case ConditionType.DailyBuddyAffection:
                    infoData["min_buddy_affection_earned_today"] = info.daily_buddy_affection.min_buddy_affection_earned_today;
                    break;
                case ConditionType.WinGymBattleStatus: break;
                case ConditionType.SuperEffectiveCharge: break;
                case ConditionType.UniquePokestop: break;
                case ConditionType.QuestContext: break;
                case ConditionType.WinBattleStatus: break;
                case ConditionType.CurveBall: break;
                case ConditionType.NewFriend: break;
                case ConditionType.DaysInARow: break;
                case ConditionType.WeatherBoost: break;
                case ConditionType.DailyCaptureBonus: break;
                case ConditionType.DailySpinBonus: break;
                case ConditionType.UniquePokemon: break;
                case ConditionType.BuddyInterestingPoi: break;
                case ConditionType.Unset: break;
            }
            if (infoData) {
                conditionData["info"] = infoData;
            }
            conditions.push(conditionData);
        });
        quest.questRewards.forEach(reward => {
            let rewardData = {};
            let infoData = {};
            rewardData["type"] = reward.type;
            switch (reward.type) {
                case QuestReward.AvatarClothing:
                    break;
                case QuestReward.Candy:
                    infoData["amount"] = reward.amount;
                    infoData["pokemon_id"] = reward.pokemon_id;
                    break;
                case QuestReward.Experience:
                    infoData["amount"] = reward.exp;
                    break;
                case QuestReward.Item:
                    infoData["amount"] = reward.amount;
                    infoData["item_id"] = reward.item; //item_id?
                    break;
                case QuestReward.PokemonEncounter:
                    if (reward.pokemon_encounter.is_hidden_ditto) {
                        infoData["pokemon_id"] = 132;
                        infoData["pokemon_id_display"] = reward.pokemon_encounter.pokemon_id;
                    } else {
                        infoData["pokemon_id"] = reward.pokemon_encounter.pokemon_id;
                    }
                    infoData["costume_id"] = reward.pokemon_encounter.pokemon_display.costume;
                    infoData["form_id"] = reward.pokemon_encounter.pokemon_display.form;
                    infoData["gender_id"] = reward.pokemon_encounter.pokemon_display.gender;
                    infoData["shiny"] = reward.pokemon_encounter.pokemon_display.shiny;
                    break;
                case QuestReward.Quest:
                    break;
                case QuestReward.Stardust:
                    infoData["amount"] = reward.stardust;
                    break;
                case QuestReward.Unset:
                    break;
            }
            rewardData["info"] = infoData;
            rewards.push(rewardData);
        });
        this.questConditions = conditions;
        this.questRewards = rewards;
        this.questTimestamp = getCurrentTimestamp();
    }
    /**
     * Save Pokestop.
     * @param updateQuest 
     */
    async save(updateQuest: boolean = false): Promise<void> {
        let oldPokestop: Pokestop;
        try {
            oldPokestop = await Pokestop.getById(this.id, true);
        } catch (err) {
            console.error("Failed to get old Pokestop with id", this.id);
            oldPokestop = null;
        }
        
        let sql: string = "";
        let args = [];
        this.updated = getCurrentTimestamp();
        if (oldPokestop === null) {
            WebhookController.instance.addPokestopEvent(this);
            if (this.lureExpireTimestamp || 0 > 0) {
                WebhookController.instance.addLureEvent(this);
            }
            if (this.questTimestamp || 0 > 0) {
                WebhookController.instance.addQuestEvent(this);
            }
            if (this.incidentExpireTimestamp || 0 > 0) {
                WebhookController.instance.addInvasionEvent(this);
            }
            sql = `
                INSERT INTO pokestop (id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, quest_type, quest_timestamp, quest_target, quest_conditions, quest_rewards, quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id, updated, first_seen_timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
            `;
            args.push(this.id);
        } else {
            if (oldPokestop.cellId && (this.cellId === undefined || this.cellId === null)) {
                this.cellId = oldPokestop.cellId;
            }
            if (oldPokestop.name && (this.name === undefined || this.name === null)) {
                this.name = oldPokestop.name;
            }
            if (oldPokestop.url && (this.url === undefined || this.url === null)) {
                this.url = oldPokestop.url;
            }
            if (updateQuest && oldPokestop.questType && (this.questType === undefined || this.questType === null)) {
                this.questType = oldPokestop.questType;
                this.questTarget = oldPokestop.questTarget;
                this.questConditions = oldPokestop.questConditions;
                this.questRewards = oldPokestop.questRewards;
                this.questTimestamp = oldPokestop.questTimestamp;
                this.questTemplate = oldPokestop.questTemplate;
            }
            if (oldPokestop.lureId && (this.lureId === undefined || this.lureId === null)) {
                this.lureId = oldPokestop!.lureId;
            }
            if (oldPokestop.lureExpireTimestamp || 0 < this.lureExpireTimestamp || 0) {
                WebhookController.instance.addLureEvent(this);
            }
            if (oldPokestop!.incidentExpireTimestamp || 0 < this.incidentExpireTimestamp || 0) {
                WebhookController.instance.addInvasionEvent(this);
            }
            if (updateQuest && this.questTimestamp || 0 > oldPokestop.questTimestamp || 0) {
                WebhookController.instance.addQuestEvent(this);
            }
            
            let questSQL: string = "";
            if (updateQuest) {
                questSQL = "quest_type = ?, quest_timestamp = ?, quest_target = ?, quest_conditions = ?, quest_rewards = ?, quest_template = ?,";
            } else {
                questSQL = "";
            }
            
            sql = `
                UPDATE pokestop
                SET lat = ? , lon = ? , name = ? , url = ? , enabled = ? , lure_expire_timestamp = ? , last_modified_timestamp = ? , updated = UNIX_TIMESTAMP(), ${questSQL} cell_id = ?, lure_id = ?, pokestop_display = ?, incident_expire_timestamp = ?, grunt_type = ?, deleted = false, sponsor_id = ?
                WHERE id = ?
            `;
        }

        args.push(this.lat);
        args.push(this.lon);
        args.push(this.name);
        args.push(this.url);
        args.push(this.enabled);
        args.push(this.lureExpireTimestamp);
        args.push(this.lastModifiedTimestamp);
        if (updateQuest || oldPokestop === undefined || oldPokestop === null) {
            args.push(this.questType);
            args.push(this.questTimestamp);
            args.push(this.questTarget);
            args.push(JSON.stringify(this.questConditions));
            args.push(JSON.stringify(this.questRewards));
            args.push(JSON.stringify(this.questTemplate));
        }
        args.push(this.cellId);
        args.push(this.lureId || 0);
        args.push(this.pokestopDisplay);
        args.push(this.incidentExpireTimestamp);
        args.push(this.gruntType);
        args.push(this.sponsorId);
        if (oldPokestop) {
            args.push(this.id);
        }

        await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
        Pokestop.Pokestops[this.id] = this;
    }
    /**
     * Load all Pokestops.
     */
    static async load(): Promise<Pokestop[]> {
        let sql = `
        SELECT id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, updated, quest_type, quest_timestamp, quest_target, CAST(quest_conditions AS CHAR), CAST(quest_rewards AS CHAR), quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id
        FROM pokestop
        WHERE deleted = false
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
        let pokestops: Pokestop[] = [];
        let keys = Object.values(results);
        keys.forEach(key => {
            let pokestop = new Pokestop({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                enabled: key.enabled,
                lure_expire_timestamp: key.lure_expire_timestamp,
                last_modified_timestamp: key.last_modified_timestamp,
                updated: key.updated,
                quest_type: key.quest_type,
                quest_timestamp: key.quest_timestamp,
                quest_target: key.quest_target,
                quest_conditions: JSON.parse(key.quest_conditions || {}),
                quest_rewards: JSON.parse(key.quest_rewards || {}),
                quest_template: key.quest_template,
                cell_id: key.cell_id,
                lure_id: key.lure_id,
                pokestop_display: key.pokestop_display,
                incident_expire_timestamp: key.incident_expire_timestamp,
                grunt_type: key.grunt_type,
                sponsor_id: key.sponsor_id
            });
            pokestops.push(pokestop);
            Pokestop.Pokestops[pokestop.id] = pokestop;
        })
        return pokestops;
    }
    /**
     * 
     * @param type 
     */
    toJson(type: string) {
        switch (type) {
            case "quest": // Quest
                return {
                    type: "quest",
                    message: {
                        pokestop_id: this.id,
                        latitude: this.lat,
                        longitude: this.lon,
                        type: this.questType,
                        target: this.questTarget,
                        template: this.questTemplate,
                        conditions: this.questConditions,
                        rewards: this.questRewards,
                        updated: this.questTimestamp,
                        pokestop_name: this.name || "Unknown",
                        pokestop_url: this.url || ""
                    }
                };
            case "invasion": // Invasion
                return {
                    type: "invasion",
                    message: {
                        pokestop_id: this.id,
                        latitude: this.lat,
                        longitude: this.lon,
                        name: this.name || "Unknown",
                        url: this.url || "",
                        lure_expiration: this.lureExpireTimestamp || 0,
                        last_modified: this.lastModifiedTimestamp || 0,
                        enabled: this.enabled || true,
                        lure_id: this.lureId || 0,
                        pokestop_display: this.pokestopDisplay || 0,
                        incident_expire_timestamp: this.incidentExpireTimestamp || 0,
                        grunt_type: this.gruntType || 0,
                        updated: this.updated || 1
                    }
                };
            default: // Pokestop
                return {
                    type: "pokestop",
                    message: {
                        pokestop_id: this.id,
                        latitude: this.lat,
                        longitude: this.lon,
                        name: this.name || "Unknown",
                        url: this.url || "",
                        lure_expiration: this.lureExpireTimestamp || 0,
                        last_modified: this.lastModifiedTimestamp || 0,
                        enabled: this.enabled || true,
                        lure_id: this.lureId || 0,
                        pokestop_display: this.pokestopDisplay || 0,
                        incident_expire_timestamp: this.incidentExpireTimestamp || 0,
                        updated: this.updated || 1
                    }
                };
        }
    }
}

// Export the class
export { Pokestop };