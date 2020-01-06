"use strict"

const POGOProtos      = require('../pogo-protos');
const accountManagerO = require('./account.js');
const deviceManagerO  = require('./device.js');

//const S2              = require('@radarlabs/s2');

const accountManager  = new accountManagerO();
const deviceManager   = new deviceManagerO();

var accounts = accountManager.getAccounts();
var devices = deviceManager.getDevices();
var emptyCells = [];//[UInt64: Int]
var levelCache = {};

// Constructor
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
    //console.log("HandleRawData:", req.body);
    var jsonOpt = JSON.parse(req.body);
    //console.log("HandleRawData Parsed:", jsonOpt);
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
                accountManager.save();
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
        devices[uuid].lastSeen = new Date();
        devices[uuid].lastLat = latTarget;
        devices[uuid].lastlon = lonTarget;
        deviceManager.save();
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
                    if (pokemon.data.encounterID.description == pokemonEncounterId) {
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
                //let cell = S2Cell(cellId: S2CellId(uid: cell))
                //let coord = S2LatLng(point: cell.center).coord
                //if (coord.distance(to: targetCoord!) <= max(targetMaxDistance, 100)) {
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
            if (encounter.wildPokemon.encounterID.description === pokemonEncounterIdForEncounter){
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
    if (listScatterPokemon && pokemonCoords != nil && pokemonEncounterId != nil) {
        var uuid = json["uuid"];
        //var controller = InstanceController.global.getInstanceController(deviceUUID: uuid) as? IVInstanceController;
       
        var scatterPokemon = [];
        
        wildPokemons.forEach(function(pokemon) {
            //Don't return the main query in the scattershot list
            if (pokemon.data.encounterID.description === pokemonEncounterId) {
                continue
            }
            
            let pokemonId = parseInt(pokemon.data.pokemonData.pokemonID.rawValue);
            try {
                let oldPokemon = {};//try Pokemon.getWithId(mysql: mysql, id: pokemon.data.encounterID.description)
                if (oldPokemon !== undefined && oldPokemon.atkIv !== undefined) {
                    //Skip going to mons already with IVs.
                    continue
                }
            } catch {}
            
            //let coords = CLLocationCoordinate2D(latitude: pokemon.data.latitude, longitude: pokemon.data.longitude)
            var coords = { latitude: pokemon.data.latitude, longitude: pokemon.data.longitude };
            let distance = 35;//pokemonCoords.distance(to: coords)
            
            // Only Encounter pokemon within 35m of initial pokemon scann
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
        gymInfos,quests,encounters
    );
}

/**
 * Handles the controller endpoint.
 * @param {*} req 
 * @param {*} res 
 */
function _handleControllerData(req, res) {
    //console.log("HandleControllerData:", req.body);
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
                var newDevice = {
                    uuid: uuid,
                    instanceName: null,
                    lastHost: null,
                    lastSeen: 0,
                    accountUsername: null,
                    lastLat: 0.0,
                    lastLon: 0.0
                };
                devices[uuid] = newDevice;
                deviceManager.save();
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
            deviceManager.save();
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
                accountManager.save();
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
                accountManager.save();
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
                accountManager.save();
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
                accountManager.save();
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
                accountManager.save();
                res.send('OK');
            }
            break;
        case "logged_out":
            var device = devices[uuid];
            device.accountUsername = null;
            deviceManager.save();
            res.send('OK');
            break;
        default:
            console.log("[WebhookRequestHandler] Unhandled Request:", type);
            break;
    }
}

function handleConsumables(cells, clientWeathers, wildPokemons, nearbyPokemons, forts, fortDetails, gymInfos, quests, encounters) {
    //let queue = Threading.getQueue(name: Foundation.UUID().uuidString, type: .serial)
    //queue.dispatch {

        var gymIdsPerCell = []; //[UInt64: [String]]()
        var stopsIdsPerCell = []; //[UInt64: [String]]()
        
        cells.forEach(function(cellId) {
            console.log("CellId:", cellId);
            //let s2cell = S2Cell(cellId: S2CellId(uid: cellId))
            //let lat = s2cell.capBound.rectBound.center.lat.degrees
            //let lon = s2cell.capBound.rectBound.center.lng.degrees
            //let level = s2cell.level
            //let cell = Cell(id: cellId, level: UInt8(level), centerLat: lat, centerLon: lon, updated: undefined)
            //try? cell.save(mysql: mysql, update: true)
            
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
            //let ws2cell = S2Cell(cellId: S2CellId(id: conditions.cell))
            //let wlat = ws2cell.capBound.rectBound.center.lat.degrees
            //let wlon = ws2cell.capBound.rectBound.center.lng.degrees
            //let wlevel = ws2cell.level
            //let weather = Weather(mysql: mysql, id: ws2cell.cellId.id, level: UInt8(wlevel), latitude: wlat, longitude: wlon, conditions: conditions.data, updated: nil)
            //try? weather.save(mysql: mysql, update: true)
        });
        var endClientWeathers = process.hrtime(startClientWeathers);
        console.log("[WebhookRequestHandler] Weather Detail Count:", clientWeathers.length, "parsed in", endClientWeathers + "s");
    
        var startWildPokemon = process.hrtime();
        wildPokemons.forEach(function(wildPokemon) {
            //console.log("Parsed wildPokemon", wildPokemon.data);
            //let pokemon = Pokemon(mysql: mysql, wildPokemon: wildPokemon.data, cellId: wildPokemon.cell, timestampMs: wildPokemon.timestampMs, username: username)
            //try? pokemon.save(mysql: mysql)
        });
        var endWildPokemon = process.hrtime(startWildPokemon);
        console.log("[WebhookRequestHandler] Pokemon Count:", wildPokemons.length, "parsed in", endWildPokemon + "s");
    
        var startNearbyPokemon = process.hrtime();
        nearbyPokemons.forEach(function(nearbyPokemon) {
            //console.log("Parsed nearbyPokemon", nearbyPokemon.data);
            //let pokemon = try? Pokemon(mysql: mysql, nearbyPokemon: nearbyPokemon.data, cellId: nearbyPokemon.cell, username: username)
            //try? pokemon?.save(mysql: mysql)
        });
        var endNearbyPokemon = process.hrtime(startNearbyPokemon);
        console.log("[WebhookRequestHandler] NearbyPokemon Count:", nearbyPokemons.length, "parsed in", endNearbyPokemon + "s");
    
        var startForts = process.hrtime();
        forts.forEach(function(fort) {
            switch (fort.data.type) {
                case 0: // gym
                    //var gym = Gym(fortData: fort.data, cellId: fort.cell);
                    //try? gym.save(mysql: mysql);
                    if (gymIdsPerCell[fort.cell] === undefined) {
                        gymIdsPerCell[fort.cell] = [];
                    }
                    gymIdsPerCell[fort.cell].push(fort.data.id);
                    break;
                case 1: // checkpoint
                    //let pokestop = Pokestop(fortData: fort.data, cellId: fort.cell);
                    //try? pokestop.save(mysql: mysql);
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
                            gym = {}; //try Gym.getWithId(mysql: mysql, id: fort.fortID)
                        } catch (err) {
                            gym = null;
                        }
                        if (gym !== undefined) {
                            //gym.addDetails(fortData: fort)
                            //try gym.save(mysql: mysql)
                        }
                        break;
                    case 1: // checkpoint
                        var pokestop;
                        try {
                            pokestop = {}; //try Pokestop.getWithId(mysql: mysql, id: fort.fortID)
                        } catch (err) {
                            pokestop = null;
                        }
                        if (pokestop !== undefined) {
                            //pokestop.addDetails(fortData: fort)
                            //try pokestop.save(mysql: mysql)
                        }
                        break;
                }
            });
            var endFortDetails = process.hrtime(endFortDetails);
            console.log("[WebhookRequestHandler] Forts Detail Count:", fortDetails.length, "parsed in", endFortDetails + "s");
        }
        
        if (gymInfos.length > 0) {
            var startGymInfos = process.hrtime();
            gymInfos.forEach(function(gymInfo) {
                var gym;
                try {
                    gym = {}; //try Gym.getWithId(mysql: mysql, id: gymInfo.gymStatusAndDefenders.pokemonFortProto.id)
                } catch (err) {
                    gym = null
                }
                if (gym !== undefined) {
                    //gym.addDetails(gymInfo: gymInfo)
                    //try gym.save(mysql: mysql)
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
                    pokestop = {}; //Pokestop.getWithId(mysql: mysql, id: quest.fortID)
                } catch (err) {
                    pokestop = null;
                }
                if (pokestop !== undefined) {
                    //pokestop.addQuest(questData: quest)
                    //try pokestop.save(mysql: mysql, updateQuest: true)
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
                    pokemon = {}; //try Pokemon.getWithId(mysql: mysql, id: encounter.wildPokemon.encounterID.description)
                } catch (err) {
                    pokemon = null;
                }
                if (pokemon !== undefined) {
                    //pokemon.addEncounter(encounterData: encounter, username: username)
                    //try? pokemon!.save(mysql: mysql, updateIV: true)
                    console.log("[Encounter] Add encounter data:", encounter);
                } else {
                    /*
                    let centerCoord = CLLocationCoordinate2D(latitude: encounter.wildPokemon.latitude, longitude: encounter.wildPokemon.longitude)
                    let center = S2LatLng(coord: centerCoord)
                    let centerNormalizedPoint = center.normalized.point
                    let circle = S2Cap(axis: centerNormalizedPoint, height: 0.0)
                    let coverer = S2RegionCoverer()
                    coverer.maxCells = 1
                    coverer.maxLevel = 15
                    coverer.minLevel = 15
                    let cellIDs = coverer.getCovering(region: circle)
                    if (cellID = cellIDs.first) {
                        let newPokemon = Pokemon(
                            wildPokemon: encounter.wildPokemon,
                            cellId: cellID.uid,
                            timestampMs: UInt64(Date().timeIntervalSince1970 * 1000),
                            username: username)
                        newPokemon.addEncounter(encounterData: encounter, username: username)
                        //try newPokemon.save(mysql: mysql, updateIV: true)
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