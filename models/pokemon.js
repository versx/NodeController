"use strict"

const pokemonPath = '../pokemon.json';
const pokemonDb   = require(pokemonPath);
const fs          = require('fs');

// Constructor
class Pokemon {
    constructor(data) {
        /*
        var data = $.extend({
            // Set defaults
            id: null,
            pokemon_id: null,
            form: null,
            lat: null,
            lon: null,
            gender: null,
            costume: null,
            weather: null,
            username: null,
            expireTimestamp: null,
            expireTimestampVerified: false,
            spawnId: null,
            cellId: null
        }, data);
        */
        this.id = data.id;
        this.pokemonId = data.pokemon_id;
        this.form = data.form;
        this.level = data.level;
        this.encounterId = data.encounter_id;
        if (data.wild !== undefined) {
            this.id = data.wild.encounter_id;
            this.pokemonId = data.wild.pokemon_data.pokemon_id;
            this.lat = data.wild.latitude;
            this.lon = data.wild.longitude;
            //var spawnId = UInt64(data.wild.spawnPointID, radix: 16);
            this.gender = data.wild.pokemon_data.pokemon_display.gender;
            this.form = data.wild.pokemon_data.pokemon_display.form;
            if (data.wild.pokemon_data.pokemon_display !== undefined) {
                this.costume = data.wild.pokemon_data.pokemon_display.costume;
                this.weather = data.wild.pokemon_data.pokemon_display.weather_boosted_condition;
            }
            this.username = data.username;
            if (data.wild.time_till_hidden_ms > 0 && data.wild.time_till_hidden_ms <= 90000) {
                this.expireTimestamp = parseInt((data.timestamp_ms + data.wild.time_till_hidden_ms) / 1000);
                this.expireTimestampVerified = true;
            } else {
                this.expireTimestampVerified = false;
            }
            if (this.expireTimestampVerified === false && spawnId !== undefined) {
                // Spawnpoint not verified, check if we have the tth.

            }
            this.spawnId = spawnId;
            this.cellId = data.cellId;
        } else if (data.nearby !== undefined) {
            this.id = data.nearby.encounter_id;
            this.pokemonId = data.nearby.pokemon_id;
            this.pokestopId = data.nearby.fort_id;
            this.gender = data.nearby.pokemon_data.pokemon_display.gender;
            this.form = data.nearby.pokemon_data.pokemon_display.form;
            if (data.nearby.pokemon_display !== undefined) {
                this.costume = data.nearby.pokemon_display.costume;
                this.weather = data.nearby.pokemon_display.weather_boosted_condition;
            }
            this.username = data.username;
            // TODO: Lookup pokestop_id for lat/lon
            this.cellId = data.cellId;
            this.expireTimestampVerified = false;
        }

        //this.save();
    }
    static getAll() {
        return pokemonDb;
    }
    save() {
        if (pokemonDb[this.id] !== undefined) {
            pokemonDb[this.id] = this;
            save(pokemonDb, pokemonPath);
        }
    }
    static load() {
        var data = fs.readFileSync(pokemonPath);
        return JSON.parse(data);
    }
}

/**
 * Save object as json string to file path.
 * @param {*} obj 
 * @param {*} path 
 */
function save(obj, path) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
module.exports = Pokemon;