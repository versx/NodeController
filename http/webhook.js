"use strict"

const POGOProtos  = require('../pogo-protos');
const Account     = require('../models/account.js');
const Device      = require('../models/device.js');
const Pokemon     = require('../models/pokemon.js');
const Gym         = require('../models/gym.js');
const Pokestop    = require('../models/pokestop.js');
const S2Cell      = require('../models/s2cell.js');
const S2          = require('nodes2ts');
const RedisClient = require('../redis-client.js');

const client = new RedisClient();

var accounts = Account.getAll();
var devices = Device.getAll();

var emptyCells = [];//[UInt64: Int]
var levelCache = {};

class WebhookRequestHandler {
    constructor() {
    }
    handleRawData(req, res) {
        _handleRawData(req, res);
    }
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
    var jsonOpt = {};
    try {
        jsonOpt = JSON.parse(req.body);
        //console.log("HandleRawData Parsed:", jsonOpt);
    } catch (e) {
        console.log(e);
        return;
    }
    if (jsonOpt === undefined) {
        console.log("Bad data");
        return;
    }
    if (jsonOpt['payload'] !== undefined) {
        jsonOpt['contents'] = [jsonOpt];
    }

    var json = jsonOpt;
    var trainerLevel = parseInt(json["trainerlvl"] || json["trainerLevel"]) || 0;
    var username = json["username"];
    if (username !== false && trainerLevel > 0) {
        var oldLevel = levelCache[username];
        if (oldLevel !== trainerLevel) {
            var account = accounts[username];
            if (account !== undefined) {
                account.level = trainerLevel;
                account.save();
            }
            levelCache[username] = trainerLevel
        }
    }
    var contents = json["contents"] || json["protos"] || json["gmo"];
    if (contents === undefined) {
        console.log("Invalid GMO");
        return;
    }
    var uuid = json["uuid"];
    var latTarget = json["lat_target"];
    var lonTarget = json["lon_target"];
    if (uuid !== undefined && latTarget !== undefined && lonTarget !== undefined) {
        var newDevice = new Device(uuid, null, username, "127.0.0.1", new Date(), latTarget, lonTarget);
        newDevice.save();
    }

    var pokemonEncounterId = json["pokemon_encounter_id"];
    var pokemonEncounterIdForEncounter = json["pokemon_encounter_id_for_encounter"];
    var targetMaxDistance = json["target_max_distnace"] || 250;

    var wildPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_WildPokemon, timestampMs: UInt64}]
    var nearbyPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_NearbyPokemon}]
    var clientWeathers = []; //[{cell: Int64, data: POGOProtos_Map_Weather_ClientWeather}]
    var forts = []; //[{cell: UInt64, data: POGOProtos_Map_Fort_FortData}]
    var fortDetails = []; //[POGOProtos_Networking_Responses_FortDetailsResponse]
    var gymInfos = []; //[POGOProtos_Networking_Responses_GymGetInfoResponse]
    var quests = []; //[POGOProtos_Data_Quests_Quest]
    var encounters = []; //[POGOProtos_Networking_Responses_EncounterResponse]
    var cells = []; //[UInt64]

    var isEmptyGMO = true;
    var isInvalidGMO = true;
    var containsGMO = false;
    var isMadData = false;

    if (contents === undefined) {
        console.log("Contents is empty");
        res.send("Contents is empty");
        return;
    }

    contents.forEach(function(rawData) {
        var data;
        var method;
        var invalid = false;
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
            return;
        }

        switch (method) {
            case 101: // FortSearchResponse
                var fsr = POGOProtos.Networking.Responses.FortSearchResponse.decode(base64_decode(data));
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
                    var er = POGOProtos.Networking.Responses.EncounterResponse.decode(base64_decode(data));
                    if (er) {
                        encounters.push(er);
                    } else {
                        console.log("[WebhookRequestHandler] Malformed EncounterResponse");
                    }
                }
                break;
            case 104: // FortDetailsResponse
                var fdr = POGOProtos.Networking.Responses.FortDetailsResponse.decode(base64_decode(data));
                if (fdr) {
                    fortDetails.push(fdr);
                } else {
                    console.log("[WebhookRequestHandler] Malformed FortDetailsResponse");
                }
                break;
            case 156: // GymGetInfoResponse
                var ggi = POGOProtos.Networking.Responses.GymGetInfoResponse.decode(base64_decode(data));
                if (ggi) {
                    gymInfos.push(ggi);
                } else {
                    console.log("[WebhookRequestHandler] Malformed GymGetInfoResponse");
                }
                break;
            case 106: // GetMapObjectsResponse
                containsGMO = true;
                var gmo = POGOProtos.Networking.Responses.GetMapObjectsResponse.decode(base64_decode(data));
                if (gmo) {
                    isInvalidGMO = false;
                    
                    var newWildPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_WildPokemon, timestampMs: UInt64}];
                    var newNearbyPokemons = []; //[{cell: UInt64, data: POGOProtos_Map_Pokemon_NearbyPokemon}];
                    var newClientWeathers = []; //[{cell: Int64, data: POGOProtos_Map_Weather_ClientWeather}];
                    var newForts = []; //[{cell: UInt64, data: POGOProtos_Map_Fort_FortData}];
                    var newCells = []; //[UInt64];

                    var mapCellsNew = gmo.map_cells;
                    if (mapCellsNew.length === 0) {
                        console.log("Map cells is empty");
                        return;
                    }
                    mapCellsNew.forEach(function(mapCell) {
                        var timestampMs = mapCell.current_timestamp_ms;
                        var wildNew = mapCell.wild_pokemons;
                        wildNew.forEach(function(wildPokemon) {
                            wildPokemons.push({
                                cell: mapCell.s2_cell_id,
                                data: wildPokemon,
                                timestampMs: timestampMs
                            });
                        });
                        var nearbyNew = mapCell.nearby_pokemons;
                        nearbyNew.forEach(function(nearbyPokemon) {
                            nearbyPokemons.push({
                                cell: mapCell.s2_cell_id,
                                data: nearbyPokemon
                            });
                        });
                        var fortsNew = mapCell.forts;
                        fortsNew.forEach(function(fort) {
                            forts.push({
                                cell: mapCell.s2_cell_id,
                                data: fort
                            });
                        });
                        cells.push(mapCell.s2_cell_id);
                    });
    
                    var weather = gmo.client_weather;
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

    var targetCoord;
    var inArea = false
    if (latTarget !== undefined && lonTarget !== undefined) {
        targetCoord = { latitude: latTarget, longitude: lonTarget };
    } else {
        targetCoord = null;
    }
    
    var pokemonCoords;
    
    if (targetCoord !== null) {
        if (forts !== undefined) {
            forts.forEach(function(fort) {
                if (inArea === false) {
                    //let coord = CLLocationCoordinate2D(latitude: fort.data.latitude, longitude: fort.data.longitude)
                    var coord = { latitude: fort.data.latitude, longitude: fort.data.longitude };
                    //if (coord.distance(to: targetCoord) <= targetMaxDistance) {
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
                    var coord = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
                    //if (coord.distance(to: targetCoord) <= targetMaxDistance) {
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
                console.log("Cell:", cell);
                var cell = new S2Cell(new S2.S2CellId(cell.toString()))
                //var coord = new S2LatLng(cell.getCenter()).coord
                //if (coord.getDistance(targetCoord) <= max(targetMaxDistance, 100)) {
                    inArea = true
                //}
            }
        });
    }

    var data = {
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


    var listScatterPokemon = json["list_scatter_pokemon"];
    if (listScatterPokemon && pokemonCoords != undefined && pokemonEncounterId != undefined) {
        var uuid = json["uuid"];
        //var controller = InstanceController.global.getInstanceController(deviceUUID: uuid) as? IVInstanceController;
       
        var scatterPokemon = [];
        
        wildPokemons.forEach(function(pokemon) {
            //Don't return the main query in the scattershot list
            if (pokemon.data.encounter_id === pokemonEncounterId) {
                continue
            }
            
            try {
                let oldPokemon = Pokemon.getWithId(pokemon.data.encounter_id);
                if (oldPokemon !== undefined && oldPokemon.atkIv !== undefined) {
                    //Skip going to mons already with IVs.
                    continue
                }
            } catch {}
            
            //let coords = CLLocationCoordinate2D(latitude: pokemon.data.latitude, longitude: pokemon.data.longitude)
            var coords = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
            let distance = 35;//pokemonCoords.distance(to: coords)
            
            // Only Encounter pokemon within 35m of initial pokemon scann
            let pokemonId = parseInt(pokemon.data.pokemon_data.pokemon_id);
            /*
            if (distance <= 35 && controller.scatterPokemon.contains(pokemonId)) {
                scatterPokemon.push({
                    "lat": pokemon.data.latitude,
                    "lon": pokemon.data.longitude,
                    "id": pokemon.data.encounterID.description
                });
            }
            */
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
    var jsonO = {};
    try {
        jsonO = JSON.parse(req.body);
        //console.log("HandleControllerData Parsed:", jsonO);
    } catch (e) {
        console.log(e);
        return;
    }
    var typeO = jsonO["type"];
    var uuidO = jsonO["uuid"];
    if (typeO === undefined || uuidO === undefined) {
        console.log("Failed to parse controller data");
        return;
    }
    var type = typeO;
    var uuid = uuidO;
    var username = jsonO["username"];
    var minLevel = parseInt(jsonO["min_level"] || 0);
    var maxLevel = parseInt(jsonO["max_level"] || 29);

    switch (type) {
        case "init":
            //TODO: TryCatch
            var device = devices[uuid];
            var firstWarningTimestamp = null;
            if (device === undefined || device.accountUsername === undefined) {
                firstWarningTimestamp = null;
            } else {
                var account = accounts[device.accountUsername];
                if (account !== undefined) {
                    firstWarningTimestamp = account.firstWarningTimestamp;
                } else {
                    firstWarningTimestamp = null;
                }
            }
            if (device === undefined) {
                console.log("Registering device");
                // Register new device
                var newDevice = new Device(uuid, null, null, 0, null, 0.0, 0.0);
                newDevice.save();
                devices[uuid] = newDevice;
                res.send({ 
                    data: { 
                        assigned: false,
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            } else {
                // Device is already registered
                console.log("Device registered");
                res.send({
                    data: {
                        assigned: device.instanceName !== undefined,
                        first_warning_timestamp: firstWarningTimestamp
                    }
                });
            }
            break;
        case "heartbeat":
            // TODO: heartbeat
            res.send('OK');
            break;
        case "get_job":
            res.send({
                data: getTask(req, res)
            });
            break;
        case "get_account":
            var device = devices[uuid];
            var account = randomValue(accounts); // TODO: Get new account from level restrictions
            console.log("Random Account:", account);
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (device.accountUsername !== undefined) {
                var oldAccount = accounts[device.accountUsername];
                if (oldAccount !== undefined && oldAccount.firstWarningTimestamp === undefined && oldAccount.failed === undefined && oldAccount.failedTimestamp === undefined) {
                    res.send({
                        data: {
                            username: oldAccount.username,
                            password: oldAccount.password,
                            first_warning_timestamp: oldAccount.first_warning_timestamp,
                            level: oldAccount.level
                        }
                    });
                    return;
                }
            }

            device.accountUsername = account.username;
            device.save();
            res.send({
                data: {
                    username: account.username,
                    password: account.password,
                    first_warning_timestamp: account.firstWarningTimestamp//,
                    //level: account.level
                }
            });
            break;
        case "tutorial_done":
            var device = devices[uuid];
            var username = device.accountUsername;
            var account = accounts[username];
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (account.level === 0) {
                account.level = 1;
                account.save();
                res.send('OK');
            }
            break;
        case "account_banned":
            var device = devices[uuid];
            var username = device.accountUsername;
            var account = accounts[username];
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (account.failedTimestamp === undefined || account.failed === undefined) {
                account.failedTimestamp = 0; //TODO: Get js timestamp
                account.failed = "banned";
                account.save();
                res.send('OK');
            }
            break;
        case "account_warning":
            var device = devices[uuid];
            var username = device.accountUsername;
            var account = accounts[username];
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (account.firstWarningTimestamp === undefined) {
                account.firstWarningTimestamp = 0; //TODO: Get js timestamp
                account.save();
                res.send('OK');
            }
            break;
        case "account_invalid_credentials":
            var device = devices[uuid];
            var username = device.accountUsername;
            var account = accounts[username];
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (account.failedTimestamp === undefined || account.failed === undefined) {
                account.failedTimestamp = 0; //TODO: Get js timestamp
                account.failed = "invalid_credentials";
                account.save();
                res.send('OK');
            }
            break;
        case "error_26":
            var device = devices[uuid];
            var username = device.accountUsername;
            var account = accounts[username];
            if (device === undefined || account === undefined) {
                console.log("Failed to get account, device or account is null.");
                return;
            }
            if (account.failedTimestamp === undefined || account.failed === undefined) {
                account.failedTimestamp = 0; //TODO: Get js timestamp
                account.failed = "error_26";
                account.save();
                res.send('OK');
            }
            break;
        case "logged_out":
            var device = devices[uuid];
            device.accountUsername = null;
            device.save();
            res.send('OK');
            break;
        default:
            console.log("[WebhookRequestHandler] Unhandled Request:", type);
            break;
    }
}

function handleConsumables(cells, clientWeathers, wildPokemons, nearbyPokemons, forts, fortDetails, gymInfos, quests, encounters, username) {
    //let queue = Threading.getQueue(name: Foundation.UUID().uuidString, type: .serial)
    //queue.dispatch {

        var gymIdsPerCell = []; //[UInt64: [String]]
        var stopsIdsPerCell = []; //[UInt64: [String]]
        
        cells.forEach(function(cellId) {
            var s2cell = new S2.S2Cell(new S2.S2CellId(cellId.toString()));
            var lat = s2cell.getCapBound().getRectBound().getCenter().latDegrees;
            var lon = s2cell.getCapBound().getRectBound().getCenter().lngDegrees;
            var level = s2cell.level;
            var cell = new S2Cell({
                id: cellId.toString(),
                level: level,
                lat: lat,
                lon: lon,
                updated: new Date()
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
    
        var startClientWeathers = process.hrtime();
        clientWeathers.forEach(function(conditions) {
            //console.log("Parsed weather", conditions.cell);
            var ws2cell = new S2.S2Cell(new S2.S2CellId(conditions.cell.toString()));
            var wlat = ws2cell.getCapBound().getRectBound().getCenter().latDegrees;
            var wlon = ws2cell.getCapBound().getRectBound().getCenter().lngDegrees;
            var wlevel = ws2cell.level;
            //var weather = Weather(ws2cell.cellId.id, wlevel, latitude: wlat, longitude: wlon, conditions: conditions.data, updated: nil)
            //weather.save(update: true)
            //client.addWeather(weather);
        });
        var endClientWeathers = process.hrtime(startClientWeathers);
        console.log("[WebhookRequestHandler] Weather Detail Count:", clientWeathers.length, "parsed in", endClientWeathers + "s");
    
        var startWildPokemon = process.hrtime();
        wildPokemons.forEach(function(wildPokemon) {
            var pokemon = new Pokemon({
                username: username,
                cellId: wildPokemon.cell,
                timestampMs: wildPokemon.timestamp_ms,
                wild: wildPokemon.data
            });
            //pokemon.save();
            client.addPokemon(pokemon);
        });
        var endWildPokemon = process.hrtime(startWildPokemon);
        console.log("[WebhookRequestHandler] Pokemon Count:", wildPokemons.length, "parsed in", endWildPokemon + "s");
    
        var startNearbyPokemon = process.hrtime();
        nearbyPokemons.forEach(function(nearbyPokemon) {
            var pokemon = new Pokemon({
                username: username,
                cellId: nearbyPokemon.cell,
                //timestampMs: nearbyPokemon.timestamp_ms,
                nearby: nearbyPokemon.data
            });
            //pokemon.save();
            client.addPokemon(pokemon);
        });
        var endNearbyPokemon = process.hrtime(startNearbyPokemon);
        console.log("[WebhookRequestHandler] NearbyPokemon Count:", nearbyPokemons.length, "parsed in", endNearbyPokemon + "s");
    
        var startForts = process.hrtime();
        forts.forEach(function(fort) {
            switch (fort.data.type) {
                case 0: // gym
                    var gym = new Gym({
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
                    var pokestop = new Pokestop({
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
        var endForts = process.hrtime(startForts);
        console.log("[WebhookRequestHandler] Forts Count:", forts.length, "parsed in", endForts + "s");
    
        if (fortDetails.length > 0) {
            var startFortDetails = process.hrtime();
            fortDetails.forEach(function(fort) {
                switch (fort.type) {
                    case 0: // gym
                        var gym;
                        try {
                            gym = Gym.getById(fort.id);
                        } catch (err) {
                            gym = null;
                        }
                        if (gym !== null) {
                            gym.addDetails(fort);
                            //gym.save();
                            client.addGym(gym);
                        }
                        break;
                    case 1: // checkpoint
                        var pokestop;
                        try {
                            pokestop = Pokestop.getById(fort.id);
                        } catch (err) {
                            pokestop = null;
                        }
                        if (pokestop !== null) {
                            pokestop.addDetails(fort);
                            //pokestop.save();
                            client.addPokestop(pokestop);
                        }
                        break;
                }
            });
            var endFortDetails = process.hrtime(startFortDetails);
            console.log("[WebhookRequestHandler] Forts Detail Count:", fortDetails.length, "parsed in", endFortDetails + "s");
        }
        
        if (gymInfos.length > 0) {
            var startGymInfos = process.hrtime();
            gymInfos.forEach(function(gymInfo) {
                var gym;
                try {
                    gym = Gym.getById(gymInfo.gym_status_and_defenders.pokemon_fort_proto.id);
                } catch (err) {
                    gym = null
                }
                if (gym !== null) {
                    gym.addGymInfo(gymInfo);
                    //gym.save();
                    client.addGym(gym);
                }
            });
            var endGymInfos = process.hrtime(startGymInfos);
            console.log("[WebhookRequestHandler] Forts Detail Count:", gymInfos.length, "parsed in", endGymInfos + "s");
        }
        
        if (quests.length > 0) {
            var startQuests = process.hrtime();
            quests.forEach(function(quest) {
                var pokestop;
                try {
                    pokestop = pokestops.getById(quest.fort_id);
                } catch (err) {
                    pokestop = null;
                }
                if (pokestop !== null) {
                    pokestop.addQuest(quest);
                    //pokestop.save();
                    client.addQuest(quest);
                }
            });
            var endQuests = process.hrtime(startQuests);
            console.log("[WebhookRequestHandler] Quest Count:", quests.length, "parsed in", endQuests + "s");
        }
        
        if (encounters.length > 0) {
            var startEncounters = process.hrtime();
            encounters.forEach(function(encounter) {
                var pokemon;
                try {
                    pokemon = Pokemon.getById(encounter.wild_pokemon.encounter_id);
                } catch (err) {
                    pokemon = null;
                }
                if (pokemon !== null) {
                    pokemon.addEncounter(encounter, username);
                    //pokemon.save();
                    client.addPokemon(pokemon);
                } else {
                    var centerCoord = new S2.S2Point(encounter.wild_pokemon.latitude, encounter.wild_pokemon.longitude);
                    var center = S2.S2LatLng.fromPoint(centerCoord);
                    var centerNormalized = center.normalized();
                    var centerNormalizedPoint = centerNormalized.toPoint();
                    //var circle = new S2.S2Cap(centerNormalizedPoint, 0.0);
                    var circle = new S2.S2Cap(centerCoord, 0.0);
                    var coverer = new S2.S2RegionCoverer();
                    coverer.maxCells = 1;
                    coverer.minLevel = 15;
                    coverer.maxLevel = 15;
                    var cellIds = coverer.getCoveringCells(circle);
                    console.log(cellIds);
                    //if (cellId)
                    /*
                    if (cellID = cellIDs.first) {
                        var newPokemon = Pokemon(
                            encounter.wildPokemon,
                            cellID.uid,
                            UInt64(Date().timeIntervalSince1970 * 1000),
                            username)
                        newPokemon.addEncounter(encounter, username)
                        newPokemon.save() // TODO: UpdateIV true
                    }
                    */
                }
            });
            var endEncounters = process.hrtime(startEncounters);
            console.log("[WebhookRequestHandler] Encounter Count:", encounters.length, "parsed in ", endEncounters + "s");
        }
}

/**
 * Gets a task for the device.
 * @param {*} req 
 * @param {*} res 
 */
function getTask(req, res) {
    var lats = {
        "lat1": 34.096071
    };
    var lons = {
        "lon1": -117.648403
    };
    var data = {
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
    var keys = Object.keys(obj)
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
module.exports = WebhookRequestHandler;