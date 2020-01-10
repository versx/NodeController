"use strict"

const redis  = require('redis');
const client = redis.createClient();

client.on('error', function(err){
    console.log('Error occurred:', err)
});

class RedisClient {
    constructor() {

    }
    get(key) {
        return client.get(key, function(err, result) {
            if (err) throw err;
            console.log("RedisClient::get:", result);
        });
    }
    addPokemon(pokemon) {
        var keys = Object.keys(pokemon);
        keys.forEach(function(key) {
            client.hset(pokemon.id, keys[key], redis.print);
        });
    }
    addGym(gym) {
        var keys = Object.keys(gym);
        keys.forEach(function(key) {
            client.hset(gym.id, keys[key], redis.print);
        });
    }
    addRaid(raid) {
        var keys = Object.keys(raid);
        keys.forEach(function(key) {
            client.hset(raid.id, keys[key], redis.print);
        });
    }
    addPokestop(pokestop) {
        var keys = Object.keys(pokestop);
        keys.forEach(function(key) {
            client.hset(pokestop.id, keys[key], redis.print);
        });
    }
    addQuest(quest) {
        var keys = Object.keys(quest);
        keys.forEach(function(key) {
            client.hset(quest.id, keys[key], redis.print);
        });
    }
    addSpawnpoint(spawnpoint) {
        var keys = Object.keys(spawnpoint);
        keys.forEach(function(key) {
            client.hset(spawnpoint.id, keys[key], redis.print);
        });
    }
}

module.exports = RedisClient;