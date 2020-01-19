"use strict"

// Imports
import { Assignment } from './models/assignment';
import { Device } from './models/device';
import { DeviceGroup } from './models/device-group';
import { Instance } from './models/instance';
import { Gym } from './models/gym';
import { Pokemon } from './models/pokemon';
import { Pokestop } from './models/pokestop';
import { Spawnpoint } from './models/spawnpoint';
import { Cell } from './models/cell';
import { Weather } from './models/weather';

const DEVICE_LIST = 'DEVICE_LIST';
const INSTANCE_LIST = 'INSTANCE_LIST';
const ASSIGNMENT_LIST = 'ASSIGNMENT_LIST';

const config = require('./config.json');
const redis  = require('redis');
const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
});
const timerInterval = 10 * 1000; // 10 seconds

//const {promisify} = require('util');
//const getAsync = promisify(client.get).bind(client);

client.on('connect', function() {
    console.log('Redis client connected');
    console.log("DEVICE_LIST:", client.get(DEVICE_LIST));//, redis.print));
});
client.on('error', function(err: Error) {
    console.log('Error occurred:', err)
});

// necessities
let deviceList = {};
let instanceList = {};
let assignmentList = {};
let deviceGroupList = {};

// consumables
let pokemonList = {};
let gymList = {};
let raidList = {};
let pokestopList = {};
let questList = {};
let spawnpointList = {};
let cellList = {};
let weatherList = {};

/**
 * Redis cache client class.
 */
class RedisClient {
    /**
     * Initialize a new Redis client object.
     */
    constructor() {
        //setInterval(cacheConsumables, timerInterval);
        //setInterval(cacheNecessities, timerInterval);
    }
    saveDevices() {
        let json = JSON.stringify(deviceList, null, 2);
        client.set(DEVICE_LIST, json);
    }
    saveInstances() {
        let json = JSON.stringify(instanceList, null, 2);
        client.set(INSTANCE_LIST, json);
    }
    saveAssignments() {
        let json = JSON.stringify(assignmentList, null, 2);
        client.set(ASSIGNMENT_LIST, json);
    }
    /**
     * 
     * @param key 
     */
    get(key: string): any {
        return client.get(key);
    }
    set(id: string, key: string, value: any) {
        //client.set
    }
    /**
     * 
     * @param device 
     */
    addDevice(device: Device) {
        deviceList[device.uuid] = device;
        this.saveDevices();
    }
    /**
     * 
     * @param instance 
     */
    addInstance(instance: Instance) {
        instanceList[instance.name] = instance;
    }
    /**
     * 
     * @param assignment 
     */
    addAssignment(assignment: Assignment) {
        let uuid = assignment.deviceUUID + "-" + assignment.instanceName + "-" + assignment.time;
        assignmentList[uuid] = assignment;
        this.saveAssignments();
    }
    /**
     * 
     * @param account 
     */
    addAccount(account: Account) {
        // REVIEW: Hmm probably shouldn't cache accounts :joy: but maybe
    }
    /**
     * 
     * @param deviceGroup 
     */
    addDeviceGroup(deviceGroup: DeviceGroup) {
        deviceGroupList[deviceGroup.name] = deviceGroup;
    }
    /**
     * 
     * @param pokemon 
     */
    addPokemon(pokemon: Pokemon) {
        pokemonList[pokemon.id] = pokemon;
    }
    /**
     * 
     * @param gym 
     */
    addGym(gym: Gym) {
        gymList[gym.id] = gym;
    }
    /**
     * 
     * @param raid 
     */
    addRaid(raid: Gym) {
        raidList[raid.id] = raid;
    }
    /**
     * 
     * @param pokestop 
     */
    addPokestop(pokestop: Pokestop) {
        pokestopList[pokestop.id] = pokestop;
    }
    /**
     * 
     * @param quest 
     */
    addQuest(quest: Pokestop) {
        questList[quest.id] = quest;
    }
    /**
     * 
     * @param spawnpoint 
     */
    addSpawnpoint(spawnpoint: Spawnpoint) {
        spawnpointList[spawnpoint.id] = spawnpoint;
    }
    /**
     * 
     * @param cell 
     */
    addCell(cell: Cell) {
        cellList[cell.id] = cell;
    }
    /**
     * 
     * @param weather 
     */
    addWeather(weather: Weather) {
        weatherList[weather.id] = weather;
    }
    deleteAllEntries() {
        
    }
}
/**
 * 
 */
function cacheNecessities() {
    console.log("[REDIS] Caching necessities...");
    let startTime = process.hrtime();

    if (deviceList) {
        let deviceKeys = Object.keys(deviceList);
        if (deviceKeys.length > 0) {
            console.log("[REDIS] Devices", deviceKeys.length);
            deviceKeys.forEach(id => {
                let device = deviceList[id];
                if (device instanceof Device) {
                    let keys = Object.keys(device);
                    keys.forEach(function(key) {
                        if (device[key]) {
                            client.hset(device.id, key, device[key] || "");//, redis.print);
                        }
                    });
                }
            });
        }
    }

    if (deviceGroupList) {
        let groupKeys = Object.keys(deviceGroupList);
        if (groupKeys.length > 0) {
            console.log("[REDIS] Device Groups", groupKeys.length);
            groupKeys.forEach(id => {
                let group = deviceGroupList[id];
                if (group instanceof DeviceGroup) {
                    let keys = Object.keys(group);
                    keys.forEach(function(key) {
                        if (group[key]) {
                            client.hset(group.id, key, group[key] || "");//, redis.print);
                        }
                    });
                }
            });
        }
    }

    if (instanceList) {
        let instanceKeys = Object.keys(instanceList);
        if (instanceKeys.length > 0) {
            console.log("[REDIS] Instances", instanceKeys.length);
            instanceKeys.forEach(id => {
                let instance = instanceList[id];
                if (instance instanceof Instance) {
                    let keys = Object.keys(instance);
                    keys.forEach(function(key) {
                        if (instance[key]) {
                            client.hset(instance.id, key, instance[key] || "");//, redis.print);
                        }
                    });
                }
            });
        }
    }

    if (assignmentList) {
        let assignmentKeys = Object.keys(assignmentList);
        if (assignmentKeys.length > 0) {
            console.log("[REDIS] Assignments", assignmentKeys.length);
            assignmentKeys.forEach(id => {
                let assignment = assignmentList[id];
                if (assignment instanceof Assignment) {
                    let keys = Object.keys(assignment);
                    keys.forEach(function(key) {
                        if (assignment[key]) {
                            client.hset(assignment.id, key, assignment[key] || "");//, redis.print);
                        }
                    });
                }
            });
        }
    }

    let endTime = process.hrtime(startTime);
    //let total = getTotalCount();
    //console.log("[REDIS] Cached", total, "objects in", endTime + "s");
}

/**
 * 
 */
function cacheConsumables() {
    // TODO: Properly implement caching
    console.log("[REDIS] Caching consumables...");
    let startTime = process.hrtime();

    if (pokemonList) {
        let pkmnKeys = Object.keys(pokemonList);
        if (pkmnKeys.length > 0) {
            console.log("[REDIS] Pokemon", pkmnKeys.length);
            pkmnKeys.forEach(function(id) {
                let pokemon = pokemonList[id];
                if (pokemon instanceof Pokemon) {
                    let keys = Object.keys(pokemon);
                    keys.forEach(function(key) {
                        client.hset(pokemon.id, key, pokemon[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (gymList) {
        let gymKeys = Object.keys(gymList);
        if (gymKeys.length > 0) {
            console.log("[REDIS] Gyms", gymKeys.length);
            gymKeys.forEach(function(id) {
                let gym = gymList[id];
                if (gym instanceof Gym) {
                    let keys = Object.keys(gym);
                    keys.forEach(function(key) {
                        client.hset(gym.id, key, gym[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (raidList) {
        let raidKeys = Object.keys(raidList);
        if (raidKeys.length > 0) {
            console.log("[REDIS] Raids", raidKeys.length);
            raidKeys.forEach(function(id) {
                let raid = raidList[id];
                if (raid instanceof Gym) {
                    let keys = Object.keys(raid);
                    keys.forEach(function(key) {
                        client.hset(raid.id, key, raid[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (pokestopList) {
        let pokestopKeys = Object.keys(pokestopList);
        if (pokestopKeys.length > 0) {
            console.log("[REDIS] Pokestops", pokestopKeys.length);
            pokestopKeys.forEach(function(id) {
                let pokestop = pokestopList[id];
                if (pokestop instanceof Pokestop) {
                    let keys = Object.keys(pokestop);
                    keys.forEach(function(key) {
                        client.hset(pokestop.id, key, pokestop[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (questList) {
        let questKeys = Object.keys(questList);
        if (questKeys.length > 0) {
            console.log("[REDIS] Quests", questKeys.length);
            questKeys.forEach(function(id) {
                let quest = questList[id];
                if (quest instanceof Pokestop) {
                    let keys = Object.keys(quest);
                    keys.forEach(function(key) {
                        client.hset(quest.id, key, quest[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (spawnpointList) {
        let spawnpointKeys = Object.keys(spawnpointList);
        if (spawnpointKeys.length > 0) {
            console.log("[REDIS] Spawnpoints", spawnpointKeys.length);
            spawnpointKeys.forEach(function(id) {
                let spawnpoint = spawnpointList[id];
                if (spawnpoint instanceof Spawnpoint) {
                    let keys = Object.keys(spawnpoint);
                    keys.forEach(function(key) {
                        client.hset(spawnpoint.id, key, spawnpoint[key] || "");//, redis.print);
                    });
                }
            });
        }
    }
    if (cellList) {
        let cellKeys = Object.keys(cellList);
        if (cellKeys.length > 0) {
            console.log("[REDIS] Cells", cellKeys.length);
            cellKeys.forEach(function(id) {
                let cell = cellList[id];
                if (cell instanceof Cell) {
                    let keys = Object.keys(cell);
                    keys.forEach(function(key) {
                        client.hset(cell.id, key, cell[key] || "");//, redis.print);
                    });
                }
            });
        }
    }

    let endTime = process.hrtime(startTime);
    let total = getTotalCount();
    console.log("[REDIS] Cached", total, "objects in", endTime + "s");
}

/**
 * 
 */
function getTotalCount() {
    let pokemon = Object.keys(pokemonList || {}).length;
    let gyms = Object.keys(gymList || {}).length;
    let raids = Object.keys(raidList || {}).length;
    let pokestops = Object.keys(pokestopList || {}).length;
    let quests = Object.keys(questList || {}).length;
    let spawnpoints = Object.keys(spawnpointList || {}).length;
    let cells = Object.keys(cellList || {}).length;
    return pokemon + gyms + raids + pokestops + quests + spawnpoints + cells;
}

// Export the class
export { client, RedisClient, DEVICE_LIST, INSTANCE_LIST, ASSIGNMENT_LIST };