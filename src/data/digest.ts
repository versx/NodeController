"use strict";

import * as S2 from 'nodes2ts';
import { Cell } from '../models/cell';
import { Gym } from '../models/gym';
import { Pokestop } from '../models/pokestop';
import { Pokemon } from '../models/pokemon';
import { Weather } from '../models/weather';
import { logger } from '../utils/logger';
import { getCurrentTimestamp } from '../utils/util';

/**
 * 
 */
class Digest {
    private gymIdsPerCell: Map<number, string[]>;
    private stopsIdsPerCell: Map<number, string[]>;

    constructor() {
        this.gymIdsPerCell = new Map<number, string[]>();
        this.stopsIdsPerCell = new Map<number, string[]>();
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
}

// Export class.
export { Digest };