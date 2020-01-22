"use strict"

const POGOProtos = require('../../pogo-protos');
import * as S2 from 'nodes2ts';
import { Account } from '../models/account';
import { Device } from '../models/device';
import { Pokemon } from '../models/pokemon';
import { Gym } from '../models/gym';
import { Pokestop } from '../models/pokestop';
import { Cell } from '../models/cell';
import { Weather } from '../models/weather';
import { InstanceController } from '../controllers/instances/instance-controller';
import { getCurrentTimestamp } from '../utils/util';
//import { RedisClient } from '../redis-client';
//import { winston } from '../utils/logger';

// TODO: Process pool for data handlers.

//:haunter:
//const client = new RedisClient();

let accounts = Account.getAll();

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
async function _handleRawData(req, res) {
    let jsonOpt: any = {};
    try {
        jsonOpt = JSON.parse(req.body);
        //console.log("[Raw] HandleRawData Parsed:", jsonOpt);
    } catch (e) {
        console.error(e);
        return res.status(400).end();
    }
    if (jsonOpt === undefined) {
        console.error("[Raw] Bad data");
        return res.status(400).end();
    }
    if (jsonOpt['payload'] !== undefined) {
        jsonOpt['contents'] = [jsonOpt];
    }

    let json = jsonOpt;
    let trainerLevel = parseInt(json["trainerlvl"] || json["trainerLevel"]) || 0;
    let username: string = json["username"];
    if (username && trainerLevel > 0) {
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
        console.error("[Raw] Invalid GMO");
        return res.status(400).end();
    }
    var uuid: string = json["uuid"];
    let latTarget: number = json["lat_target"];
    let lonTarget: number = json["lon_target"];
    if (uuid !== undefined && latTarget !== undefined && lonTarget !== undefined) {
        var newDevice = new Device(uuid, null, username, "127.0.0.1", getCurrentTimestamp(), latTarget, lonTarget);
        newDevice.save();
    }

    let pokemonEncounterId: string = json["pokemon_encounter_id"];
    let pokemonEncounterIdForEncounter: string = json["pokemon_encounter_id_for_encounter"];
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

    let isEmptyGMO: boolean = true;
    let isInvalidGMO: boolean = true;
    let containsGMO: boolean = false;
    let isMadData: boolean = false;

    if (contents === undefined) {
        console.error("[Raw] Contents is empty");
        res.send("Contents is empty");
        return res.status(400).end();
    }

    contents.forEach((rawData: any) => {
        let data: any;
        let method: number;
        let invalid: boolean = false;
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
            console.error("[Raw] Invalid data");
            return res.status(400).end();
        }

        switch (method) {
            case 101: // FortSearchResponse
                try {
                    let fsr = POGOProtos.Networking.Responses.FortSearchResponse.decode(base64_decode(data));
                    if (fsr) {
                        if (fsr.hasChallengeQuest && fsr.challengeQuest.hasQuest) {
                            let quest = fsr.challengeQuest.quest;
                            quests.push(quest);
                        }
                    } else {
                        console.error("[Raw] Malformed FortSearchResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode FortSearchResponse");
                }
                break;
            case 102: // EncounterResponse
                if (trainerLevel >= 0 || isMadData !== false) { //TODO: Set trainerLevel >= 30
                    try {
                        let er = POGOProtos.Networking.Responses.EncounterResponse.decode(base64_decode(data));
                        if (er) {
                            encounters.push(er);
                        } else {
                            console.error("[Raw] Malformed EncounterResponse");
                        }
                    } catch (err) {
                        console.error("[Raw] Unable to decode EncounterResponse");
                    }
                }
                break;
            case 104: // FortDetailsResponse
                try {
                    let fdr = POGOProtos.Networking.Responses.FortDetailsResponse.decode(base64_decode(data));
                    if (fdr) {
                        fortDetails.push(fdr);
                    } else {
                        console.error("[Raw] Malformed FortDetailsResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode FortDetailsResponse");
                }
                break;
            case 156: // GymGetInfoResponse
                try {
                    let ggi = POGOProtos.Networking.Responses.GymGetInfoResponse.decode(base64_decode(data));
                    if (ggi) {
                        gymInfos.push(ggi);
                    } else {
                        console.error("[Raw] Malformed GymGetInfoResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode GymGetInfoResponse");
                }
                break;
            case 106: // GetMapObjectsResponse
                containsGMO = true;
                try {
                    let gmo = POGOProtos.Networking.Responses.GetMapObjectsResponse.decode(base64_decode(data));
                    if (gmo) {
                        isInvalidGMO = false;

                        let mapCellsNew = gmo.map_cells;
                        if (mapCellsNew.length === 0) {
                            console.debug("[Raw] Map cells is empty");
                            return res.status(400).end();
                        }
                        mapCellsNew.forEach((mapCell: any) => {
                            let timestampMs = mapCell.current_timestamp_ms;
                            let wildNew = mapCell.wild_pokemons;
                            wildNew.forEach((wildPokemon: any) => {
                                wildPokemons.push({
                                    cell: mapCell.s2_cell_id,
                                    data: wildPokemon,
                                    timestampMs: timestampMs
                                });
                            });
                            let nearbyNew = mapCell.nearby_pokemons;
                            nearbyNew.forEach((nearbyPokemon: any) => {
                                nearbyPokemons.push({
                                    cell: mapCell.s2_cell_id,
                                    data: nearbyPokemon
                                });
                            });
                            let fortsNew = mapCell.forts;
                            fortsNew.forEach((fort: any) => {
                                forts.push({
                                    cell: mapCell.s2_cell_id,
                                    data: fort
                                });
                            });
                            cells.push(mapCell.s2_cell_id);
                        });
        
                        let weather = gmo.client_weather;
                        weather.forEach((wmapCell: any) => {
                            clientWeathers.push({
                                cell: wmapCell.s2_cell_id,
                                data: wmapCell
                            });
                        });
        
                        if (wildPokemons.length === 0 && nearbyPokemons.length === 0 && forts.length === 0) {
                            cells.forEach((cell: any) => {
                                let count = emptyCells[cell];
                                if (count === undefined) {
                                    emptyCells[cell] = 1;
                                } else {
                                    emptyCells[cell] = count + 1;
                                }
                                if (count === 3) {
                                    console.debug("[Raw] Cell", cell, "was empty 3 times in a row. Assuming empty.");
                                    cells.push(cell);
                                }
                            });
                            
                            console.debug("[Raw] GMO is empty.");
                        } else {
                            cells.forEach(cell => emptyCells[cell] = 0);
                            isEmptyGMO = false;
                        }
                    } else {
                        console.error("[Raw] Malformed GetMapObjectsResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode GetMapObjectsResponse");
                }
                break;
        }
    });

    let targetCoord: S2.S2LatLng;
    let inArea = false
    if (latTarget !== undefined && lonTarget !== undefined) {
        targetCoord = new S2.S2LatLng(latTarget, lonTarget);
    } else {
        targetCoord = null;
    }
    
    let pokemonCoords: S2.S2LatLng;
    if (targetCoord !== null) {
        if (forts !== undefined) {
            forts.forEach(fort => {
                if (inArea === false) {
                    let coord = new S2.S2LatLng(fort.data.latitude, fort.data.longitude);
                    if (coord.getDistance(targetCoord) <= targetMaxDistance) {
                        inArea = true;
                    }
                }
            });
        }
    }
    if (targetCoord !== undefined || pokemonEncounterId !== undefined) {
        wildPokemons.forEach(pokemon => {
            if (targetCoord) {
                if (inArea === false) {
                    let coord: S2.S2LatLng = new S2.S2LatLng(pokemon.data.latitude, pokemon.data.longitude);
                    if (coord.getDistance(targetCoord) <= targetMaxDistance) {
                        inArea = true;
                    }
                } else if (pokemonCoords && inArea) {
                    //break;
                }
            }
            if (pokemonEncounterId) {
                if (pokemonCoords === undefined) {
                    if (pokemon.data.encounter_id == pokemonEncounterId) {
                        pokemonCoords = new S2.S2LatLng(pokemon.data.latitude, pokemon.data.longitude);
                    }
                } else if (pokemonCoords && inArea) {
                    //break;
                }
            }
        });
    }
    if (targetCoord !== undefined && inArea === false) {
        cells.forEach(cell => {
            if (inArea === false) {
                let s2cellId = new S2.S2CellId(cell.toString());
                let s2cell = new S2.S2Cell(s2cellId);
                let center = s2cell.getCenter();
                let coord = new S2.S2LatLng(center.x, center.y);
                let radians: S2.S1Angle = new S2.S1Angle(Math.max(targetMaxDistance, 100)); // REVIEW: wth is radians
                if (coord.getDistance(targetCoord) <= radians) {
                    inArea = true;
                }
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
        encounters.forEach(encounter => {
            if (encounter.wild_pokemon.encounter_id === pokemonEncounterIdForEncounter){
                //We actually encountered the target.
                data["encounters"] = 1;
            }
        });
    }
    
    if (latTarget && lonTarget) {
        data["in_area"] = inArea;
        data["lat_target"] = latTarget;
        data["lon_target"] = lonTarget;
    }
    if (pokemonCoords && pokemonEncounterId) {
        let point = pokemonCoords.toPoint();
        data["pokemon_lat"] = pokemonCoords.latDegrees; // TODO: Verify this is correct
        data["pokemon_lon"] = pokemonCoords.lngDegrees; // TODO: Verify this is correct
        data["pokemon_encounter_id"] = pokemonEncounterId;
    }

    let listScatterPokemon = json["list_scatter_pokemon"];
    if (listScatterPokemon && pokemonCoords && pokemonEncounterId) {
        let uuid: string = json["uuid"];
        let controller = InstanceController.instance.getInstanceController(uuid); // TODO: Cast to IVInstanceController
        let scatterPokemon = [];

        wildPokemons.forEach(async pokemon => {
            //Don't return the main query in the scattershot list
            if (pokemon.data.encounter_id === pokemonEncounterId) {
                return;
            }
            
            try {
                let oldPokemon = await Pokemon.getById(pokemon.data.encounter_id);
                if (oldPokemon && oldPokemon.atkIv) {
                    //Skip going to mons already with IVs.
                    return;
                }
            } catch {}
            
            let coords: S2.S2LatLng = new S2.S2LatLng(pokemon.data.latitude, pokemon.data.longitude);
            let distance = pokemonCoords.getDistance(coords);
            
            // Only Encounter pokemon within 35m of initial pokemon scann
            let pokemonId: number = parseInt(pokemon.data.pokemon_data.pokemon_id);
            if (controller) {
                let radians: S2.S1Angle = new S2.S1Angle(35); // REVIEW: wth is radians
                /*
                TODO: Fix scatterPokemon
                if (distance <= radians && controller.scatterPokemon.contains(pokemonId)) {
                    scatterPokemon.push({
                        lat: pokemon.data.latitude,
                        lon: pokemon.data.longitude,
                        id: pokemon.data.encounterID.description
                    });
                }
                */
            }
        });

        data["scatter_pokemon"] = scatterPokemon;
    }

    if (data) {
        try {
            console.debug("[Raw] Sending response to device:", data);
            res.send(data);
        } catch (err) {
            // TODO: ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client
            console.log("[Raw] Failed to reply to device:", err);
        }
    }

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
        console.error(e);
        return res.status(400).end();
    }
    let typeO = jsonO["type"];
    let uuidO = jsonO["uuid"];
    if (typeO === undefined || uuidO === undefined) {
        console.error("[Controller] Failed to parse controller data");
        return res.status(400).end();
    }
    let type: string = typeO;
    let uuid: string = uuidO;
    let username: string = jsonO["username"];
    let minLevel: number = parseInt(jsonO["min_level"] || 0);
    let maxLevel: number = parseInt(jsonO["max_level"] || 29);
    let device: Device = getDevice(uuid);

    switch (type) {
        case "init":
            let firstWarningTimestamp: number;
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
                console.debug("[Controller] Device registered");
                res.send({
                    data: {
                        assigned: device.instanceName !== undefined,
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            } else {
                // Register new device
                console.debug("[Controller] Registering device");
                let newDevice = new Device(uuid, null, null, null, 0, 0.0, 0.0);
                newDevice.create();
                res.send({ 
                    data: { 
                        assigned: false,
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            }
            break;
        case "heartbeat":
            let host: string;
            let remoteAddress = req.client.remoteAddress;
            if (remoteAddress) {
                host = remoteAddress.host + ":" + remoteAddress.port;
            } else {
                host = "?";
            }
            try {
                Device.touch(uuid, host);
                res.send('OK');
            } catch (err) {
                res.send(err);
            }
            break;
        case "get_job":
            let controller = InstanceController.instance.getInstanceController(uuid);
            if (controller !== null) {
                try {
                    let task = controller.getTask(uuid, username);
                    res.send({
                        data: task
                    });
                } catch (err) {
                    res.status(404);
                    res.end();
                }
            } else {
                console.info("[Controller] Device " + uuid + " not assigned to an instance!");
                res.status(404);
                res.end();
            }
            break;
        case "get_account":
            var account = Account.getNewAccount(minLevel, maxLevel);
            console.debug("[Controller] GetAccount: " + account);
            account.then(x => {
                console.debug("[Controller] Random Account: " + x);
                if (device === undefined || x === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (device.accountUsername !== undefined) {
                    let oldAccount = accounts[device.accountUsername];
                    if (oldAccount instanceof Account && 
                        oldAccount.firstWarningTimestamp === undefined && 
                        oldAccount.failed                === undefined && 
                        oldAccount.failedTimestamp       === undefined) {
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
            break;
        case "tutorial_done":
            accounts[device.accountUsername].then((account: Account) => {
                if (device === undefined || account === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.level === 0) {
                    account.level = 1;
                    account.save(true);
                    res.send('OK');
                }
            });
            break;
        case "account_banned":
            accounts[device.accountUsername].then((account: Account) => {
                if (device === undefined || account === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "banned";
                    account.save(true);
                    res.send('OK');
                }
            });
            break;
        case "account_warning":
            accounts[device.accountUsername].then((account: Account) => {
                if (device === undefined || account === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.firstWarningTimestamp === undefined) {
                    account.firstWarningTimestamp = getCurrentTimestamp();
                    account.save(true);
                    res.send('OK');
                }
            });
            break;
        case "account_invalid_credentials":
            accounts[device.accountUsername].then((account: Account) => {
                if (device === undefined || account === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "invalid_credentials";
                    account.save(true);
                    res.send('OK');
                }
            });
            break;
        case "error_26":
            accounts[device.accountUsername].then((account: Account) => {
                if (device === undefined || account === undefined) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.status(400).end();
                }
                if (account.failedTimestamp === undefined || account.failed === undefined) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "error_26";
                    account.save(true);
                    res.send('OK');
                }
            });
            break;
        case "logged_out":
            device.accountUsername = null;
            device.save(device.uuid);
            res.send('OK');
            break;
        default:
            console.error("[Controller] Unhandled Request:", type);
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

    if (cells.length > 0) {
        cells.forEach(cellId => {
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
                cell.save(true).then(x => {
                    //console.log("[Cell] Updated:", cell.id);
                }).catch(err => {
                    console.error("[Cell] Error:", err);
                });
            } catch (err) {
                console.error(err);
            }
            //client.addCell(cell);
            
            if (gymIdsPerCell[cellId] === undefined) {
                gymIdsPerCell[cellId] = [];
            }
            if (stopsIdsPerCell[cellId] === undefined) {
                stopsIdsPerCell[cellId] = [];
            } 
        });
    }

    if (clientWeathers.lengths > 0) {
        let startClientWeathers = process.hrtime();
        clientWeathers.forEach(conditions => {
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
                weather.save(true);
                //client.addWeather(weather);
            } catch (err) {
                console.error(err);
            }
        });
        let endClientWeathers = process.hrtime(startClientWeathers);
        console.info("[] Weather Detail Count: " + clientWeathers.length + " parsed in " + endClientWeathers + "s");
    }

    if (forts.length > 0) {
        let startForts = process.hrtime();
        forts.forEach(fort => {
            try {
                switch (fort.data.type) {
                    case 0: // gym
                        let gym = new Gym({
                            cellId: fort.cell,
                            fort: fort.data
                        });
                        gym.save();
                        //client.addGym(gym);
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
                        pokestop.save();
                        //client.addPokestop(pokestop);
                        if (stopsIdsPerCell[fort.cell] === undefined) {
                            stopsIdsPerCell[fort.cell] = [];
                        }
                        stopsIdsPerCell[fort.cell].push(fort.data.id);
                        break;
                }
            } catch (err) {
                console.error(err);
            }
        });
        let endForts = process.hrtime(startForts);
        console.info("[] Forts Count: " + forts.length + " parsed in " + endForts + "s");
    }

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
                        gym.save();
                        //client.addGym(gym);
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
                        pokestop.save();
                        //client.addPokestop(pokestop);
                    }
                    break;
            }
        });
        let endFortDetails = process.hrtime(startFortDetails);
        console.info("[] Forts Detail Count: " + fortDetails.length + " parsed in " + endFortDetails + "s");
    }

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
                gym.save();
                //client.addGym(gym);
            }
        });
        let endGymInfos = process.hrtime(startGymInfos);
        console.info("[] Forts Detail Count: " + gymInfos.length + " parsed in " + endGymInfos + "s");
    }

    if (wildPokemons.length > 0) {
        let startWildPokemon = process.hrtime();
        wildPokemons.forEach(wildPokemon => {
            try {
                let pokemon = new Pokemon({
                    username: username,
                    cellId: wildPokemon.cell,
                    timestampMs: wildPokemon.timestamp_ms,
                    wild: wildPokemon.data
                });
                pokemon.save();
                //client.addPokemon(pokemon);
            } catch (err) {
                console.error(err);
            }
        });
        let endWildPokemon = process.hrtime(startWildPokemon);
        console.info("[] Pokemon Count: " + wildPokemons.length + " parsed in " + endWildPokemon + "s");
    }

    if (nearbyPokemons.length > 0) {
        let startNearbyPokemon = process.hrtime();
        nearbyPokemons.forEach(nearbyPokemon => {
            try {
                let pokemon = new Pokemon({
                    username: username,
                    cellId: nearbyPokemon.cell,
                    //timestampMs: nearbyPokemon.timestamp_ms,
                    nearby: nearbyPokemon.data
                });
                pokemon.save();
                //client.addPokemon(pokemon);
            } catch (err) {
                console.error(err);
            }
        });
        let endNearbyPokemon = process.hrtime(startNearbyPokemon);
        console.info("[] NearbyPokemon Count: " + nearbyPokemons.length + " parsed in " + endNearbyPokemon + "s");
    }

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
                pokestop.save();
                //client.addQuest(quest);
            }
        });
        let endQuests = process.hrtime(startQuests);
        console.info("[] Quest Count: " + quests.length + " parsed in " + endQuests + "s");
    }

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
                pokemon.addEncounter(encounter, username);
                pokemon.save(true);
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
                    newPokemon.addEncounter(encounter, username);
                    newPokemon.save(true);
                }
            }
        });
        let endEncounters = process.hrtime(startEncounters);
        console.info("[] Encounter Count: " + encounters.length + " parsed in " + endEncounters + "s");
    }
}

function getDevice(uuid: string) {
    let devices: Device[] = Object.values(InstanceController.instance.Devices);
    let device = devices.find(x => x.uuid === uuid);
    return device;
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