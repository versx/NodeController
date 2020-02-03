"use strict"

import { Cache, GYM_LIST } from '../data/cache';
import { DbController } from '../controllers/db-controller';
import { WebhookController } from '../controllers/webhook-controller';
import { Database } from '../data/mysql';
import { getCurrentTimestamp } from '../utils/util';
//import { winston } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

/**
 * Gym model class.
 */
class Gym {
    id: string;
    lat: number;
    lon: number;
    name: string;
    url: string;
    enabled: boolean;
    guardPokemonId: number;
    teamId: number;
    availableSlots: number;
    lastModifiedTimestamp: number;
    exRaidEligible: boolean;
    inBattle: boolean;
    sponsorId: number;
    totalCp: number;
    raidEndTimestamp: number;
    raidSpawnTimestamp: number;
    raidBattleTimestamp: number;
    raidLevel: number;
    raidIsExclusive: boolean;
    raidPokemonId: number;
    raidPokemonMove1: number;
    raidPokemonMove2: number;
    raidPokemonForm: number;
    raidPokemonCp: number;
    raidPokemonGender: number;
    updated: number;
    cellId: string;

    /**
     * Initialize new Gym object.
     * @param data 
     */
    constructor(data: any) {
        if (data.fort !== undefined) {
            this.id = data.fort.id.toString();
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            this.enabled = data.fort.enabled;
            this.guardPokemonId = data.fort.guard_pokemon_id;
            this.teamId = data.fort.owned_by_team;
            this.availableSlots = data.fort.gym_display.slots_available;
            this.lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            this.exRaidEligible = data.fort.is_ex_raid_eligible;
            this.inBattle = data.fort.is_in_battle;
            if (data.fort.sponsor !== 0) {
                this.sponsorId = data.fort.sponsor;
            }
            if (data.fort.image_url !== undefined) {
                this.url = data.fort.image_url;
            }
            if (data.fort.owned_by_team === 0) {
                this.totalCp = 0;
            } else {
                this.totalCp = data.fort.gym_display.total_gym_cp;
            }
            if (data.fort.raid_info !== undefined && data.fort.raid_info !== null) {
                this.raidEndTimestamp = data.fort.raid_info.raid_end_ms / 1000;
                this.raidSpawnTimestamp = data.fort.raid_info.raid_spawn_ms / 1000;
                this.raidBattleTimestamp = data.fort.raid_info.raid_battle_ms / 1000;
                this.raidLevel = data.fort.raid_info.raid_level;
                this.raidIsExclusive = data.fort.raid_info.is_exclusive;
                if (data.fort.raid_info.raid_pokemon !== undefined && data.fort.raid_info.raid_pokemon !== null) {
                    this.raidPokemonId = data.fort.raid_info.raid_pokemon.pokemon_id;
                    this.raidPokemonMove1 = data.fort.raid_info.raid_pokemon.move1;
                    this.raidPokemonMove2 = data.fort.raid_info.raid_pokemon.move2;
                    this.raidPokemonCp = data.fort.raid_info.raid_pokemon.cp;
                    this.raidPokemonForm = data.fort.raid_info.raid_pokemon.pokemon_display.form;
                    this.raidPokemonGender = data.fort.raid_info.raid_pokemon.pokemon_display.gender;
                }
            }
            this.cellId = data.cellId.toString();
        } else {
            this.id = data.id.toString();
            this.lat = data.lat;
            this.lon = data.lon;
            this.name = data.name;
            this.url = data.url;
            this.guardPokemonId = data.guard_pokemon_id;
            this.enabled = data.enabled;
            this.lastModifiedTimestamp = data.last_modified_timestamp;
            this.teamId = data.team_id;
            this.raidEndTimestamp = data.raid_end_timestamp;
            this.raidSpawnTimestamp = data.raid_spawn_timestamp;
            this.raidBattleTimestamp = data.raid_battle_timestamp;
            this.raidPokemonId = data.raid_pokemon_id;
            this.raidLevel = data.raid_level;
            this.availableSlots = data.available_slots;
            this.updated = data.updated;
            this.exRaidEligible = data.ex_raid_eligible;
            this.inBattle = data.in_battle;
            this.raidPokemonMove1 = data.raid_pokemon_move_1;
            this.raidPokemonMove2 = data.raid_pokemon_move_2;
            this.raidPokemonForm = data.raid_pokemon_form;
            this.raidPokemonCp = data.raidPokemon_cp;
            this.raidPokemonGender = data.raid_pokemon_gender;
            this.raidIsExclusive = data.raid_is_exclusive;
            this.cellId = data.cell_id.toString();
            this.totalCp = data.total_cp;
            this.sponsorId = data.sponsor_id;
        }
    }
    /**
     * Get all Gyms within a minimum and maximum latitude and longitude.
     */
    static async getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number): Promise<Gym[]> {
        let sql = `
            SELECT id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, updated, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id
            FROM gym
            WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ? AND updated > ? AND deleted = false
        `;
        let args = [minLat, maxLat, minLon, maxLon, updated];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Gym] Error: " + x);
                return null;
            });

        let gyms: Gym[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let gym = new Gym({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                guard_pokemon_id: key.guard_pokemon_id,
                last_modified_timestamp: key.last_modified_timestamp,
                team_id: key.team_id,
                raid_end_timestamp: key.raid_end_timestamp,
                raid_spawn_timestamp: key.raid_spawn_timestamp,
                raid_battle_timestamp: key.raid_battle_timestamp,
                raid_pokemon_id: key.raid_pokemon_id,
                enabled: key.enabled,
                available_slots: key.available_slots,
                updated: key.updated,
                raid_level: key.raid_level,
                ex_raid_eligible: key.ex_raid_eligible,
                in_battle: key.in_battle,
                raid_pokemon_move_1: key.raid_pokemon_move_1,
                raid_pokemon_move_2: key.raid_pokemon_move_2,
                raid_pokemon_form: key.raid_pokemon_form,
                raid_pokemon_cp: key.raid_pokemon_cp,
                raid_pokemon_gender: key.raid_pokemon_gender,
                raid_is_exclusive: key.raid_is_exclusive,
                cell_id: key.cell_id,
                total_cp: key.total_cp,
                sponsor_id: key.sponsor_id    
            });
            gyms.push(gym);
        });
        return gyms;
    }
    /**
     * Get gym by gym id.
     * @param gymId 
     */
    static async getById(gymId: string, withDeleted: boolean = false) {
        let cachedGym = await Cache.instance.get<Gym>(GYM_LIST, gymId);
        if (cachedGym/*instanceof Gym*/) {
            console.log("[Gym] Returning cached gym", cachedGym.id);
            return cachedGym;
        }

        let withDeletedSQL: string;
        if (withDeleted) {
            withDeletedSQL = "";
        } else {
            withDeletedSQL = "AND deleted = false";
        }
        let sql = `
            SELECT id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, updated, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id
            FROM gym
            WHERE id = ? ${withDeletedSQL}
            LIMIT 1
        `;
        let args = gymId;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
       
        let gym: Gym;
        let keys = Object.values(result);
        keys.forEach(key => {
            gym = new Gym({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                guard_pokemon_id: key.guard_pokemon_id,
                last_modified_timestamp: key.last_modified_timestamp,
                team_id: key.team_id,
                raid_end_timestamp: key.raid_end_timestamp,
                raid_spawn_timestamp: key.raid_spawn_timestamp,
                raid_battle_timestamp: key.raid_battle_timestamp,
                raid_pokemon_id: key.raid_pokemon_id,
                enabled: key.enabled,
                available_slots: key.available_slots,
                updated: key.updated,
                raid_level: key.raid_level,
                ex_raid_eligible: key.ex_raid_eligible,
                in_battle: key.in_battle,
                raid_pokemon_move_1: key.raid_pokemon_move_1,
                raid_pokemon_move_2: key.raid_pokemon_move_2,
                raid_pokemon_form: key.raid_pokemon_form,
                raid_pokemon_cp: key.raid_pokemon_cp,
                raid_pokemon_gender: key.raid_pokemon_gender,
                raid_is_exclusive: key.raid_is_exclusive,
                cell_id: key.cell_id,
                total_cp: key.total_cp,
                sponsor_id: key.sponsor_id    
            });
        });
        return gym;
    }
    /**
     * Get gyms in cell ids.
     * @param cellIds 
     */
    static async getByCellIds(cellIds: string[]) {
        if (cellIds.length > 10000) {
            let result: Gym[] = [];
            let count = Math.ceil(cellIds.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, cellIds.length - 1);
                let splice = cellIds.splice(start, end);
                let spliceResult = await this.getByIds(splice);
                spliceResult.forEach(x => result.push(x));
            }
            return result;
        }
        
        if (cellIds.length === 0) {
            return [];
        }

        let inSQL = "(";
        for (let i = 1; i < cellIds.length; i++) {
            inSQL += "?, ";
        }
        inSQL += "?)";
        
        let sql = `
            SELECT id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, updated, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id
            FROM gym
            WHERE cell_id IN ${inSQL} AND deleted = false
        `;

        let args = cellIds;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Pokestop] Error: " + x);
                return null;
            });
       
        let gyms: Gym[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let gym = new Gym({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                guard_pokemon_id: key.guard_pokemon_id,
                last_modified_timestamp: key.last_modified_timestamp,
                team_id: key.team_id,
                raid_end_timestamp: key.raid_end_timestamp,
                raid_spawn_timestamp: key.raid_spawn_timestamp,
                raid_battle_timestamp: key.raid_battle_timestamp,
                raid_pokemon_id: key.raid_pokemon_id,
                enabled: key.enabled,
                available_slots: key.available_slots,
                updated: key.updated,
                raid_level: key.raid_level,
                ex_raid_eligible: key.ex_raid_eligible,
                in_battle: key.in_battle,
                raid_pokemon_move_1: key.raid_pokemon_move_1,
                raid_pokemon_move_2: key.raid_pokemon_move_2,
                raid_pokemon_form: key.raid_pokemon_form,
                raid_pokemon_cp: key.raid_pokemon_cp,
                raid_pokemon_gender: key.raid_pokemon_gender,
                raid_is_exclusive: key.raid_is_exclusive,
                cell_id: key.cell_id,
                total_cp: key.total_cp,
                sponsor_id: key.sponsor_id    
            });
            gyms.push(gym);
        });
        return gyms;
    }
    /**
     * Get all Gyms with specific IDs.
     * @param ids 
     */
    static async getByIds(ids: string[]): Promise<Gym[]> {
        if (ids.length > 10000) {
            let result: Gym[] = [];
            let count = Math.ceil(ids.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let splice = ids.splice(start, end);
                let spliceResult = await this.getByIds(splice);
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
        SELECT id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, updated, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id
        FROM gym
        WHERE id IN ${inSQL} AND deleted = false
        `;        
        let args = ids;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Gym] Error: " + x);
                return null;
            });
       
        let gyms: Gym[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let gym = new Gym({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                guard_pokemon_id: key.guard_pokemon_id,
                last_modified_timestamp: key.last_modified_timestamp,
                team_id: key.team_id,
                raid_end_timestamp: key.raid_end_timestamp,
                raid_spawn_timestamp: key.raid_spawn_timestamp,
                raid_battle_timestamp: key.raid_battle_timestamp,
                raid_pokemon_id: key.raid_pokemon_id,
                enabled: key.enabled,
                available_slots: key.available_slots,
                updated: key.updated,
                raid_level: key.raid_level,
                ex_raid_eligible: key.ex_raid_eligible,
                in_battle: key.in_battle,
                raid_pokemon_move_1: key.raid_pokemon_move_1,
                raid_pokemon_move_2: key.raid_pokemon_move_2,
                raid_pokemon_form: key.raid_pokemon_form,
                raid_pokemon_cp: key.raid_pokemon_cp,
                raid_pokemon_gender: key.raid_pokemon_gender,
                raid_is_exclusive: key.raid_is_exclusive,
                cell_id: key.cell_id,
                total_cp: key.total_cp,
                sponsor_id: key.sponsor_id    
            });
            gyms.push(gym);
        });
        return gyms;
    }
    /**
     * Add gym details from GetMapObjects response.
     * @param fort 
     */
    addDetails(fort: any) {
        if (fort.imageUrls === undefined || fort.imageUrls === null) {
            this.url = fort.imageUrls[0];
        }
        this.name = fort.name;
    }
    /**
     * Add gym details from GymGetInfo response.
     * @param gymInfo 
     */
    addGymInfo(gymInfo: any) {
        if (this.name !== gymInfo.name && gymInfo.name !== undefined && gymInfo.name !== null) {
            this.name = gymInfo.name;
        }
        if (this.url !== gymInfo.url && gymInfo.url !== undefined && gymInfo.url !== null) {
            this.url = gymInfo.url;
        }
    }
    /**
     * Save gym.
     */
    async save() {
        /* TODO: Check if in redis, if so check if properties are the same. If 
           properties are the same in cache then we don't need to save to mysql.
        */
        let oldGym: Gym;
        try {
            oldGym = await Gym.getById(this.id, true);
        } catch (err) {
            oldGym = null;
        }

        if (this.raidIsExclusive && DbController.ExRaidBossId) {
            this.raidPokemonId = DbController.ExRaidBossId;
            this.raidPokemonForm = DbController.ExRaidBossForm || 0;
        }
        
        let sql: string = "";
        let args = [];
        this.updated = getCurrentTimestamp();       
        if (oldGym === undefined || oldGym === null) {
            WebhookController.instance.addGymEvent(this);
            WebhookController.instance.addGymInfoEvent(this);
            let now = getCurrentTimestamp();
            let raidBattleTime = this.raidBattleTimestamp || 0;
            let raidEndTime = this.raidEndTimestamp || 0;
            
            if (raidBattleTime > now && this.raidLevel || 0 !== 0) {
                WebhookController.instance.addEggEvent(this);
            } else if (raidEndTime > now && this.raidPokemonId || 0 !== 0) {
                WebhookController.instance.addRaidEvent(this);
            }            
            sql = `
                INSERT INTO gym (id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id, updated, first_seen_timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
            `;
            args.push(this.id);
        } else {
            if (oldGym.cellId && this.cellId == null) {
                this.cellId = oldGym.cellId;
            }
            if (oldGym.name && (this.name === undefined || this.name === null)) {
                this.name = oldGym.name;
            }
            if (oldGym.url && (this.url === undefined || this.url === null)) {
                this.url = oldGym!.url;
            }
            if (oldGym.raidIsExclusive && (this.raidIsExclusive === undefined || this.raidIsExclusive === null)) {
                this.raidIsExclusive = oldGym.raidIsExclusive;
            }
            if (oldGym.availableSlots !== this.availableSlots || oldGym!.teamId !== this.teamId || oldGym.inBattle !== this.inBattle) {
                WebhookController.instance.addGymInfoEvent(this);
            }            
            if ((this.raidEndTimestamp === undefined || this.raidEndTimestamp === null) && oldGym.raidEndTimestamp) {
                this.raidEndTimestamp = oldGym.raidEndTimestamp;
            }            
            if ((this.raidSpawnTimestamp && this.raidSpawnTimestamp !== 0) &&
                (
                    oldGym.raidLevel !== this.raidLevel ||
                    oldGym.raidPokemonId !== this.raidPokemonId ||
                    oldGym.raidSpawnTimestamp !== this.raidSpawnTimestamp
                )) {
                
                let now = getCurrentTimestamp();
                let raidBattleTime = this.raidBattleTimestamp || 0;
                let raidEndTime = this.raidEndTimestamp || 0;
                
                if (raidBattleTime > now && this.raidLevel || 0 !== 0) {
                    WebhookController.instance.addEggEvent(this);
                } else if (raidEndTime > now && this.raidPokemonId || 0 !== 0) {
                    WebhookController.instance.addRaidEvent(this);
                }
            }
            
            sql = `
                UPDATE gym
                SET lat = ?, lon = ? , name = ? , url = ? , guarding_pokemon_id = ? , last_modified_timestamp = ? , team_id = ? , raid_end_timestamp = ? , raid_spawn_timestamp = ? , raid_battle_timestamp = ? , raid_pokemon_id = ? , enabled = ? , availble_slots = ? , updated = UNIX_TIMESTAMP(), raid_level = ?, ex_raid_eligible = ?, in_battle = ?, raid_pokemon_move_1 = ?, raid_pokemon_move_2 = ?, raid_pokemon_form = ?, raid_pokemon_cp = ?, raid_pokemon_gender = ?, raid_is_exclusive = ?, cell_id = ?, deleted = false, total_cp = ?, sponsor_id = ?
                WHERE id = ?
            `;
        }
        
        args.push(this.lat);
        args.push(this.lon);
        args.push(this.name);
        args.push(this.url);
        args.push(this.guardPokemonId);
        args.push(this.lastModifiedTimestamp);
        args.push(this.teamId);
        args.push(this.raidEndTimestamp);
        args.push(this.raidSpawnTimestamp);
        args.push(this.raidBattleTimestamp);
        args.push(this.raidPokemonId);
        args.push(this.enabled);
        args.push(this.availableSlots);
        args.push(this.raidLevel);
        args.push(this.exRaidEligible);
        args.push(this.inBattle);
        args.push(this.raidPokemonMove1);
        args.push(this.raidPokemonMove2);
        args.push(this.raidPokemonForm);
        args.push(this.raidPokemonCp);
        args.push(this.raidPokemonGender);
        args.push(this.raidIsExclusive);
        args.push(this.cellId);
        args.push(this.totalCp);
        args.push(this.sponsorId);
        if (oldGym) {
            args.push(this.id);
        }

        await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Gym] Error: " + x);
                return null;
            });
        // Cache with redis
        if (!await Cache.instance.set(GYM_LIST, this.id, this)) {
            console.error("[Gym] Failed to cache gym with redis", this.id);
        }
    }
    /**
     * Load all gyms.
     */
    static async load(): Promise<Gym[]> {
        let sql = `
            SELECT id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, updated, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id
            FROM gym
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Gym] Error: " + x);
                return null;
            });

        let gyms: Gym[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let gym = new Gym({
                id: key.id,
                lat: key.lat,
                lon: key.lon,
                name: key.name,
                url: key.url,
                guard_pokemon_id: key.guard_pokemon_id,
                last_modified_timestamp: key.last_modified_timestamp,
                team_id: key.team_id,
                raid_end_timestamp: key.raid_end_timestamp,
                raid_spawn_timestamp: key.raid_spawn_timestamp,
                raid_battle_timestamp: key.raid_battle_timestamp,
                raid_pokemon_id: key.raid_pokemon_id,
                enabled: key.enabled,
                available_slots: key.available_slots,
                updated: key.updated,
                raid_level: key.raid_level,
                ex_raid_eligible: key.ex_raid_eligible,
                in_battle: key.in_battle,
                raid_pokemon_move_1: key.raid_pokemon_move_1,
                raid_pokemon_move_2: key.raid_pokemon_move_2,
                raid_pokemon_form: key.raid_pokemon_form,
                raid_pokemon_cp: key.raid_pokemon_cp,
                raid_pokemon_gender: key.raid_pokemon_gender,
                raid_is_exclusive: key.raid_is_exclusive,
                cell_id: key.cell_id,
                total_cp: key.total_cp,
                sponsor_id: key.sponsor_id    
            });
            gyms.push(gym);
        });
        return gyms;
    }
    toJson(type: string) {
        switch (type) {
            case "gym":
                return {
                    type: "gym",
                    message: {
                        gym_id: this.id,
                        gym_name: this.name || "Unknown",
                        latitude: this.lat,
                        longitude: this.lon,
                        url: this.url || "",
                        enabled: this.enabled || true,
                        team_id: this.teamId || 0,
                        last_modified: this.lastModifiedTimestamp || 0,
                        guard_pokemon_id: this.guardPokemonId || 0,
                        slots_available: this.availableSlots || 6,
                        raid_active_until: this.raidEndTimestamp || 0,
                        ex_raid_eligible: this.exRaidEligible || 0,
                        sponsor_id: this.sponsorId || 0
                    }
                };
            case "gym-info":
                return {
                    type: "gym_details",
                    message: {
                        id: this.id,
                        name: this.name || "Unknown",
                        url: this.url || "",
                        latitude: this.lat,
                        longitude: this.lon,
                        team: this.teamId || 0,
                        slots_available: this.availableSlots || 6,
                        ex_raid_eligible: this.exRaidEligible || 0,
                        in_battle: this.inBattle || false,
                        sponsor_id: this.sponsorId || 0
                    }
                };
            case "egg":
            case "raid":
                return {
                    type: "raid",
                    message: {
                        gym_id: this.id,
                        gym_name: this.name ?? "Unknown",
                        gym_url: this.url ?? "",
                        latitude: this.lat,
                        longitude: this.lon,
                        team_id: this.teamId ?? 0,
                        spawn: this.raidSpawnTimestamp ?? 0,
                        start: this.raidBattleTimestamp ?? 0,
                        end: this.raidEndTimestamp ?? 0,
                        level: this.raidLevel ?? 0,
                        pokemon_id: this.raidPokemonId ?? 0,
                        cp: this.raidPokemonCp ?? 0,
                        gender: this.raidPokemonGender ?? 0,
                        form: this.raidPokemonForm ?? 0,
                        move_1: this.raidPokemonMove1 ?? 0,
                        move_2: this.raidPokemonMove2 ?? 0,
                        ex_raid_eligible: this.exRaidEligible ?? 0,
                        is_exclusive: this.raidIsExclusive ?? false,
                        sponsor_id: this.sponsorId ?? 0,
                    }
                };
        }
    }
}

// Export the class
export { Gym };