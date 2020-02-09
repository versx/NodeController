"use strict";

import * as moment from 'moment';
import * as S2 from 'nodes2ts';
import { Cache, POKESTOP_LIST, GYM_LIST } from './cache';
import { Database } from './mysql';
import { Cell } from '../models/cell';
import { Gym } from '../models/gym';
import { Pokestop } from '../models/pokestop';
import { Pokemon } from '../models/pokemon';
import { Weather } from '../models/weather';
import { logger } from '../utils/logger';
import { getCurrentTimestamp } from '../utils/util';
import config      = require('../config.json');
import { DbController } from '../controllers/db-controller';
import { Spawnpoint } from '../models/spawnpoint';
const db           = new Database(config);

const MysqlDigestInterval = 10 * 1000; // 10 seconds

/**
 * 
 */
class Digest {
    private gymIdsPerCell: Map<number, string[]>;
    private stopsIdsPerCell: Map<number, string[]>;
    private timer: NodeJS.Timeout;

    constructor() {
        logger.info(`[Digest] Starting mysql digestion.`);
        this.gymIdsPerCell = new Map<number, string[]>();
        this.stopsIdsPerCell = new Map<number, string[]>();
        this.timer = setInterval(() => this.updateAll(), MysqlDigestInterval);
    }
    stop() {
        clearInterval(this.timer);
    }
    async consumeCells(cells: any[]) {
        if (cells.length > 0) {
            for (let i = 0; i < cells.length; i++) {
                let cellId = cells[i];
                try {
                    let s2cell = new S2.S2Cell(new S2.S2CellId(cellId.toString()));
                    //s2cell.capBound.rectBound.center.lat.degrees
                    // TODO: Fix lat/lon returning wrong values.
                    let center = s2cell.getCapBound().getRectBound().getCenter();
                    let lat = center.latDegrees;
                    let lon = center.lngDegrees;
                    let level = s2cell.level;
                    let cell = new Cell(
                        cellId.toString(),
                        level,
                        lat,
                        lon,
                        getCurrentTimestamp()
                    );
                    await cell.save(true);
                } catch (err) {
                    logger.error(err);
                }
                
                if (this.gymIdsPerCell[cellId] === undefined) {
                    this.gymIdsPerCell[cellId] = [];
                }
                if (this.stopsIdsPerCell[cellId] === undefined) {
                    this.stopsIdsPerCell[cellId] = [];
                } 
            }
        }
    }
    async consumeClientWeather(clientWeathers: any[]) {
        if (clientWeathers.length > 0) {
            let startClientWeathers = process.hrtime();
            for (let i = 0; i < clientWeathers.length; i++) {
                let conditions = clientWeathers[i];
                try {
                    //logger.info("Parsed weather: " + conditions);
                    let ws2cell = new S2.S2Cell(new S2.S2CellId(conditions.cell.toString()));
                    let wlat = ws2cell.getCapBound().getRectBound().getCenter().latDegrees;
                    let wlon = ws2cell.getCapBound().getRectBound().getCenter().lngDegrees;
                    let wlevel = ws2cell.level;
                    let weather = new Weather({
                        id: ws2cell.id.id.toString(), 
                        level: wlevel,
                        latitude: wlat,
                        longitude: wlon,
                        conditions: conditions.data,
                        updated: null
                    });
                    await weather.save(true);
                } catch (err) {
                    logger.error(err);
                }
            }
            let endClientWeathers = process.hrtime(startClientWeathers);
            logger.info("[Digest] Weather Detail Count: " + clientWeathers.length + " parsed in " + endClientWeathers + "s");
        }
    }
    async consumeWildPokemon(wildPokemons: any[], username: string) {
        if (wildPokemons.length > 0) {
            let startWildPokemon = process.hrtime();
            for (let i = 0; i < wildPokemons.length; i++) {
                let wildPokemon = wildPokemons[i];
                try {
                    let pokemon = new Pokemon({
                        username: username,
                        cellId: wildPokemon.cell,
                        timestampMs: wildPokemon.timestampMs,
                        wild: wildPokemon.data
                    });
                    await pokemon.save();
                } catch (err) {
                    logger.error(err);
                }
            }
            let endWildPokemon = process.hrtime(startWildPokemon);
            logger.info("[Digest] Pokemon Count: " + wildPokemons.length + " parsed in " + endWildPokemon + "s");
        }
    }
    async consumeNearbyPokemon(nearbyPokemons: any[], username: string) {
        if (nearbyPokemons.length > 0) {
            let startNearbyPokemon = process.hrtime();
            for (let i = 0; i < nearbyPokemons.length; i++) {
                let nearbyPokemon = nearbyPokemons[i];
                try {
                    let pokemon = new Pokemon({
                        username: username,
                        cellId: nearbyPokemon.cell,
                        //timestampMs: nearbyPokemon.timestamp_ms,
                        nearby: nearbyPokemon.data
                    });
                    await pokemon.save();
                } catch (err) {
                    logger.error(err);
                }
            }
            let endNearbyPokemon = process.hrtime(startNearbyPokemon);
            logger.info("[Digest] NearbyPokemon Count: " + nearbyPokemons.length + " parsed in " + endNearbyPokemon + "s");
        }
    }
    async consumeForts(forts: any[]) {
        if (forts.length > 0) {
            let startForts = process.hrtime();
            for (let i = 0; i < forts.length; i++) {
                let fort = forts[i];
                try {
                    switch (fort.data.type) {
                        case 0: // gym
                            let gym = new Gym({
                                cellId: fort.cell,
                                fort: fort.data
                            });
                            await gym.save();
                            if (this.gymIdsPerCell[fort.cell] === undefined) {
                                this.gymIdsPerCell[fort.cell] = [];
                            }
                            this.gymIdsPerCell[fort.cell.toString()].push(fort.data.id.toString());
                            break;
                        case 1: // checkpoint
                            let pokestop = new Pokestop({
                                cellId: fort.cell,
                                fort: fort.data
                            });
                            await pokestop.save();
                            if (this.stopsIdsPerCell[fort.cell] === undefined) {
                                this.stopsIdsPerCell[fort.cell] = [];
                            }
                            this.stopsIdsPerCell[fort.cell.toString()].push(fort.data.id.toString());
                            break;
                    }
                } catch (err) {
                    logger.error(err);
                }
            }
            let endForts = process.hrtime(startForts);
            logger.info("[Digest] Forts Count: " + forts.length + " parsed in " + endForts + "s");
        }
    }
    async consumeFortDetails(fortDetails: any[]) {
        if (fortDetails.length > 0) {
            let startFortDetails = process.hrtime();
            for (let i = 0; i < fortDetails.length; i++) {
                let fort = fortDetails[i];
                switch (fort.type) {
                    case 0: // gym
                        let gym: Gym;
                        try {
                            gym = await Gym.getById(fort.id);
                        } catch (err) {
                            gym = null;
                        }
                        if (gym) {
                            gym.addDetails(fort);
                            await gym.save();
                        }
                        break;
                    case 1: // checkpoint
                        let pokestop: Pokestop;
                        try {
                            pokestop = await Pokestop.getById(fort.id);
                        } catch (err) {
                            pokestop = null;
                        }
                        if (pokestop) {
                            pokestop.addDetails(fort);
                            await pokestop.save();
                        }
                        break;
                }
            }
            let endFortDetails = process.hrtime(startFortDetails);
            logger.info("[Digest] Forts Detail Count: " + fortDetails.length + " parsed in " + endFortDetails + "s");
        }
    }
    async consumeGymInfos(gymInfos: any[]) {
        if (gymInfos.length > 0) {
            let startGymInfos = process.hrtime();
            for (let i = 0; i < gymInfos.length; i++) {
                let gymInfo = gymInfos[i];
                let gym: Gym;
                try {
                    gym = await Gym.getById(gymInfo.gym_status_and_defenders.pokemon_fort_proto.id);
                } catch (err) {
                    gym = null
                }
                if (gym) {
                    gym.addGymInfo(gymInfo);
                    await gym.save();
                }
            }
            let endGymInfos = process.hrtime(startGymInfos);
            logger.info("[Digest] Forts Detail Count: " + gymInfos.length + " parsed in " + endGymInfos + "s");
        }
    }
    async consumeQuests(quests: any[]) {
        if (quests.length > 0) {
            let startQuests = process.hrtime();
            for (let i = 0; i < quests.length; i++) {
                let quest = quests[i];
                let pokestop: Pokestop;
                try {
                    pokestop = await Pokestop.getById(quest.fort_id, false, true);
                } catch (err) {
                    pokestop = null;
                }
                if (pokestop) {
                    pokestop.addQuest(quest);
                    await pokestop.save();
                }
            }
            let endQuests = process.hrtime(startQuests);
            logger.info("[Digest] Quest Count: " + quests.length + " parsed in " + endQuests + "s");
        }
    }
    async consumeEncounters(encounters: any[], username: string) {
        if (encounters.length > 0) {
            let startEncounters = process.hrtime();
            for (let i = 0; i < encounters.length; i++) {
                let encounter = encounters[i];
                let pokemon: Pokemon;
                try {
                    pokemon = await Pokemon.getById(encounter.wild_pokemon.encounter_id);
                } catch (err) {
                    pokemon = null;
                }
                if (pokemon) {
                    await pokemon.addEncounter(encounter, username);
                    await pokemon.save(true);
                } else {
                    let centerCoord = new S2.S2Point(encounter.wild_pokemon.latitude, encounter.wild_pokemon.longitude, 0);
                    let center = S2.S2LatLng.fromPoint(centerCoord);
                    let centerNormalized = center.normalized();
                    let centerNormalizedPoint = centerNormalized.toPoint();
                    let circle = new S2.S2Cap(centerNormalizedPoint, 0.0);
                    let coverer = new S2.S2RegionCoverer();
                    coverer.setMaxCells(1);
                    coverer.setMinLevel(15);
                    coverer.setMaxLevel(15);
                    let cellIds = coverer.getCoveringCells(circle);
                    let cellId = cellIds.pop();
                    if (cellId) {
                        let newPokemon = new Pokemon({
                            wild: encounter.wild_pokemon.data,
                            username: username,
                            cellId: cellId,
                            timestampMs: encounter.wild_pokemon.timestamp_ms
                        });
                        await newPokemon.addEncounter(encounter, username);
                        await newPokemon.save(true);
                    }
                }
            }
            let endEncounters = process.hrtime(startEncounters);
            logger.info("[Digest] Encounter Count: " + encounters.length + " parsed in " + endEncounters + "s");
        }
    }
    async updateAll() {
        await this.updateCells();
        await this.updatePokestops();
        await this.updateGyms();
        await this.updatePokemon();
    }
    async updateCells() {
        let redisCells = await Cache.instance.loadCells();
        if (redisCells === undefined || redisCells === null || redisCells.length === 0) {
            logger.error("[Cell] Failed to get CELL_LIST from redis cache.");
            return;
        }
        logger.info(`[Digest] [Cell] Digesting ${redisCells.length} Cells`);
        redisCells.forEach(async redisCell => {
            let exists = await Cell.getById(redisCell.id);
            let update = exists !== undefined && exists !== null;
            let sql = `
            INSERT INTO s2cell (id, level, center_lat, center_lon, updated)
            VALUES (?, ?, ?, ?, UNIX_TIMESTAMP())
            `;
            if (update) {
                sql += `
                ON DUPLICATE KEY UPDATE
                level=VALUES(level),
                center_lat=VALUES(center_lat),
                center_lon=VALUES(center_lon),
                updated=VALUES(updated)
                `;
            }
            let args = [redisCell.id, redisCell.level, redisCell.centerLat, redisCell.centerLon];
            await db.query(sql, args)
                .then(x => x)
                .catch(err => {
                    logger.error("[Cell] Error: " + err);
                    return null;
                });
        });
    }
    async updatePokestops() {
        let redisStops = await Cache.instance.loadPokestops();
        if (redisStops === undefined || redisStops === null || redisStops.length === 0) {
            logger.error("[Pokestop] Failed to get POKESTOP_LIST from redis cache.");
            return;
        }
        logger.info(`[Digest] [Pokestop] Digesting ${redisStops.length} Pokestops`);
        redisStops.forEach(async redisStop => {
            let updateQuest = redisStop.questType !== undefined && redisStop.questType !== null;
            let oldPokestop: Pokestop;
            try {
                oldPokestop = await Pokestop.getById(redisStop.id, true);
            } catch (err) {
                logger.error("Failed to get old Pokestop with id " + redisStop.id);
                oldPokestop = null;
            }
            
            let sql: string = "";
            let args = [];
            redisStop.updated = getCurrentTimestamp();
            if (oldPokestop === undefined || oldPokestop === null) {
                /*
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
                */
                sql = `
                    INSERT INTO pokestop (id, lat, lon, name, url, enabled, lure_expire_timestamp, last_modified_timestamp, quest_type, quest_timestamp, quest_target, quest_conditions, quest_rewards, quest_template, cell_id, lure_id, pokestop_display, incident_expire_timestamp, grunt_type, sponsor_id, updated, first_seen_timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
                `;
                args.push(redisStop.id.toString());
            } else {
                if (oldPokestop.cellId && (redisStop.cellId === undefined || redisStop.cellId === null)) {
                    redisStop.cellId = oldPokestop.cellId;
                }
                if (oldPokestop.name && (redisStop.name === undefined || redisStop.name === null)) {
                    redisStop.name = oldPokestop.name;
                }
                if (oldPokestop.url && (redisStop.url === undefined || redisStop.url === null)) {
                    redisStop.url = oldPokestop.url;
                }
                if (updateQuest && oldPokestop.questType && (redisStop.questType === undefined || redisStop.questType === null)) {
                    redisStop.questType = oldPokestop.questType;
                    redisStop.questTarget = oldPokestop.questTarget;
                    redisStop.questConditions = oldPokestop.questConditions;
                    redisStop.questRewards = oldPokestop.questRewards;
                    redisStop.questTimestamp = oldPokestop.questTimestamp;
                    redisStop.questTemplate = oldPokestop.questTemplate;
                }
                if (oldPokestop.lureId && (redisStop.lureId === undefined || redisStop.lureId === null)) {
                    redisStop.lureId = oldPokestop.lureId;
                }
                /*
                if (oldPokestop.lureExpireTimestamp || 0 < this.lureExpireTimestamp || 0) {
                    WebhookController.instance.addLureEvent(this);
                }
                if (oldPokestop.incidentExpireTimestamp || 0 < this.incidentExpireTimestamp || 0) {
                    WebhookController.instance.addInvasionEvent(this);
                }
                if (updateQuest && this.questTimestamp || 0 > oldPokestop.questTimestamp || 0) {
                    WebhookController.instance.addQuestEvent(this);
                }
                */
                
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

            args.push(redisStop.lat);
            args.push(redisStop.lon);
            args.push(redisStop.name || null);
            args.push(redisStop.url || null);
            args.push(redisStop.enabled);
            args.push(redisStop.lureExpireTimestamp || null);
            args.push(redisStop.lastModifiedTimestamp);
            if (updateQuest || oldPokestop === undefined || oldPokestop === null) {
                args.push(redisStop.questType);
                args.push(redisStop.questTimestamp);
                args.push(redisStop.questTarget);
                args.push(JSON.stringify(redisStop.questConditions));
                args.push(JSON.stringify(redisStop.questRewards));
                args.push(JSON.stringify(redisStop.questTemplate));
            }
            args.push(redisStop.cellId);
            args.push(redisStop.lureId || 0);
            args.push(redisStop.pokestopDisplay || null);
            args.push(redisStop.incidentExpireTimestamp || null);
            args.push(redisStop.gruntType || null);
            args.push(redisStop.sponsorId || null);
            if (oldPokestop) {
                args.push(redisStop.id);
            }
    
            await db.query(sql, args)
                .then(x => x)
                .catch(err => {
                    logger.error("[Digest] [Pokestop] Error: " + err);
                    return null;
                });
        });
    }
    async updateGyms() {
        let redisGyms = await Cache.instance.loadGyms();
        if (redisGyms === undefined || redisGyms === null || redisGyms.length === 0) {
            logger.error("[Gym] Failed to get GYM_LIST from redis cache.");
            return;
        }
        logger.info(`[Digest] [Gym] Digesting ${redisGyms.length} Gyms`);
        redisGyms.forEach(async redisGym => {
            let oldGym: Gym;
            try {
                oldGym = await Gym.getById(redisGym.id, true);
            } catch (err) {
                oldGym = null;
            }
    
            if (redisGym.raidIsExclusive && DbController.ExRaidBossId) {
                redisGym.raidPokemonId = DbController.ExRaidBossId;
                redisGym.raidPokemonForm = DbController.ExRaidBossForm || 0;
            }
            
            let sql: string = "";
            let args = [];
            redisGym.updated = getCurrentTimestamp();       
            if (oldGym === undefined || oldGym === null) {
                //WebhookController.instance.addGymEvent(this);
                //WebhookController.instance.addGymInfoEvent(this);
                let now = getCurrentTimestamp();
                let raidBattleTime = redisGym.raidBattleTimestamp || 0;
                let raidEndTime = redisGym.raidEndTimestamp || 0;
                
                /*
                if (raidBattleTime > now && this.raidLevel || 0 !== 0) {
                    WebhookController.instance.addEggEvent(this);
                } else if (raidEndTime > now && this.raidPokemonId || 0 !== 0) {
                    WebhookController.instance.addRaidEvent(this);
                } 
                */           
                sql = `
                    INSERT INTO gym (id, lat, lon, name, url, guarding_pokemon_id, last_modified_timestamp, team_id, raid_end_timestamp, raid_spawn_timestamp, raid_battle_timestamp, raid_pokemon_id, enabled, availble_slots, raid_level, ex_raid_eligible, in_battle, raid_pokemon_move_1, raid_pokemon_move_2, raid_pokemon_form, raid_pokemon_cp, raid_pokemon_gender, raid_is_exclusive, cell_id, total_cp, sponsor_id, updated, first_seen_timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
                `;
                args.push(redisGym.id);
            } else {
                if (oldGym.cellId && redisGym.cellId == null) {
                    redisGym.cellId = oldGym.cellId;
                }
                if (oldGym.name && (redisGym.name === undefined || redisGym.name === null)) {
                    redisGym.name = oldGym.name;
                }
                if (oldGym.url && (redisGym.url === undefined || redisGym.url === null)) {
                    redisGym.url = oldGym.url;
                }
                if (oldGym.raidIsExclusive && (redisGym.raidIsExclusive === undefined || redisGym.raidIsExclusive === null)) {
                    redisGym.raidIsExclusive = oldGym.raidIsExclusive;
                }
                /*
                if (oldGym.availableSlots !== this.availableSlots || oldGym!.teamId !== this.teamId || oldGym.inBattle !== this.inBattle) {
                    WebhookController.instance.addGymInfoEvent(this);
                } 
                */           
                if ((redisGym.raidEndTimestamp === undefined || redisGym.raidEndTimestamp === null) && oldGym.raidEndTimestamp) {
                    redisGym.raidEndTimestamp = oldGym.raidEndTimestamp;
                }            
                if ((redisGym.raidSpawnTimestamp && redisGym.raidSpawnTimestamp !== 0) &&
                    (
                        oldGym.raidLevel !== redisGym.raidLevel ||
                        oldGym.raidPokemonId !== redisGym.raidPokemonId ||
                        oldGym.raidSpawnTimestamp !== redisGym.raidSpawnTimestamp
                    )) {

                    /*
                    let now = getCurrentTimestamp();
                    let raidBattleTime = redisGym.raidBattleTimestamp || 0;
                    let raidEndTime = redisGym.raidEndTimestamp || 0;
                    if (raidBattleTime > now && this.raidLevel || 0 !== 0) {
                        WebhookController.instance.addEggEvent(this);
                    } else if (raidEndTime > now && this.raidPokemonId || 0 !== 0) {
                        WebhookController.instance.addRaidEvent(this);
                    }
                    */
                }
                
                sql = `
                    UPDATE gym
                    SET lat = ?, lon = ? , name = ? , url = ? , guarding_pokemon_id = ? , last_modified_timestamp = ? , team_id = ? , raid_end_timestamp = ? , raid_spawn_timestamp = ? , raid_battle_timestamp = ? , raid_pokemon_id = ? , enabled = ? , availble_slots = ? , updated = UNIX_TIMESTAMP(), raid_level = ?, ex_raid_eligible = ?, in_battle = ?, raid_pokemon_move_1 = ?, raid_pokemon_move_2 = ?, raid_pokemon_form = ?, raid_pokemon_cp = ?, raid_pokemon_gender = ?, raid_is_exclusive = ?, cell_id = ?, deleted = false, total_cp = ?, sponsor_id = ?
                    WHERE id = ?
                `;
            }
            
            args.push(redisGym.lat);
            args.push(redisGym.lon);
            args.push(redisGym.name);
            args.push(redisGym.url);
            args.push(redisGym.guardPokemonId);
            args.push(redisGym.lastModifiedTimestamp);
            args.push(redisGym.teamId);
            args.push(redisGym.raidEndTimestamp);
            args.push(redisGym.raidSpawnTimestamp);
            args.push(redisGym.raidBattleTimestamp);
            args.push(redisGym.raidPokemonId);
            args.push(redisGym.enabled);
            args.push(redisGym.availableSlots);
            args.push(redisGym.raidLevel);
            args.push(redisGym.exRaidEligible);
            args.push(redisGym.inBattle);
            args.push(redisGym.raidPokemonMove1);
            args.push(redisGym.raidPokemonMove2);
            args.push(redisGym.raidPokemonForm);
            args.push(redisGym.raidPokemonCp);
            args.push(redisGym.raidPokemonGender);
            args.push(redisGym.raidIsExclusive);
            args.push(redisGym.cellId);
            args.push(redisGym.totalCp);
            args.push(redisGym.sponsorId);
            if (oldGym) {
                args.push(redisGym.id);
            }
    
            await db.query(sql, args)
                .then(x => x)
                .catch(err => {
                    logger.error("[Digest] [Gym] Error: " + err);
                    return null;
                });
        });
    }
    async updatePokemon() {
        let redisPokemons = await Cache.instance.loadPokemon();
        if (redisPokemons === undefined || redisPokemons === null || redisPokemons.length === 0) {
            logger.error("[Pokemon] Failed to get POKMEON_LIST from redis cache.");
            return;
        }
        logger.info(`[Digest] [Pokemon] Digesting ${redisPokemons.length} Pokemon`);
        redisPokemons.forEach(async pokemon => {
            let bindFirstSeen: boolean;
            let bindChangedTimestamp: boolean;
            let updateIV = false; // TODO:

            pokemon.updated = getCurrentTimestamp();
            let oldPokemon: Pokemon;
            try {
                oldPokemon = await Pokemon.getById(pokemon.id);
            } catch (err) {
                oldPokemon = null;
            }
            let sql: string = "";
            let args = [];
            if (oldPokemon === null) {
                bindFirstSeen = false;
                bindChangedTimestamp = false;
                if (pokemon.expireTimestamp === undefined || pokemon.expireTimestamp === null) {
                    pokemon.expireTimestamp = getCurrentTimestamp() + DbController.PokemonTimeUnseen;
                }
                pokemon.firstSeenTimestamp = pokemon.updated;
                sql = `
                    INSERT INTO pokemon (id, pokemon_id, lat, lon, spawn_id, expire_timestamp, atk_iv, def_iv, sta_iv, move_1, move_2, cp, level, weight, size, display_pokemon_id, shiny, username, gender, form, weather, costume, pokestop_id, updated, first_seen_timestamp, changed, cell_id, expire_timestamp_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), ?, ?)
                `;
                args.push(pokemon.id.toString());
            } else {
                bindFirstSeen = true;
                pokemon.firstSeenTimestamp = oldPokemon.firstSeenTimestamp;
                if (pokemon.expireTimestamp === undefined || pokemon.expireTimestamp === null) {
                    let now = getCurrentTimestamp();
                    let oldExpireDate: number = oldPokemon.expireTimestamp;
                    if ((oldExpireDate - now) < DbController.PokemonTimeReseen) {
                        pokemon.expireTimestamp = getCurrentTimestamp() + DbController.PokemonTimeReseen;
                    } else {
                        pokemon.expireTimestamp = oldPokemon.expireTimestamp;
                    }
                }
                if (pokemon.expireTimestampVerified === false && oldPokemon.expireTimestampVerified) {
                    pokemon.expireTimestampVerified = oldPokemon.expireTimestampVerified;
                    pokemon.expireTimestamp = oldPokemon.expireTimestamp;
                }
                if (oldPokemon.pokemonId !== pokemon.pokemonId) {
                    if (oldPokemon.pokemonId !== Pokemon.DittoPokemonId) {
                        logger.info("[POKEMON] Pokemon " + pokemon.id + " changed from " + oldPokemon.pokemonId + " to " + pokemon.pokemonId);
                    } else if (oldPokemon.displayPokemonId || 0 !== pokemon.pokemonId) {
                        logger.info("[POKEMON] Pokemon " + pokemon.id + " Ditto diguised as " + (oldPokemon.displayPokemonId || 0) + " now seen as " + pokemon.pokemonId);
                    }
                }
                if (oldPokemon.cellId && (pokemon.cellId === undefined || pokemon.cellId === null)) {
                    pokemon.cellId = oldPokemon.cellId;
                }
                if (oldPokemon.spawnId && (pokemon.spawnId === undefined || pokemon.spawnId == null)) {
                    pokemon.spawnId = oldPokemon.spawnId;
                    pokemon.lat = oldPokemon.lat;
                    pokemon.lon = oldPokemon.lon;
                }
                if (oldPokemon.pokestopId && (pokemon.pokestopId === undefined || pokemon.pokestopId == null)) {
                    pokemon.pokestopId = oldPokemon.pokestopId;
                }

                let changedSQL: String
                if (updateIV && (oldPokemon.atkIv === undefined || oldPokemon.atkIv === null) && pokemon.atkIv) {
                    //WebhookController.instance.addPokemonEvent(this);
                    //InstanceController.instance.gotIV(this);
                    bindChangedTimestamp = false;
                    changedSQL = "UNIX_TIMESTAMP()";
                } else {
                    bindChangedTimestamp = true;
                    pokemon.changed = oldPokemon.changed;
                    changedSQL = "?";
                }

                if (updateIV && oldPokemon.atkIv && (pokemon.atkIv === undefined || pokemon.atkIv === null)) {
                    if (
                        !(((oldPokemon.weather === undefined || oldPokemon.weather === null) || oldPokemon.weather === 0) && (pokemon.weather || 0 > 0) ||
                            ((pokemon.weather === undefined || pokemon.weather === null) || pokemon.weather === 0) && (oldPokemon.weather || 0 > 0))
                    ) {
                        pokemon.atkIv = oldPokemon.atkIv;
                        pokemon.defIv = oldPokemon.defIv;
                        pokemon.staIv = oldPokemon.staIv;
                        pokemon.cp = oldPokemon.cp;
                        pokemon.weight = oldPokemon.weight;
                        pokemon.size = oldPokemon.size;
                        pokemon.move1 = oldPokemon.move1;
                        pokemon.move2 = oldPokemon.move2;
                        pokemon.level = oldPokemon.level;
                        pokemon.shiny = oldPokemon.shiny;
                        pokemon.isDitto = Pokemon.isDittoDisguisedFromPokemon(oldPokemon);
                        if (pokemon.isDitto) {
                            logger.info("[POKEMON] oldPokemon " + pokemon.id + " Ditto found, disguised as " + pokemon.pokemonId);
                            pokemon.setDittoAttributes(pokemon.pokemonId);
                        }
                    }
                }

                let shouldWrite: boolean = Pokemon.shouldUpdate(oldPokemon, pokemon);
                if (!shouldWrite) {
                    return;
                }

                let ivSQL: String
                if (updateIV) {
                    ivSQL = "atk_iv = ?, def_iv = ?, sta_iv = ?, move_1 = ?, move_2 = ?, cp = ?, level = ?, weight = ?, size = ?, shiny = ?, display_pokemon_id = ?,";
                } else {
                    ivSQL = "";
                }

                if (oldPokemon.pokemonId === Pokemon.DittoPokemonId && pokemon.pokemonId !== Pokemon.DittoPokemonId) {
                    logger.info("[POKEMON] Pokemon " + pokemon.id + " Ditto changed from " + oldPokemon.pokemonId + " to " + pokemon.pokemonId);
                }
                sql = `
                UPDATE pokemon
                SET pokemon_id = ?, lat = ?, lon = ?, spawn_id = ?, expire_timestamp = ?, ${ivSQL} username = ?, gender = ?, form = ?, weather = ?, costume = ?, pokestop_id = ?, updated = UNIX_TIMESTAMP(), first_seen_timestamp = ?, changed = ${changedSQL}, cell_id = ?, expire_timestamp_verified = ?
                WHERE id = ?
                `;
            }

            args.push(pokemon.pokemonId);
            args.push(pokemon.lat);
            args.push(pokemon.lon);
            args.push(pokemon.spawnId || null);
            args.push(pokemon.expireTimestamp);
            if (updateIV || (oldPokemon === undefined || oldPokemon === null)) {
                args.push(pokemon.atkIv || null);
                args.push(pokemon.defIv || null);
                args.push(pokemon.staIv || null);
                args.push(pokemon.move1 || null);
                args.push(pokemon.move2 || null);
                args.push(pokemon.cp || null);
                args.push(pokemon.level || null);
                args.push(pokemon.weight || null);
                args.push(pokemon.size || null);
                args.push(pokemon.shiny || null);
                args.push(pokemon.displayPokemonId || null);
            } else {
                args.push(pokemon.atkIv || null);
                args.push(pokemon.defIv || null);
                args.push(pokemon.staIv || null);
                args.push(pokemon.move1 || null);
                args.push(pokemon.move2 || null);
                args.push(pokemon.cp || null);
                args.push(pokemon.level || null);
                args.push(pokemon.weight || null);
                args.push(pokemon.size || null);
                args.push(pokemon.shiny || null);
                args.push(pokemon.displayPokemonId || null);
            }
            args.push(pokemon.username || null);
            args.push(pokemon.gender || 0);
            args.push(pokemon.form || 0);
            args.push(pokemon.weather || 0);
            args.push(pokemon.costume || 0);
            args.push(pokemon.pokestopId || null);
            if (bindFirstSeen) {
                args.push(pokemon.firstSeenTimestamp);
            }
            if (bindChangedTimestamp) {
                args.push(pokemon.changed);
            }
            args.push(pokemon.cellId || null);
            args.push(pokemon.expireTimestampVerified);
            if (oldPokemon) {
                args.push(pokemon.id);
            }
            if (pokemon.spawnId) {
                let spawnpoint: Spawnpoint;
                if (pokemon.expireTimestampVerified && pokemon.expireTimestamp) {
                    let date = moment(pokemon.expireTimestamp).format('mm:ss');
                    let split = date.split(':');
                    let minute = parseInt(split[0]);
                    let second = parseInt(split[1]);
                    let secondOfHour = second + minute * 60;
                    spawnpoint = new Spawnpoint({
                        id: pokemon.spawnId,
                        lat: pokemon.lat,
                        lon: pokemon.lon,
                        updated: pokemon.updated,
                        despawn_sec: secondOfHour
                    });
                } else {
                    spawnpoint = new Spawnpoint({
                        id: pokemon.spawnId,
                        lat: pokemon.lat,
                        lon: pokemon.lon,
                        updated: pokemon.updated,
                        despawn_sec: null
                    });
                }
                try {
                    await spawnpoint.save(true);
                } catch (err) {
                    logger.error(err);
                }
            }

            if (pokemon.lat === undefined && pokemon.pokestopId) {
                if (pokemon.pokestopId) {
                    let pokestop: Pokestop;
                    try {
                        pokestop = await Pokestop.getById(pokemon.pokestopId);
                    } catch (err) {
                        logger.error(err);
                    }
                    if (pokestop) {
                        pokemon.lat = pokestop.lat;
                        pokemon.lon = pokestop.lon;
                        if (oldPokemon) {
                            args[1] = pokemon.lat;
                            args[2] = pokemon.lon;
                        } else {
                            args[2] = pokemon.lat;
                            args[3] = pokemon.lon;
                        }
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            }

            // TODO: Error: ER_NO_REFERENCED_ROW_2: Cannot add or update a child row: a foreign key constraint fails (`rdmdb`.`pokemon`, CONSTRAINT `fk_pokemon_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE)
            await db.query(sql, args)
                .then(x => x)
                .catch(err => {
                    //logger.info("[Pokemon] SQL: " + sql);
                    //logger.info("[Pokemon] Arguments: " + args);
                    logger.error("[Pokemon] Error: " + err);
                    return null;
                });
        });
    }
}

// Export class.
export { Digest };