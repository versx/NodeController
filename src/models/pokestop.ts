"use strict"

import { Database } from '../data/mysql';
import { WebhookController } from '../controllers/webhook-controller';
import { Instance } from './instance';
//import { winston } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

const lureTime = 1800;

/**
 * Pokestop model class.
 */
class Pokestop {
    static Pokestops = {};

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
                    this.lureExpireTimestamp = lastModifiedTimestamp + lureTime;
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
     * Get all pokestops.
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
        
        let results = await db.query(sql, [pokestopId])
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
                let splice = ids.splice(start, end); // TODO: Double check
                let spliceResult = this.getInIds(splice);
                (await spliceResult).forEach(x => result.push(x));
                //result.push(spliceResult); // TODO: Double check
            }
            return result;
        }
        
        if (ids.length === 0) {
            return [];
        }

        let inSQL = "(";
        for (let i = 1; i < ids.length; i++) {
            inSQL += "?, "; // TODO: Double check
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
    static async clearQuests(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
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
            /*
            TODO: for (coordLine in areaType1) {
                let lat = coordLine["lat"]
                let lon = coordLine["lon"]
                areaString += `${lat},${lon}\n`;
            }
            */
        } else if (areaType2) {
            /*
            TODO: for (geofence in areaType2) {
                for (coordLine in geofence) {
                    let lat = coordLine["lat"]
                    let lon = coordLine["lon"]
                    areaString += `${lat},${lon}\n`;
                }
            }
            */
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
        //TODO: Add quest
        /*
        self.questType = questData.questType.rawValue.toUInt32()
        self.questTarget = UInt16(questData.goal.target)
        self.questTemplate = questData.templateID.lowercased()
        
        var conditions = [[String: Any]]()
        var rewards = [[String: Any]]()
        
        for conditionData in questData.goal.condition {
            var condition = [String: Any]()
            var infoData = [String: Any]()
            condition["type"] = conditionData.type.rawValue
            
            switch conditionData.type {
            case .withBadgeType:
                let info = conditionData.withBadgeType
                infoData["amount"] = info.amount
                infoData["badge_rank"] = info.badgeRank
                var badgeTypesById = [Int]()
                for badge in info.badgeType {
                    badgeTypesById.append(badge.rawValue)
                }
                infoData["badge_types"] = badgeTypesById
            case .withItem:
                let info = conditionData.withItem
                if info.item.rawValue != 0 {
                    infoData["item_id"] = info.item.rawValue
                }
            case .withRaidLevel:
                let info = conditionData.withRaidLevel
                var raidLevelById = [Int]()
                for raidLevel in info.raidLevel {
                    raidLevelById.append(raidLevel.rawValue)
                }
                infoData["raid_levels"] = raidLevelById
            case .withPokemonType:
                let info = conditionData.withPokemonType
                var pokemonTypesById = [Int]()
                for type in info.pokemonType {
                    pokemonTypesById.append(type.rawValue)
                }
                infoData["pokemon_type_ids"] = pokemonTypesById
            case .withPokemonCategory:
                let info = conditionData.withPokemonCategory
                if info.categoryName != "" {
                    infoData["category_name"] = info.categoryName
                }
                var pokemonById = [Int]()
                for pokemon in info.pokemonIds {
                    pokemonById.append(pokemon.rawValue)
                }
                infoData["pokemon_ids"] = pokemonById
            case .withWinRaidStatus: break
            case .withThrowType:
                let info = conditionData.withThrowType
                if info.throwType.rawValue != 0 {
                    infoData["throw_type_id"] = info.throwType.rawValue
                }
                infoData["hit"] = info.hit
            case .withThrowTypeInARow:
                let info = conditionData.withThrowType
                if info.throwType.rawValue != 0 {
                    infoData["throw_type_id"] = info.throwType.rawValue
                }
                infoData["hit"] = info.hit
            case .withLocation:
                let info = conditionData.withLocation
                infoData["cell_ids"] = info.s2CellID
            case .withDistance:
                let info = conditionData.withDistance
                infoData["distance"] = info.distanceKm
            case .withPokemonAlignment:
                let info = conditionData.withPokemonAlignment
                infoData["alignment_ids"] = info.alignment.map({ (alignment) -> Int in
                    return alignment.rawValue
                })
            case .withInvasionCharacter:
                let info = conditionData.withInvasionCharacter
                infoData["character_category_ids"] = info.category.map({ (category) -> Int in
                    return category.rawValue
                })
            case .withNpcCombat:
                let info = conditionData.withNpcCombat
                infoData["win"] = info.requiresWin
                infoData["trainer_ids"] = info.combatNpcTrainerID
            case .withPvpCombat:
                let info = conditionData.withPvpCombat
                infoData["win"] = info.requiresWin
                infoData["template_ids"] = info.combatLeagueTemplateID
            case .withPlayerLevel:
                let info = conditionData.withPlayerLevel
                infoData["level"] = info.level
            case .withBuddy:
                let info = conditionData.withBuddy
                infoData["min_buddy_level"] = info.minBuddyLevel.rawValue
                infoData["must_be_on_map"] = info.mustBeOnMap
            case .withDailyBuddyAffection:
                let info = conditionData.withDailyBuddyAffection
                infoData["min_buddy_affection_earned_today"] = info.minBuddyAffectionEarnedToday
            case .withWinGymBattleStatus: break
            case .withSuperEffectiveCharge: break
            case .withUniquePokestop: break
            case .withQuestContext: break
            case .withWinBattleStatus: break
            case .withCurveBall: break
            case .withNewFriend: break
            case .withDaysInARow: break
            case .withWeatherBoost: break
            case .withDailyCaptureBonus: break
            case .withDailySpinBonus: break
            case .withUniquePokemon: break
            case .withBuddyInterestingPoi: break
            case .unset: break
            case .UNRECOGNIZED(_): break
            }
            
            if !infoData.isEmpty {
                condition["info"] = infoData
            }
            conditions.append(condition)
        }
        
        for rewardData in questData.questRewards {
            var reward = [String: Any]()
            var infoData = [String: Any]()
            reward["type"] = rewardData.type.rawValue
            
            switch rewardData.type {
                
            case .experience:
                let info = rewardData.exp
                infoData["amount"] = info
            case .item:
                let info = rewardData.item
                infoData["amount"] = info.amount
                infoData["item_id"] = info.item.rawValue
            case .stardust:
                let info = rewardData.stardust
                infoData["amount"] = info
            case .candy:
                let info = rewardData.candy
                infoData["amount"] = info.amount
                infoData["pokemon_id"] = info.pokemonID.rawValue
            case .pokemonEncounter:
                let info = rewardData.pokemonEncounter
                if info.isHiddenDitto {
                    infoData["pokemon_id"] = 132
                    infoData["pokemon_id_display"] = info.pokemonID.rawValue
                } else {
                    infoData["pokemon_id"] = info.pokemonID.rawValue
                }
                infoData["costume_id"] = info.pokemonDisplay.costume.rawValue
                infoData["form_id"] = info.pokemonDisplay.form.rawValue
                infoData["gender_id"] = info.pokemonDisplay.gender.rawValue
                infoData["shiny"] = info.pokemonDisplay.shiny
            case .avatarClothing: break
            case .quest: break
            case .unset: break
            case .UNRECOGNIZED(_): break
            }
            
            reward["info"] = infoData
            rewards.append(reward)
        }
        
        self.questConditions = conditions
        self.questRewards = rewards
        self.questTimestamp = UInt32(Date().timeIntervalSince1970)
        */
    }
    /**
     * Save Pokestop
     * @param updateQuest 
     */
    async save(updateQuest: boolean = false): Promise<void> {
        //TODO: Check if values changed, if not skip.
        let oldPokestop: Pokestop;
        try {
            oldPokestop = await Pokestop.getById(this.id, true);
        } catch (err) {
            console.error("Failed to get old Pokestop with id", this.id);
            oldPokestop = null;
        }
        
        let sql: string = "";
        let args = [];
        this.updated = new Date().getUTCSeconds();        
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

        let results = await db.query(sql, args)
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
}

function flattenCoords(area: string): string {
    let coords: string = "";
    let areaRows: string[] = area.split('\n');
    let firstCoord: string = null;
    areaRows.forEach(areaRow => {
        let split = areaRow.split(',');
        if (split.length === 2) {
            let lat = parseFloat(split[0].replace(' ', ''));
            let lon = parseFloat(split[1].replace(' ', ''));
            if (lat && lon) {
                let coord: string = `${lat} {lon}`;
                if (firstCoord === null) {
                    firstCoord = coord;
                }
                coords += `${coord},`;
            }
        }
    });
    return `${coords}${firstCoord}`;
}


// Export the class
export { Pokestop };