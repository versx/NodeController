"use strict"

// Imports
import { Gym } from './models/gym';
import { Pokemon } from './models/pokemon';
import { Pokestop } from './models/pokestop';
import { Spawnpoint } from './models/spawnpoint';
import { S2Cell } from './models/s2cell';
import { Weather } from './models/weather';
const config = require('config.json');
const redis  = require('redis');
const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
});
const timerInterval = 10 * 1000; // 10 seconds

client.on('connect', function() {
    console.log('Redis client connected');
});
client.on('error', function(err){
    console.log('Error occurred:', err)
});

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
        setInterval(distributeConsumables, timerInterval);
    }
    /**
     * 
     * @param key 
     */
    get(key: string) {
        return client.get(key, function(err, result) {
            if (err) throw err;
            console.log("[REDIS] get:", result);
            return key;
        });
    }
    addPokemon(pokemon: Pokemon) {
        pokemonList[pokemon.id] = pokemon;
    }
    addGym(gym: Gym) {
        gymList[gym.id] = gym;
    }
    addRaid(raid: Gym) {
        raidList[raid.id] = raid;
    }
    addPokestop(pokestop: Pokestop) {
        pokestopList[pokestop.id] = pokestop;
    }
    addQuest(quest: Pokestop) {
        questList[quest.id] = quest;
    }
    addSpawnpoint(spawnpoint: Spawnpoint) {
        spawnpointList[spawnpoint.id] = spawnpoint;
    }
    addCell(cell: S2Cell) {
        cellList[cell.id] = cell;
    }
    addWeather(weather: Weather) {
        weatherList[weather.id] = weather;
    }
}

function distributeConsumables() {
    // TODO: Properly implement caching
    console.log("[REDIS] Distributing consumables...");
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
                if (cell instanceof S2Cell) {
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
export { RedisClient };