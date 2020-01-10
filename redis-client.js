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
    var startTime = process.hrtime();

    var pkmnKeys = Object.keys(pokemonList);
    if (pkmnKeys.length > 0) {
        console.log("[REDIS] Pokemon", pkmnKeys.length);
        pkmnKeys.forEach(function(id) {
            var pokemon = pokemonList[id];
            if (pokemon !== undefined && pokemon !== null) {
                var keys = Object.keys(pokemon);
                keys.forEach(function(key) {
                    client.hset(pokemon.id, key, pokemon[key]);//, redis.print);
                });
            }
        });
    }

    var gymKeys = Object.keys(gymList);
    if (gymKeys.length > 0) {
        console.log("[REDIS] Gyms", gymKeys.length);
        gymKeys.forEach(function(id) {
            var gym = gymList[id];
            if (gym !== undefined && gym !== null) {
                var keys = Object.keys(gym);
                keys.forEach(function(key) {
                    client.hset(gym.id, key, gym[key]);//, redis.print);
                });
            }
        });
    }

    var raidKeys = Object.keys(raidList);
    if (raidKeys.length > 0) {
        console.log("[REDIS] Raids", raidKeys.length);
        raidKeys.forEach(function(id) {
            var raid = raidKeys[id];
            if (raid !== undefined && raid !== null) {
                var keys = Object.keys(raid);
                keys.forEach(function(key) {
                    client.hset(raid.id, key, raid[key]);//, redis.print);
                });
            }
        });
    }

    var pokestopKeys = Object.keys(pokestopList);
    if (pokestopKeys.length > 0) {
        console.log("[REDIS] Pokestops", pokestopKeys.length);
        pokestopKeys.forEach(function(id) {
            var pokestop = pokestopKeys[id];
            if (pokestop !== undefined && pokestop !== null) {
                var keys = Object.keys(pokestop);
                keys.forEach(function(key) {
                    client.hset(pokestop.id, key, pokestop[key]);//, redis.print);
                });
            }
        });
    }

    var questKeys = Object.keys(questList);
    if (questKeys.length > 0) {
        console.log("[REDIS] Quests", questKeys.length);
        questKeys.forEach(function(id) {
            var quest = questKeys[id];
            if (quest !== undefined && quest !== null) {
                var keys = Object.keys(quest);
                keys.forEach(function(key) {
                    client.hset(quest.id, key, quest[key]);//, redis.print);
                });
            }
        });
    }

    var spawnpointKeys = Object.keys(spawnpointList);
    if (spawnpointKeys.length > 0) {
        console.log("[REDIS] Spawnpoints", spawnpointKeys.length);
        spawnpointKeys.forEach(function(id) {
            var spawnpoint = spawnpointKeys[id];
            if (spawnpoint !== undefined && spawnpoint !== null) {
                var keys = Object.keys(spawnpoint);
                keys.forEach(function(key) {
                    client.hset(spawnpoint.id, key, spawnpoint[key]);//, redis.print);
                });
            }
        });
    }

    var cellKeys = Object.keys(cellList);
    if (cellKeys.length > 0) {
        console.log("[REDIS] Cells", cellKeys.length);
        cellKeys.forEach(function(id) {
            var cell = cellKeys[id];
            if (cell !== undefined && cell !== null) {
                var keys = Object.keys(cell);
                keys.forEach(function(key) {
                    client.hset(cell.id, key, cell[key]);//, redis.print);
                });
            }
        });
    }

    var endTime = process.hrtime(startTime);
    var total = getTotalCount();
    console.log("[REDIS] Cached", total, "objects in", endTime + "s");
}

function getTotalCount() {
    var pokemon = parseInt(Object.keys(pokemonList).length);
    var gyms = parseInt(Object.keys(gymList).length);
    var raids = parseInt(Object.keys(raidList).length);
    var pokestops = parseInt(Object.keys(pokestopList).length);
    var quests = parseInt(Object.keys(questList).length);
    var spawnpoints = parseInt(Object.keys(spawnpointList).length);
    var cells = parseInt(Object.keys(cellList).length);
    return pokemon + gyms + raids + pokestops + quests + spawnpoints + cells;
}

module.exports = RedisClient;