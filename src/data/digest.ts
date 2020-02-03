"use strict";

import * as S2 from 'nodes2ts';
import { Cell } from "../models/cell";
import { Gym } from "../models/gym";
import { Pokestop } from "../models/pokestop";
import { Pokemon } from "../models/pokemon";
import { Weather } from "../models/weather";
import { getCurrentTimestamp } from "../utils/util";

class Digest {
    gymIdsPerCell: Map<number, string[]>;
    stopsIdsPerCell: Map<number, string[]>;

    constructor() {
        this.gymIdsPerCell = new Map<number, string[]>();
        this.stopsIdsPerCell = new Map<number, string[]>();
    }
    consumeCells(cells: any[]) {
        if (cells.length > 0) {
            cells.forEach(async cellId => {
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
                    console.error(err);
                }
                //client.addCell(cell);
                
                if (this.gymIdsPerCell[cellId] === undefined) {
                    this.gymIdsPerCell[cellId] = [];
                }
                if (this.stopsIdsPerCell[cellId] === undefined) {
                    this.stopsIdsPerCell[cellId] = [];
                } 
            });
        }
    }
    consumeClientWeather(clientWeathers: any[]) {
        if (clientWeathers.length > 0) {
            let startClientWeathers = process.hrtime();
            clientWeathers.forEach(async conditions => {
                try {
                    //console.log("Parsed weather", conditions);
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
                    //client.addWeather(weather);
                } catch (err) {
                    console.error(err);
                }
            });
            let endClientWeathers = process.hrtime(startClientWeathers);
            console.info("[] Weather Detail Count: " + clientWeathers.length + " parsed in " + endClientWeathers + "s");
        }
    }
    consumeWildPokemon(wildPokemons: any[], username: string) {
        if (wildPokemons.length > 0) {
            let startWildPokemon = process.hrtime();
            wildPokemons.forEach(async wildPokemon => {
                try {
                    let pokemon = new Pokemon({
                        username: username,
                        cellId: wildPokemon.cell,
                        timestampMs: wildPokemon.timestampMs,
                        wild: wildPokemon.data
                    });
                    await pokemon.save();
                    //client.addPokemon(pokemon);
                } catch (err) {
                    console.error(err);
                }
            });
            let endWildPokemon = process.hrtime(startWildPokemon);
            console.info("[] Pokemon Count: " + wildPokemons.length + " parsed in " + endWildPokemon + "s");
        }
    }
    consumeNearbyPokemon(nearbyPokemons: any[], username: string) {
        if (nearbyPokemons.length > 0) {
            let startNearbyPokemon = process.hrtime();
            nearbyPokemons.forEach(async nearbyPokemon => {
                try {
                    let pokemon = new Pokemon({
                        username: username,
                        cellId: nearbyPokemon.cell,
                        //timestampMs: nearbyPokemon.timestamp_ms,
                        nearby: nearbyPokemon.data
                    });
                    await pokemon.save();
                    //client.addPokemon(pokemon);
                } catch (err) {
                    console.error(err);
                }
            });
            let endNearbyPokemon = process.hrtime(startNearbyPokemon);
            console.info("[] NearbyPokemon Count: " + nearbyPokemons.length + " parsed in " + endNearbyPokemon + "s");
        }
    }
    consumeForts(forts: any[]) {
        if (forts.length > 0) {
            let startForts = process.hrtime();
            forts.forEach(async fort => {
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
                            this.gymIdsPerCell[fort.cell].push(fort.data.id);
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
                            this.stopsIdsPerCell[fort.cell].push(fort.data.id);
                            break;
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            let endForts = process.hrtime(startForts);
            console.info("[] Forts Count: " + forts.length + " parsed in " + endForts + "s");
        }
    }
    consumeFortDetails(fortDetails: any[]) {
        if (fortDetails.length > 0) {
            let startFortDetails = process.hrtime();
            fortDetails.forEach(async fort => {
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
            });
            let endFortDetails = process.hrtime(startFortDetails);
            console.info("[] Forts Detail Count: " + fortDetails.length + " parsed in " + endFortDetails + "s");
        }
    }
    consumeGymInfos(gymInfos: any[]) {
        if (gymInfos.length > 0) {
            let startGymInfos = process.hrtime();
            gymInfos.forEach(async gymInfo => {
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
            });
            let endGymInfos = process.hrtime(startGymInfos);
            console.info("[] Forts Detail Count: " + gymInfos.length + " parsed in " + endGymInfos + "s");
        }
    }
    consumeQuests(quests: any[]) {
        if (quests.length > 0) {
            let startQuests = process.hrtime();
            quests.forEach(async quest => {
                let pokestop: Pokestop;
                try {
                    pokestop = await Pokestop.getById(quest.fort_id);
                } catch (err) {
                    pokestop = null;
                }
                if (pokestop) {
                    pokestop.addQuest(quest);
                    await pokestop.save();
                }
            });
            let endQuests = process.hrtime(startQuests);
            console.info("[] Quest Count: " + quests.length + " parsed in " + endQuests + "s");
        }
    }
    consumeEncounters(encounters: any[], username: string) {
        if (encounters.length > 0) {
            let startEncounters = process.hrtime();
            encounters.forEach(async encounter => {
                let pokemon: Pokemon;
                try {
                    pokemon = await Pokemon.getById(encounter.wild_pokemon.encounter_id);
                } catch (err) {
                    pokemon = null;
                }
                if (pokemon) {
                    await pokemon.addEncounter(encounter, username);
                    await pokemon.save(true);
                    //client.addPokemon(pokemon);
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
            });
            let endEncounters = process.hrtime(startEncounters);
            console.info("[] Encounter Count: " + encounters.length + " parsed in " + endEncounters + "s");
        }
    }
}

export { Digest };