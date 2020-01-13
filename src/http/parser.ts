"use strict"

const POGOProtos  = require('../../pogo-protos');
const S2          = require('nodes2ts');

import { Account } from '../models/account';
import { Device } from '../models/device';
import { Pokemon } from '../models/pokemon';
import { Gym } from '../models/gym';
import { Pokestop } from '../models/pokestop';
import { S2Cell } from '../models/s2cell';
import { Weather } from '../models/weather';
import { RedisClient } from '../redis-client';
import { InstanceController } from '../controllers/instance-controller';

const client = new RedisClient();

let accounts = Account.getAll();
let devices = Device.getAll();

let emptyCells = [];//[UInt64: Int]
let levelCache = {};

/**
 * Webhook request handler class.
 */
class WebhookHandler {
    /**
     * Initialize new WebhookHandler object.
     */
    constructor(){
        //setTimeout(distributeConsumables, timerInterval);
    }
    /**
     * Handle raw API data.
     * @param req 
     * @param res 
     */
    handleRawData(req, res) {
        _handleRawData(req, res);
    }
    /**
     * Handle device controller data.
     * @param req 
     * @param res 
     */
    handleControllerData(req, res) {
        _handleControllerData(req, res);
    }
}

/**
 * Handles the raw data endpoint.
 * @param {*} req 
 * @param {*} res 
 */
function _handleRawData(req, res) {
    let jsonOpt: any = {};
    try {
        jsonOpt = JSON.parse(req.body);
        //console.log("HandleRawData Parsed:", jsonOpt);
    } catch (e) {
        console.log(e);
        return res.status(400).end();
    }
    if (jsonOpt === undefined) {
        console.log("Bad data");
        return res.status(400).end();
    }
    if (jsonOpt['payload'] !== undefined) {
        jsonOpt['contents'] = [jsonOpt];
    }

    let json = jsonOpt;
    let trainerLevel = parseInt(json["trainerlvl"] || json["trainerLevel"]) || 0;
    let username = json["username"];
    if (username !== false && trainerLevel > 0) {
        let oldLevel = levelCache[username];
        if (oldLevel !== trainerLevel) {
            let account = accounts[username];
            if (account !== undefined) {
                account.level = trainerLevel;
                account.save();
            }
            levelCache[username] = trainerLevel
        }
    }
    let contents: any = json["contents"] || json["protos"] || json["gmo"];
    if (contents === undefined) {
        console.log("Invalid GMO");
        return res.status(400).end();
    }
    var uuid: string = json["uuid"];
    let latTarget: number = json["lat_target"];
    let lonTarget: number = json["lon_target"];
    if (uuid !== undefined && latTarget !== undefined && lonTarget !== undefined) {
        var newDevice = new Device(uuid, null, username, "127.0.0.1", new Date().getUTCSeconds(), latTarget, lonTarget);
        newDevice.save();
    }

    let pokemonEncounterId = json["pokemon_encounter_id"];
    let pokemonEncounterIdForEncounter = json["pokemon_encounter_id_for_encounter"];
    let targetMaxDistance = json["target_max_distnace"] || 250;

    let wildPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_WildPokemon, timestampMs: UInt64}]
    let nearbyPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_NearbyPokemon}]
    let clientWeathers = []; //[{cell: Int64, data: POGOProtos_Map_Weather_ClientWeather}]
    let forts = []; //[{cell: UInt64, data: POGOProtos_Map_Fort_FortData}]
    let fortDetails = []; //[POGOProtos_Networking_Responses_FortDetailsResponse]
    let gymInfos = []; //[POGOProtos_Networking_Responses_GymGetInfoResponse]
    let quests = []; //[POGOProtos_Data_Quests_Quest]
    let encounters = []; //[POGOProtos_Networking_Responses_EncounterResponse]
    let cells = []; //[UInt64]

    let isEmptyGMO = true;
    let isInvalidGMO = true;
    let containsGMO = false;
    let isMadData = false;

    if (contents === undefined) {
        console.log("Contents is empty");
        res.send("Contents is empty");
        return res.status(400).end();
    }

    contents.forEach(function(rawData) {
        let data: any;
        let method: number;
        let invalid = false;
        if (rawData["GetMapObjects"] !== undefined) {
            data = rawData["GetMapObjects"];
            method = 106;
        } else if (rawData["EncounterResponse"] !== undefined) {
            data = rawData["EncounterResponse"];
            method = 102;
        } else if (rawData["FortDetailsResponse"] !== undefined) {
            data = rawData["FortDetailsResponse"];
            method = 104;
        } else if (rawData["FortSearchResponse"] !== undefined) {
            data = rawData["FortSearchResponse"];
            method = 101;
        } else if (rawData["GymGetInfoResponse"] !== undefined) {
            data = rawData["GymGetInfoResponse"];
            method = 156;
        } else if (rawData["data"] !== undefined) {
            data = rawData["data"];
            method = parseInt(rawData["method"]) || 106;
        } else if (rawData["payload"] !== undefined) {
            data = rawData["payload"];
            method = parseInt(rawData["type"]) || 106;
            isMadData = true;
            username = "PogoDroid";
        } else {
            invalid = true;
        }

        if (invalid !== false) {
            console.log("Invalid data");
            return res.status(400).end();
        }

        switch (method) {
            case 101: // FortSearchResponse
                let fsr = POGOProtos.Networking.Responses.FortSearchResponse.decode(base64_decode(data));
                if (fsr) {
                    if (fsr.hasChallengeQuest && fsr.challengeQuest.hasQuest) {
                        let quest = fsr.challengeQuest.quest;
                        quests.push(quest);
                    }
                } else {
                    console.log("[WebhookRequestHandler] Malformed FortSearchResponse");
                }
                break;
            case 102: // EncounterResponse
                if (trainerLevel >= 0 || isMadData !== false) { //TODO: Set trainerLevel >= 30
                    let er = POGOProtos.Networking.Responses.EncounterResponse.decode(base64_decode(data));
                    if (er) {
                        encounters.push(er);
                    } else {
                        console.log("[WebhookRequestHandler] Malformed EncounterResponse");
                    }
                }
                break;
            case 104: // FortDetailsResponse
                let fdr = POGOProtos.Networking.Responses.FortDetailsResponse.decode(base64_decode(data));
                if (fdr) {
                    fortDetails.push(fdr);
                } else {
                    console.log("[WebhookRequestHandler] Malformed FortDetailsResponse");
                }
                break;
            case 156: // GymGetInfoResponse
                let ggi = POGOProtos.Networking.Responses.GymGetInfoResponse.decode(base64_decode(data));
                if (ggi) {
                    gymInfos.push(ggi);
                } else {
                    console.log("[WebhookRequestHandler] Malformed GymGetInfoResponse");
                }
                break;
            case 106: // GetMapObjectsResponse
                containsGMO = true;
                let gmo = POGOProtos.Networking.Responses.GetMapObjectsResponse.decode(base64_decode(data));
                if (gmo) {
                    isInvalidGMO = false;
                    
                    let newWildPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_WildPokemon, timestampMs: UInt64}];
                    let newNearbyPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_NearbyPokemon}];
                    let newClientWeathers = []; //[{cell: Int64, data: POGOProtos_Map_Weather_ClientWeather}];
                    let newForts = []; //[{cell: UInt64, data: POGOProtos_Map_Fort_FortData}];
                    let newCells = []; //[UInt64];

                    let mapCellsNew = gmo.map_cells;
                    if (mapCellsNew.length === 0) {
                        console.log("Map cells is empty");
                        return res.status(400).end();
                    }
                    mapCellsNew.forEach(function(mapCell) {
                        let timestampMs = mapCell.current_timestamp_ms;
                        let wildNew = mapCell.wild_pokemons;
                        wildNew.forEach(function(wildPokemon) {
                            wildPokemons.push({
                                cell: mapCell.s2_cell_id,
                                data: wildPokemon,
                                timestampMs: timestampMs
                            });
                        });
                        let nearbyNew = mapCell.nearby_pokemons;
                        nearbyNew.forEach(function(nearbyPokemon) {
                            nearbyPokemons.push({
                                cell: mapCell.s2_cell_id,
                                data: nearbyPokemon
                            });
                        });
                        let fortsNew = mapCell.forts;
                        fortsNew.forEach(function(fort) {
                            forts.push({
                                cell: mapCell.s2_cell_id,
                                data: fort
                            });
                        });
                        cells.push(mapCell.s2_cell_id);
                    });
    
                    let weather = gmo.client_weather;
                    weather.forEach(function(wmapCell) {
                        clientWeathers.push({
                            cell: wmapCell.s2_cell_id,
                            data: wmapCell
                        });
                    });
    
                    if (wildPokemons.length === 0 && nearbyPokemons.length === 0 && forts.length === 0) {
                        newCells.forEach(function(cell) {
                            let count = emptyCells[cell];
                            if (count === undefined) {
                                emptyCells[cell] = 1;
                            } else {
                                emptyCells[cell] = count + 1;
                            }
                            if (count === 3) {
                                console.log("[WebhookRequestHandler] Cell", cell, "was empty 3 times in a row. Asuming empty.");
                                cells.push(cell);
                            }
                        });
                        
                        console.log("[WebhookRequestHandler] GMO is empty.");
                    } else {
                        newCells.forEach(function(cell) {
                            emptyCells[cell] = 0;
                        });
                        isEmptyGMO = false;
                    }
                } else {
                    console.log("[WebhookRequestHandler] Malformed GetMapObjectsResponse");
                }
                break;
        }
    });

    let targetCoord: { latitude: any; longitude: any; };
    let inArea = false
    if (latTarget !== undefined && lonTarget !== undefined) {
        targetCoord = { latitude: latTarget, longitude: lonTarget };
    } else {
        targetCoord = null;
    }
    
    let pokemonCoords: { latitude: any; longitude: any; };
    
    if (targetCoord !== null) {
        if (forts !== undefined) {
            forts.forEach(function(fort) {
                if (inArea === false) {
                    //let coord = CLLocationCoordinate2D(latitude: fort.data.latitude, longitude: fort.data.longitude)
                    let coord = { latitude: fort.data.latitude, longitude: fort.data.longitude };
                    // TODO: if (coord.distance(to: targetCoord) <= targetMaxDistance) {
                        inArea = true
                    //}
                }
            });
        }
    }
    if (targetCoord !== undefined || pokemonEncounterId !== undefined) {
        wildPokemons.forEach(function(pokemon) {
            if (targetCoord !== undefined) {
                if (inArea === false) {
                    //let coord = CLLocationCoordinate2D(latitude: pokemon.data.latitude, longitude: pokemon.data.longitude)
                    let coord = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
                    //TODO: if (coord.distance(to: targetCoord) <= targetMaxDistance) {
                        inArea = true
                    //}
                } else if (pokemonCoords !== undefined && inArea) {
                    //break;
                }
            }
            if (pokemonEncounterId !== undefined) {
                if (pokemonCoords === undefined) {
                    if (pokemon.data.encounter_id == pokemonEncounterId) {
                        //pokemonCoords = CLLocationCoordinate2D(latitude: pokemon.data.latitude, longitude: pokemon.data.longitude)
                        pokemonCoords = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
                    }
                } else if (pokemonCoords !== undefined && inArea) {
                    //break;
                }
            }
        });
    }
    if (targetCoord !== undefined && inArea === false) {
        cells.forEach(function(cell) {
            if (inArea === false) {
                var s2cellId = new S2.S2CellId(cell.toString());
                let s2cell = new S2Cell(s2cellId);
                //let coord = new S2.S2LatLng(s2cell.getCenter()).coord
                //if (coord.getDistance(targetCoord) <= max(targetMaxDistance, 100)) {
                    inArea = true
                //}
            }
        });
    }

    let data = {
        "nearby": nearbyPokemons.length,
        "wild": wildPokemons.length,
        "forts": forts.length,
        "quests": quests.length,
        "encounters": encounters.length,
        "level": trainerLevel,
        "only_empty_gmos": containsGMO && isEmptyGMO,
        "only_invalid_gmos": containsGMO && isInvalidGMO,
        "contains_gmos": containsGMO
    };

    if (pokemonEncounterIdForEncounter !== undefined) {
        //If the UIC sets pokemon_encounter_id_for_encounter,
        //only return encounters != 0 if we actually encounter that target.
        //"Guaranteed scan"
        data["encounters"] = 0;
        encounters.forEach(function(encounter) {
            if (encounter.wild_pokemon.encounter_id === pokemonEncounterIdForEncounter){
                //We actually encountered the target.
                data["encounters"] = 1;
            }
        });
    }
    
    if (latTarget !== undefined && lonTarget !== undefined) {
        data["in_area"] = inArea
        data["lat_target"] = latTarget
        data["lon_target"] = lonTarget
    }
    if (pokemonCoords !== undefined && pokemonEncounterId !== undefined) {
        data["pokemon_lat"] = pokemonCoords.latitude
        data["pokemon_lon"] = pokemonCoords.longitude
        data["pokemon_encounter_id"] = pokemonEncounterId
    }


    let listScatterPokemon = json["list_scatter_pokemon"];
    if (listScatterPokemon && pokemonCoords != undefined && pokemonEncounterId != undefined) {
        let uuid: string = json["uuid"];
        let controller = InstanceController.instance.getInstanceController(uuid); // TODO: Cast to IVInstanceController
        let scatterPokemon = [];

        wildPokemons.forEach(function(pokemon) {
            //Don't return the main query in the scattershot list
            if (pokemon.data.encounter_id === pokemonEncounterId) {
                return;
            }
            
            try {
                let oldPokemon = Pokemon.getById(pokemon.data.encounter_id);
                if (oldPokemon !== undefined && oldPokemon.atkIv !== undefined) {
                    //Skip going to mons already with IVs.
                    return;
                }
            } catch {}
            
            let coords = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
            let distance = 35; // TODO: pokemonCoords.distance(to: coords)
            
            // Only Encounter pokemon within 35m of initial pokemon scann
            let pokemonId: number = parseInt(pokemon.data.pokemon_data.pokemon_id);
            if (controller) {
                if (distance <= 35 && controller.scatterPokemon.contains(pokemonId)) {
                    scatterPokemon.push({
                        lat: pokemon.data.latitude,
                        lon: pokemon.data.longitude,
                        id: pokemon.data.encounterID.description
                    });
                }
            }
        });

        data["scatter_pokemon"] = scatterPokemon;
    }

    console.log("Sending response to device:", data);
    res.send(data);

    handleConsumables(
        cells,
        clientWeathers,
        wildPokemons,
        nearbyPokemons, 
        forts,
        fortDetails,
        gymInfos,
        quests,
        encounters,
        username
    );
}

/**
 * Handles the controller endpoint.
 * @param {*} req 
 * @param {*} res 
 */
function _handleControllerData(req, res) {
    let jsonO = {};
    try {
        jsonO = JSON.parse(req.body);
        //console.log("HandleControllerData Parsed:", jsonO);
    } catch (e) {
        console.log(e);
        return res.status(400).end();
    }
    let typeO = jsonO["type"];
    let uuidO = jsonO["uuid"];
    if (typeO === undefined || uuidO === undefined) {
        console.log("Failed to parse controller data");
        return res.status(400).end();
    }
    let type = typeO;
    var uuid = uuidO;
    var username = jsonO["username"];
    let minLevel = parseInt(jsonO["min_level"] || 0);
    let maxLevel = parseInt(jsonO["max_level"] || 29);

    switch (type) {
        case "init":
            //TODO: TryCatch
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var firstWarningTimestamp = null;
                if (device === undefined || device.accountUsername === undefined) {
                    firstWarningTimestamp = null;
                } else {
                    let account = accounts[device.accountUsername];
                    if (account !== undefined) {
                        firstWarningTimestamp = account.firstWarningTimestamp;
                    } else {
                        firstWarningTimestamp = null;
                    }
                }
                if (device instanceof Device) {
                    // Device is already registered
                    console.log("Device registered");
                    res.send({
                        data: {
                            assigned: device.instanceName !== undefined,
                            first_warning_timestamp: firstWarningTimestamp
                        }
                    });
                } else {
                    // Register new device
                    console.log("Registering device");
                    let newDevice = new Device(uuid, null, null, null, 0, 0.0, 0.0);
                    newDevice.create();
                    devices[uuid] = newDevice;
                    res.send({ 
                        data: { 
                            assigned: false,
                            first_warning_timestamp: firstWarningTimestamp
                        }
                    });
                }
            });
            break;
        case "heartbeat":
            // TODO: heartbeat
            res.send('OK');
            break;
        case "get_job":
            /*
            let controller = InstanceController.instance.getInstanceController(uuid);
            if (controller !== null) {
            */
                try {
                    res.send({
                        data: /*controller.*/getTask(uuid, username)
                    });
                } catch (err) {
                    res.status(404);
                    res.end();
                }
            /*
            } else {
                res.status(404);
                res.end();
            }
            */
            break;
        case "get_account":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var account = Account.getNewAccount(minLevel, maxLevel);// randomValue(accounts); // TODO: Get new account from level restrictions
                console.log("GetAccount:", account);
                account.then(x => {
                    console.log("Random Account:", x);
                    if (device === undefined || x === undefined) {
                        console.log("Failed to get account, device or account is null.");
                        return res.status(400).end();
                    }
                    if (device.accountUsername !== undefined) {
                        let oldAccount = accounts[device.accountUsername];
                        if (oldAccount instanceof Account && oldAccount.firstWarningTimestamp === undefined && oldAccount.failed === undefined && oldAccount.failedTimestamp === undefined) {
                            res.send({
                                data: {
                                    username: oldAccount.username,
                                    password: oldAccount.password,
                                    first_warning_timestamp: oldAccount.firstWarningTimestamp,
                                    level: oldAccount.level
                                }
                            });
                            return;
                        }
                    }

                    device.accountUsername = x.username;
                    device.save(device.uuid);
                    res.send({
                        data: {
                            username: x.username,
                            password: x.password,
                            first_warning_timestamp: x.firstWarningTimestamp,
                            level: x.level
                        }
                    });
                });
            });
            break;
        case "tutorial_done":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var username = device.accountUsername;
                var account = accounts[username];
                if (device === undefined || account === undefined) {
                    console.log("Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.level === 0) {
                    account.level = 1;
                    account.save();
                    res.send('OK');
                }
            });
            break;
        case "account_banned":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var username = device.accountUsername;
                var account = accounts[username];
                if (device === undefined || account === undefined) {
                    console.log("Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = new Date().getUTCSeconds();
                    account.failed = "banned";
                    account.save();
                    res.send('OK');
                }
            });
            break;
        case "account_warning":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var username = device.accountUsername;
                var account = accounts[username];
                if (device === undefined || account === undefined) {
                    console.log("Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.firstWarningTimestamp === undefined) {
                    account.firstWarningTimestamp = new Date().getUTCSeconds();
                    account.save();
                    res.send('OK');
                }
            });
            break;
        case "account_invalid_credentials":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var username = device.accountUsername;
                var account = accounts[username];
                if (device === undefined || account === undefined) {
                    console.log("Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = new Date().getUTCSeconds();
                    account.failed = "invalid_credentials";
                    account.save();
                    res.send('OK');
                }
            });
            break;
        case "error_26":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                var username = device.accountUsername;
                var account = accounts[username];
                if (device === undefined || account === undefined) {
                    console.log("Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = new Date().getUTCSeconds();
                    account.failed = "error_26";
                    account.save();
                    res.send('OK');
                }
            });
            break;
        case "logged_out":
            devices.then(x => {
                var device = x.find(x => { return x.uuid === uuid; });
                device.accountUsername = null;
                device.save(device.uuid);
                res.send('OK');
            });
            break;
        default:
            console.log("[WebhookRequestHandler] Unhandled Request:", type);
            break;
    }
}

/**
 * Handle data consumables.
 * @param cells 
 * @param clientWeathers 
 * @param wildPokemons 
 * @param nearbyPokemons 
 * @param forts 
 * @param fortDetails 
 * @param gymInfos 
 * @param quests 
 * @param encounters 
 * @param username 
 */
function handleConsumables(cells, clientWeathers, wildPokemons, nearbyPokemons, forts, fortDetails, gymInfos, quests, encounters, username) {
    //let queue = Threading.getQueue(name: Foundation.UUID().uuidString, type: .serial)
    //queue.dispatch {

        let gymIdsPerCell = []; //[UInt64: [String]]
        let stopsIdsPerCell = []; //[UInt64: [String]]
        
        cells.forEach(cellId => {
            let s2cell = new S2.S2Cell(new S2.S2CellId(cellId.toString()));
            let lat = s2cell.getCapBound().getRectBound().getCenter().latDegrees;
            let lon = s2cell.getCapBound().getRectBound().getCenter().lngDegrees;
            let level = s2cell.level;
            let cell = new S2Cell({
                id: cellId.toString(),
                level: level,
                lat: lat,
                lon: lon,
                updated: new Date().getUTCSeconds()
            });
            //cell.save();
            client.addCell(cell);
            
            if (gymIdsPerCell[cellId] === undefined) {
                gymIdsPerCell[cellId] = [];
            }
            if (stopsIdsPerCell[cellId] === undefined) {
                stopsIdsPerCell[cellId] = [];
            } 
        });

        let startClientWeathers = process.hrtime();
        clientWeathers.forEach(conditions => {
            //console.log("Parsed weather", conditions);
            let ws2cell = new S2.S2Cell(new S2.S2CellId(conditions.cell.toString()));
            let wlat = ws2cell.getCapBound().getRectBound().getCenter().latDegrees;
            let wlon = ws2cell.getCapBound().getRectBound().getCenter().lngDegrees;
            let wlevel = ws2cell.level;
            var weather = new Weather({
                id: ws2cell.id, 
                level: wlevel,
                lat: wlat,
                lon: wlon,
                conditions: conditions.data,
                updated: null
            });
            //weather.save(update: true)
            client.addWeather(weather);
        });
        let endClientWeathers = process.hrtime(startClientWeathers);
        console.log("[WebhookRequestHandler] Weather Detail Count:", clientWeathers.length, "parsed in", endClientWeathers + "s");
    
        let startWildPokemon = process.hrtime();
        wildPokemons.forEach(wildPokemon => {
            let pokemon = new Pokemon({
                username: username,
                cellId: wildPokemon.cell,
                timestampMs: wildPokemon.timestamp_ms,
                wild: wildPokemon.data
            });
            //pokemon.save();
            client.addPokemon(pokemon);
        });
        let endWildPokemon = process.hrtime(startWildPokemon);
        console.log("[WebhookRequestHandler] Pokemon Count:", wildPokemons.length, "parsed in", endWildPokemon + "s");
    
        let startNearbyPokemon = process.hrtime();
        nearbyPokemons.forEach(nearbyPokemon => {
            let pokemon = new Pokemon({
                username: username,
                cellId: nearbyPokemon.cell,
                //timestampMs: nearbyPokemon.timestamp_ms,
                nearby: nearbyPokemon.data
            });
            //pokemon.save();
            client.addPokemon(pokemon);
        });
        let endNearbyPokemon = process.hrtime(startNearbyPokemon);
        console.log("[WebhookRequestHandler] NearbyPokemon Count:", nearbyPokemons.length, "parsed in", endNearbyPokemon + "s");
    
        let startForts = process.hrtime();
        forts.forEach(fort => {
            switch (fort.data.type) {
                case 0: // gym
                    let gym = new Gym({
                        cellId: fort.cell,
                        fort: fort.data
                    });
                    //gym.save();
                    client.addGym(gym);
                    if (gymIdsPerCell[fort.cell] === undefined) {
                        gymIdsPerCell[fort.cell] = [];
                    }
                    gymIdsPerCell[fort.cell].push(fort.data.id);
                    break;
                case 1: // checkpoint
                    let pokestop = new Pokestop({
                        cellId: fort.cell,
                        fort: fort.data
                    });
                    //pokestop.save();
                    client.addPokestop(pokestop);
                    if (stopsIdsPerCell[fort.cell] === undefined) {
                        stopsIdsPerCell[fort.cell] = [];
                    }
                    stopsIdsPerCell[fort.cell].push(fort.data.id);
                    break;
            }
        });
        let endForts = process.hrtime(startForts);
        console.log("[WebhookRequestHandler] Forts Count:", forts.length, "parsed in", endForts + "s");
    
        if (fortDetails.length > 0) {
            let startFortDetails = process.hrtime();
            fortDetails.forEach(fort => {
                switch (fort.type) {
                    case 0: // gym
                        let gym: Gym;
                        try {
                            gym = Gym.getById(fort.id);
                        } catch (err) {
                            gym = null;
                        }
                        if (gym) {
                            gym.addDetails(fort);
                            //gym.save();
                            client.addGym(gym);
                        }
                        break;
                    case 1: // checkpoint
                        let pokestop: Pokestop;
                        try {
                            pokestop = Pokestop.getById(fort.id);
                        } catch (err) {
                            pokestop = null;
                        }
                        if (pokestop) {
                            pokestop.addDetails(fort);
                            //pokestop.save();
                            client.addPokestop(pokestop);
                        }
                        break;
                }
            });
            let endFortDetails = process.hrtime(startFortDetails);
            console.log("[WebhookRequestHandler] Forts Detail Count:", fortDetails.length, "parsed in", endFortDetails + "s");
        }
        
        if (gymInfos.length > 0) {
            let startGymInfos = process.hrtime();
            gymInfos.forEach(gymInfo => {
                let gym: Gym;
                try {
                    gym = Gym.getById(gymInfo.gym_status_and_defenders.pokemon_fort_proto.id);
                } catch (err) {
                    gym = null
                }
                if (gym) {
                    gym.addGymInfo(gymInfo);
                    //gym.save();
                    client.addGym(gym);
                }
            });
            let endGymInfos = process.hrtime(startGymInfos);
            console.log("[WebhookRequestHandler] Forts Detail Count:", gymInfos.length, "parsed in", endGymInfos + "s");
        }
        
        if (quests.length > 0) {
            let startQuests = process.hrtime();
            quests.forEach(quest => {
                let pokestop: Pokestop;
                try {
                    pokestop = Pokestop.getById(quest.fort_id);
                } catch (err) {
                    pokestop = null;
                }
                if (pokestop) {
                    pokestop.addQuest(quest);
                    //pokestop.save();
                    client.addQuest(quest);
                }
            });
            let endQuests = process.hrtime(startQuests);
            console.log("[WebhookRequestHandler] Quest Count:", quests.length, "parsed in", endQuests + "s");
        }
        
        if (encounters.length > 0) {
            let startEncounters = process.hrtime();
            encounters.forEach(encounter => {
                let pokemon: Pokemon;
                try {
                    pokemon = Pokemon.getById(encounter.wild_pokemon.encounter_id);
                } catch (err) {
                    pokemon = null;
                }
                if (pokemon) {
                    pokemon.addEncounter(encounter, username);
                    //pokemon.save();
                    client.addPokemon(pokemon);
                } else {
                    let centerCoord = new S2.S2Point(encounter.wild_pokemon.latitude, encounter.wild_pokemon.longitude);
                    let center = S2.S2LatLng.fromPoint(centerCoord);
                    let centerNormalized = center.normalized();
                    let centerNormalizedPoint = centerNormalized.toPoint();
                    var circle = new S2.S2Cap(centerNormalizedPoint, 0.0);
                    let coverer = new S2.S2RegionCoverer();
                    coverer.maxCells = 1;
                    coverer.minLevel = 15;
                    coverer.maxLevel = 15;
                    let cellIds = coverer.getCoveringCells(circle);
                    console.log(cellIds);
                    let cellId = cellIds.pop();
                    if (cellId) {
                        let newPokemon = new Pokemon({
                            wild: encounter.wild_pokemon.data,
                            username: username,
                            cellId: cellId,
                            timestampMs: encounter.wild_pokemon.timestamp_ms
                        });
                        newPokemon.addEncounter(encounter, username);
                        newPokemon.save(); // TODO: UpdateIV true
                    }
                }
            });
            let endEncounters = process.hrtime(startEncounters);
            console.log("[WebhookRequestHandler] Encounter Count:", encounters.length, "parsed in ", endEncounters + "s");
        }
}

/**
 * Gets a task for the device.
 * @param {*} req 
 * @param {*} res 
 */
function getTask(req, res) {
    let lats = {
        "lat1": 34.096071
    };
    let lons = {
        "lon1": -117.648403
    };
    let data = {
        "action": "scan_pokemon",
        "lat": randomValue(lats),
        "lon": randomValue(lons),
        "min_level": 1,
        "max_level": 29
    };
    return data;
}

/**
 * Returns a random value from a dictionary.
 * @param {*} obj 
 */
function randomValue(obj) {
    let keys = Object.keys(obj)
    return obj[keys[ keys.length * Math.random() << 0]];
}

/**
 * Base64 decodes the string to raw data.
 * @param {*} data 
 */
function base64_decode(data) {
    return Buffer.from(data, 'base64');
}

// Export the class
export { WebhookHandler };