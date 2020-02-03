"use strict";

const POGOProtos = require('../../pogo-protos');
import * as S2 from 'nodes2ts';
import { Account } from '../models/account';
import { Device } from '../models/device';
import { Pokemon } from '../models/pokemon';
import { InstanceController } from '../controllers/instances/instance-controller';
import { getCurrentTimestamp, base64_decode } from '../utils/util';
import { Digest } from '../data/digest';
import { Request, Response } from 'express';
//import { winston } from '../utils/logger';

// TODO: Process pool for data handlers.

const DefaultTargetMaxDistance: number = 250;

let emptyCells = [];//[UInt64: Int]
let levelCache = {};
let digest = new Digest();

enum InventoryItemDataType {
    PokemonData = 1, // 1
    ItemData, // 2
    PokedexEntry, // 3
    PlayerStats, // 4
    PlayerCurrency, // 5
    PlayerCamera, // 6
    InventoryUpgrades, // 7
    AppliedItems, // 8
    EggIncubators, // 9
    Candy, // 10
    Quest, // 11
    AvatarItem, // 12
    RaidTickets, // 13
    Quests, // 14
    GiftBoxes, // 15
    BelugaIncenseBox, // 16
    VsSeekerUpgrades, // 17
    LimitedPurchaseSkuRecord, // 19
}

/**
 * Webhook request handler class.
 */
class WebhookHandler {
    /**
     * Initialize new WebhookHandler object.
     */
    constructor(){
    }
    /**
     * Handle raw API data.
     * @param req 
     * @param res 
     */
    handleRawData(req: Request, res: Response) {
        _handleRawData(req, res);
    }
    /**
     * Handle device controller data.
     * @param req 
     * @param res 
     */
    handleControllerData(req: Request, res: Response) {
        _handleControllerData(req, res);
    }
}

/**
 * Handles the raw data endpoint.
 * @param {*} req 
 * @param {*} res 
 */
async function _handleRawData(req: Request, res: Response) {
    let jsonOpt: any = {};
    try {
        jsonOpt = req.body;//JSON.parse(req.body);
        //console.log("[Raw] HandleRawData Parsed:", jsonOpt);
    } catch (e) {
        console.error(e);
        return res.sendStatus(400);
    }
    if (jsonOpt === undefined || jsonOpt === null) {
        console.error("[Raw] Bad data");
        return res.sendStatus(400);
    }
    if (jsonOpt['payload'] !== undefined) {
        jsonOpt['contents'] = [jsonOpt];
    }

    let json = jsonOpt;
    let trainerLevel = parseInt(json["trainerlvl"] || json["trainerLevel"]) || 0;
    let username: string = json["username"];
    if (username && username.includes("Optional(")) {
        username = username.replace("Optional(\"", "");
        username = username.replace("\")", "");
    }
    if (username && trainerLevel > 0) {
        let oldLevel = levelCache[username];
        if (oldLevel !== trainerLevel) {
            await Account.setLevel(username, trainerLevel);
            levelCache[username] = trainerLevel
        }
    }
    let contents: any = json["contents"] || json["protos"] || json["gmo"];
    if (contents === undefined || contents === null) {
        console.error("[Raw] Invalid GMO");
        return res.sendStatus(400);
    }
    let uuid: string = json["uuid"];
    let latTarget: number = json["lat_target"];
    let lonTarget: number = json["lon_target"];
    if (uuid && latTarget && lonTarget) {
        try {
            Device.setLastLocation(uuid, latTarget, lonTarget);
        } catch (err) {
            console.error(err);
        }
    }

    let pokemonEncounterId: string = json["pokemon_encounter_id"];
    let pokemonEncounterIdForEncounter: string = json["pokemon_encounter_id_for_encounter"];
    let targetMaxDistance = json["target_max_distance"] || json["target_max_distnace"] || DefaultTargetMaxDistance;

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

    contents.forEach((rawData: any) => {
        let data: any;
        let method: number;
        let invalid: boolean = false;
        if (rawData["GetMapObjects"] !== undefined) {
            data = rawData["GetMapObjects"];
            method = 106;
        } else if (rawData["GetHoloInventoryResponse"] !== undefined) {
            data = rawData["GetHoloInventoryResponse"];
            method = 4;
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
            console.log("[Raw] Unhandled proto:", rawData);
            invalid = true;
        }

        if (invalid !== false) {
            console.error("[Raw] Invalid data");
            return res.sendStatus(400);
        }

        switch (method) {
            case 4: // GetHoloInventoryResponse
                try {
                    let ghir = POGOProtos.Networking.Responses.GetHoloInventoryResponse.decode(base64_decode(data));
                    if (ghir) {
                        if (ghir.success) {
                            let delta = ghir.inventory_delta;
                            let originalTimestamp = delta.original_timestamp_ms;
                            let newTimestamp = delta.new_timestamp_ms;
                            let items = delta.inventory_items;
                            console.log("[Raw] GetHoloInventoryResponse:", items);
                        }
                    } else {
                        console.error("[Raw] Malformed GetHoloInventoryResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode GetHoloInventoryResponse");
                }
                break;
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
                if (trainerLevel >= 30 || isMadData !== false) {
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
                            return res.sendStatus(400);
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
        // TODO: Confirm lat/lon values are correct.
        data["pokemon_lat"] = pokemonCoords.latDegrees;
        data["pokemon_lon"] = pokemonCoords.lngDegrees;
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

    digest.consumeCells(cells);
    digest.consumeClientWeather(clientWeathers);
    digest.consumeForts(forts);
    digest.consumeFortDetails(fortDetails);
    digest.consumeGymInfos(gymInfos);
    digest.consumeWildPokemon(wildPokemons, username);
    digest.consumeNearbyPokemon(nearbyPokemons, username);
    digest.consumeQuests(quests);
    digest.consumeEncounters(encounters, username);
}

/**
 * Handles the controller endpoint.
 * @param {*} req 
 * @param {*} res 
 */
async function _handleControllerData(req: Request, res: Response) {
    let jsonO = {};
    try {
        jsonO = req.body;//JSON.parse(req.body);
        //console.log("HandleControllerData Parsed:", jsonO);
    } catch (e) {
        console.error(e);
        return res.sendStatus(400);
    }
    let typeO = jsonO["type"];
    let uuidO = jsonO["uuid"];
    if (typeO === undefined || uuidO === undefined) {
        console.error("[Controller] Failed to parse controller data");
        return res.sendStatus(400);
    }
    let type: string = typeO;
    let uuid: string = uuidO;
    let username: string = jsonO["username"];
    let ptcToken: string = jsonO["ptcToken"];
    //let tutorial: number = parseInt(jsonO["tutorial"]);
    let minLevel: number = parseInt(jsonO["min_level"] || 0);
    let maxLevel: number = parseInt(jsonO["max_level"] || 29);
    let device = await Device.getById(uuid);

    switch (type) {
        case "init":
            let firstWarningTimestamp: number;
            if (device === undefined || device.accountUsername === undefined) {
                firstWarningTimestamp = null;
            } else {
                let account = await Account.getWithUsername(device.accountUsername);
                if (account instanceof Account) {
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
                        assigned: device.instanceName !== undefined && device.instanceName !== null && device.instanceName !== "",
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            } else {
                // Register new device
                console.debug("[Controller] Registering device");
                let newDevice = new Device(uuid, null, null, 0, null, 0, 0.0, 0.0, null);
                await newDevice.create();
                res.send({ 
                    data: { 
                        assigned: false,
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            }
            break;
        case "heartbeat":
            let client = req.socket;
            let host = client 
                ? `${client.remoteAddress}:${client.remotePort}` 
                : "?";
            try {
                await Device.touch(uuid, host, false);
                res.send('OK');
            } catch (err) {
                res.send(err);
            }
            break;
        case "get_job":
            let controller = InstanceController.instance.getInstanceController(uuid);
            if (controller) {
                try {
                    let task = controller.getTask(uuid, username, false);
                    res.send({
                        data: task
                    });
                } catch (err) {
                    res.sendStatus(404);
                }
            } else {
                console.info("[Controller] Device", uuid, "not assigned to an instance!");
                res.sendStatus(404);
            }
            break;
        case "get_startup":
            let startupController = InstanceController.instance.getInstanceController(uuid);
            if (startupController) {
                try {
                    let task = startupController.getTask(uuid, username, true);
                    res.send({
                        data: task
                    });
                } catch (err) {
                    res.sendStatus(404);
                }
            } else {
                console.info("[Controller] Device", uuid, " failed to get startup location!");
                res.sendStatus(404);
            }
            break;
        case "get_account":
            let account = await Account.getNewAccount(minLevel, maxLevel);
            console.debug("[Controller] GetAccount: " + account);
            if (device === undefined || device === null || 
                account === undefined || account === null) {
                console.error("[Controller] Failed to get account, device or account is null.");
                return res.sendStatus(400);
            }
            if (device.accountUsername) {
                let oldAccount = await Account.getWithUsername(device.accountUsername);
                if (oldAccount instanceof Account && 
                    oldAccount.level >= minLevel &&
                    oldAccount.level <= maxLevel &&
                    oldAccount.firstWarningTimestamp === undefined && 
                    oldAccount.failed                === undefined && 
                    oldAccount.failedTimestamp       === undefined) {
                    res.send({
                        data: {
                            username: oldAccount.username.trim(),
                            password: oldAccount.password.trim(),
                            first_warning_timestamp: oldAccount.firstWarningTimestamp,
                            level: oldAccount.level,
                            tutorial: account.tutorial,
                            ptcToken: oldAccount.ptcToken
                        }
                    });
                    return;
                }
            }

            device.accountUsername = account.username;
            device.deviceLevel = account.level;
            await device.save(device.uuid);
            res.send({
                data: {
                    username: account.username.trim(),
                    password: account.password.trim(),
                    first_warning_timestamp: account.firstWarningTimestamp,
                    level: account.level,
                    tutorial: account.tutorial,
                    ptcToken: account.ptcToken
                }
            });
            break;
        case "last_seen":
            let lastSeenClient = req.socket;
            let lastSeenHost = lastSeenClient 
                ? `${lastSeenClient.remoteAddress}:${lastSeenClient.remotePort}` 
                : "?";
            try {
                await Device.touch(uuid, lastSeenHost, true);
                res.send('OK');
            } catch (err) {
                res.send(err);
            }
            break;
        case "tutorial_done":
            let tutAccount = await Account.getWithUsername(device.accountUsername);
            if (tutAccount instanceof Account) {
                if (tutAccount.level === 0) {
                    tutAccount.level = 1;
                }
                tutAccount.tutorial = 1;
                tutAccount.save(true);
                res.send('OK');
            } else {
                if (device === undefined || device === null || 
                    tutAccount === undefined || tutAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "account_banned":
            let banAccount = await Account.getWithUsername(device.accountUsername);
            if (banAccount instanceof Account) {
                if (banAccount.failedTimestamp === undefined || banAccount.failedTimestamp === null || 
                    banAccount.failed === undefined || banAccount.failed === null) {
                        banAccount.failedTimestamp = getCurrentTimestamp();
                        banAccount.failed = "banned";
                        banAccount.save(true);
                        res.send('OK');
                }
            } else {
                if (device === undefined || device === null ||
                    banAccount === undefined || banAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "account_warning":
            let warnAccount = await Account.getWithUsername(device.accountUsername);
            if (warnAccount instanceof Account) {
                if (warnAccount.firstWarningTimestamp === undefined || warnAccount.firstWarningTimestamp === null) {
                    warnAccount.firstWarningTimestamp = getCurrentTimestamp();
                    warnAccount.save(true);
                    res.send('OK');
                }
            } else {
                if (device === undefined || device === null ||
                    warnAccount === undefined || warnAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "account_invalid_credentials":
            let invalidAccount = await Account.getWithUsername(device.accountUsername);
            if (invalidAccount instanceof Account) {
                if (invalidAccount.failedTimestamp === undefined || invalidAccount.failedTimestamp === null || 
                    invalidAccount.failed === undefined || invalidAccount.failed === null) {
                        invalidAccount.failedTimestamp = getCurrentTimestamp();
                        invalidAccount.failed = "invalid_credentials";
                        invalidAccount.save(true);
                        res.send('OK');
                }
            } else {
                if (device === undefined || device === null ||
                    invalidAccount === undefined || invalidAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "error_26":
            let errAccount = await Account.getWithUsername(device.accountUsername);
            if (errAccount instanceof Account) {
                if (errAccount.failedTimestamp === undefined || errAccount.failedTimestamp === null ||
                    errAccount.failed === undefined || account.failed === null) {
                        errAccount.failedTimestamp = getCurrentTimestamp();
                        errAccount.failed = "error_26";
                        errAccount.save(true);
                        res.send('OK');
                }
            } else {
                if (device === undefined || device === null ||
                    errAccount === undefined || errAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "logged_out":
            try {
                let device = await Device.getById(uuid);
                if (device instanceof Device) {
                    if (device.accountUsername === null) {
                        res.sendStatus(404);
                        return;
                    }
                    let failed = await Account.checkFail(device.accountUsername);
                    if (failed === false) {
                        await Account.setInstanceUuid(device.uuid, device.instanceName, device.accountUsername);
                    }
                    await Account.setCooldown(device.accountUsername, device.lastLat, device.lastLon);
                    device.accountUsername = null;
                    await device.save(device.uuid);
                    res.send('OK');
                } else {
                    res.sendStatus(404);
                    return;
                }
            } catch {
                res.sendStatus(500);
            }
            device.accountUsername = null;
            device.save(device.uuid);
            res.send('OK');
            break;
        case "ptcToken": // REVIEW: Seriously? Who the hell used camelCasing :joy:?
            try {
                let device = await Device.getById(uuid);
                let username = device.accountUsername;
                let account = await Account.getWithUsername(username);
                if (device === undefined || device === null ||
                    username === undefined || username === null || username === "" ||
                    account === undefined || account === null) {
                        res.sendStatus(404);
                        return;
                }
                if (account.ptcToken === undefined || 
                    account.ptcToken === null ||
                    account.ptcToken === "") {
                    account.ptcToken = ptcToken;
                    account.save(true);
                }
                res.send('OK');
            } catch {
                res.sendStatus(404);
            }
            break;
        case "job_failed":
            console.log("[Controller] JOB FAILED:", jsonO);
            res.send('OK');
            break;
        default:
            console.error("[Controller] Unhandled Request:", type);
            break;
    }
}

// Export the class
export { WebhookHandler };