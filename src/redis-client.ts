"use strict"

const redis  = require('redis');
const client = redis.createClient();

client.on('connect', function() {
    console.log('Redis client connected');
});
client.on('error', function(err){
    console.log('Error occurred:', err)
});

var timerInterval = 10 * 1000; // 10 seconds
setInterval(distributeConsumables, timerInterval);

var pokemonList = {};
var gymList = {};
var raidList = {};
var pokestopList = {};
var questList = {};
var spawnpointList = {};
var cellList = {};

class RedisClient {
    constructor() {
        //setTimeout(distributeConsumables, timerInterval);
    }
    get(key) {
        return client.get(key, function(err, result) {
            if (err) throw err;
            console.log("[REDIS] get:", result);
            return key;
        });
    }
    addPokemon(pokemon) {
        pokemonList[pokemon.id] = pokemon;
    }
    addGym(gym) {
        gymList[gym.id] = gym;
    }
    addRaid(raid) {
        //var keys = Object.keys(raid);
        //keys.forEach(function(key) {
        //    client.hset(raid.id, key, raid[key], redis.print);
            raidList[raid.id] = raid;
        //});
    }
    addPokestop(pokestop) {
        //var keys = Object.keys(pokestop);
        //keys.forEach(function(key) {
        //    client.hset(pokestop.id, key, pokestop[key], redis.print);
            pokestopList[pokestop.id] = pokestop;
        //});
    }
    addQuest(quest) {
        //var keys = Object.keys(quest);
        //keys.forEach(function(key) {
        //    client.hset(quest.id, key, quest[key], redis.print);
            questList[quest.id] = quest;
        //});
    }
    addSpawnpoint(spawnpoint) {
        //var keys = Object.keys(spawnpoint);
        //keys.forEach(function(key) {
        //    client.hset(spawnpoint.id, key, spawnpoint[key], redis.print);
            spawnpointList[spawnpoint.id] = spawnpoint;
        //});
    }
    addCell(cell) {
        cellList[cell.id] = cell;
    }
}

function distributeConsumables() {
    console.log("[REDIS] Distributing consumables...");
    let startTime = process.hrtime();

    let pkmnKeys = Object.keys(pokemonList);
    if (pkmnKeys.length > 0) {
        console.log("[REDIS] Pokemon", pkmnKeys.length);
        pkmnKeys.forEach(function(id) {
            let pokemon = pokemonList[id];
            if (pokemon !== undefined && pokemon !== null) {
                let keys = Object.keys(pokemon);
                keys.forEach(function(key) {
                    client.hset(pokemon.id, key, pokemon[key]);//, redis.print);
                });
            }
        });
    }

    let gymKeys = Object.keys(gymList);
    if (gymKeys.length > 0) {
        console.log("[REDIS] Gyms", gymKeys.length);
        gymKeys.forEach(function(id) {
            let gym = gymList[id];
            if (gym !== undefined && gym !== null) {
                let keys = Object.keys(gym);
                keys.forEach(function(key) {
                    client.hset(gym.id, key, gym[key]);//, redis.print);
                });
            }
        });
    }

    let raidKeys = Object.keys(raidList);
    if (raidKeys.length > 0) {
        console.log("[REDIS] Raids", raidKeys.length);
        raidKeys.forEach(function(id) {
            let raid = raidKeys[id];
            if (raid !== undefined && raid !== null) {
                let keys = Object.keys(raid);
                keys.forEach(function(key) {
                    client.hset(raid.id, key, raid[key]);//, redis.print);
                });
            }
        });
    }

    let pokestopKeys = Object.keys(pokestopList);
    if (pokestopKeys.length > 0) {
        console.log("[REDIS] Pokestops", pokestopKeys.length);
        pokestopKeys.forEach(function(id) {
            let pokestop = pokestopKeys[id];
            if (pokestop !== undefined && pokestop !== null) {
                let keys = Object.keys(pokestop);
                keys.forEach(function(key) {
                    client.hset(pokestop.id, key, pokestop[key]);//, redis.print);
                });
            }
        });
    }

    let questKeys = Object.keys(questList);
    if (questKeys.length > 0) {
        console.log("[REDIS] Quests", questKeys.length);
        questKeys.forEach(function(id) {
            let quest = questKeys[id];
            if (quest !== undefined && quest !== null) {
                let keys = Object.keys(quest);
                keys.forEach(function(key) {
                    client.hset(quest.id, key, quest[key]);//, redis.print);
                });
            }
        });
    }

    let spawnpointKeys = Object.keys(spawnpointList);
    if (spawnpointKeys.length > 0) {
        console.log("[REDIS] Spawnpoints", spawnpointKeys.length);
        spawnpointKeys.forEach(function(id) {
            let spawnpoint = spawnpointKeys[id];
            if (spawnpoint !== undefined && spawnpoint !== null) {
                let keys = Object.keys(spawnpoint);
                keys.forEach(function(key) {
                    client.hset(spawnpoint.id, key, spawnpoint[key]);//, redis.print);
                });
            }
        });
    }

    let cellKeys = Object.keys(cellList);
    if (cellKeys.length > 0) {
        console.log("[REDIS] Cells", cellKeys.length);
        cellKeys.forEach(function(id) {
            let cell = cellKeys[id];
            if (cell !== undefined && cell !== null) {
                let keys = Object.keys(cell);
                keys.forEach(function(key) {
                    client.hset(cell.id, key, cell[key]);//, redis.print);
                });
            }
        });
    }

    let endTime = process.hrtime(startTime);
    let total = getTotalCount();
    console.log("[REDIS] Cached", total, "objects in", endTime + "s");
}

function getTotalCount() {
    let pokemon = Object.keys(pokemonList).length;
    let gyms = Object.keys(gymList).length;
    let raids = Object.keys(raidList).length;
    let pokestops = Object.keys(pokestopList).length;
    let quests = Object.keys(questList).length;
    let spawnpoints = Object.keys(spawnpointList).length;
    let cells = Object.keys(cellList).length;
    return pokemon + gyms + raids + pokestops + quests + spawnpoints + cells;
}

// Export the class
export { RedisClient };