"use strict"

import { Spawnpoint } from "./spawnpoint";
import * as moment from 'moment';

const pokemonPath = './data/pokemon.json';
const fs          = require('fs');

// TODO: Implement mysql
class Pokemon /*extends Consumable*/ {
    static Pokemon = {};

    id: string;
    lat: number;
    lon: number;
    pokemonId: number;
    form: number;
    gender: number;
    costume: number;
    shiny: boolean;
    weather: number;
    level: number;
    cp: number;
    move1: number;
    move2: number;
    size: number;
    weight: number;
    spawnId: string;
    expireTimestamp: number;
    expireTimestampVerified: boolean;
    firstSeenTimestamp: number;
    pokestopId: string;
    atkIv: number;
    defIv: number;
    staIv: number;
    username: string;
    updated: number;
    changed: number;
    cellId: string;

    constructor(data: any) {
        /*super(id, lat, lon);*/
        if (data.wild !== undefined) {
            this.id = data.wild.encounter_id.toString();
            this.pokemonId = data.wild.pokemon_data.pokemon_id;
            this.lat = data.wild.latitude;
            this.lon = data.wild.longitude;
            let spawnId = data.wild.spawn_point_id; //radix: 16);
            this.gender = data.wild.pokemon_data.pokemon_display.gender;
            this.form = data.wild.pokemon_data.pokemon_display.form;
            if (data.wild.pokemon_data.pokemon_display !== undefined) {
                this.costume = data.wild.pokemon_data.pokemon_display.costume;
                this.weather = data.wild.pokemon_data.pokemon_display.weather_boosted_condition;
            }
            this.username = data.username;
            if (data.wild.time_till_hidden_ms > 0 && data.wild.time_till_hidden_ms <= 90000) {
                this.expireTimestamp = (data.timestamp_ms + data.wild.time_till_hidden_ms) / 1000;
                this.expireTimestampVerified = true;
            } else {
                this.expireTimestampVerified = false;
            }
            if (this.expireTimestampVerified === false && spawnId !== undefined) {
                // Spawnpoint not verified, check if we have the tth.
                let spawnpoint = {};
                try {
                    spawnpoint = Spawnpoint.getById(spawnId);
                } catch (err) {
                    spawnpoint = null;
                }
                if (spawnpoint instanceof Spawnpoint && spawnpoint !== null) {
                    let despawnSecond = spawnpoint.despawnSecond;
                    if (despawnSecond !== undefined && despawnSecond !== null) {
                        let date = moment().format('mm:ss');
                        let split = date.split(':');
                        let minute = parseInt(split[0]);
                        let second = parseInt(split[1]);
                        let secondOfHour = second + minute * 60;
                    
                        let despawnOffset;
                        if (despawnSecond < secondOfHour) {
                            despawnOffset = 3600 + despawnSecond - secondOfHour;
                        } else {
                            despawnOffset = despawnSecond - secondOfHour;
                        }
                        this.expireTimestamp = parseInt(moment(date).format('x')) + despawnOffset;
                        this.expireTimestampVerified = true;
                    }
                }
            }
            this.spawnId = spawnId;
            this.cellId = data.cellId.toString();
        } else if (data.nearby !== undefined) {
            this.id = data.nearby.encounter_id.toString();
            this.pokemonId = data.nearby.pokemon_id;
            this.pokestopId = data.nearby.fort_id;
            this.gender = data.nearby.pokemon_display.gender;
            this.form = data.nearby.pokemon_display.form;
            if (data.nearby.pokemon_display !== undefined) {
                this.costume = data.nearby.pokemon_display.costume;
                this.weather = data.nearby.pokemon_display.weather_boosted_condition;
            }
            this.username = data.username;
            // TODO: Lookup pokestop_id for lat/lon
            this.cellId = data.cellId.toString();
            this.expireTimestampVerified = false;
        } else {
            this.id = data.id.toString();
            this.lat = data.lat;
            this.lon = data.lon;
            this.pokemonId = data.pokemonId;
            this.form = data.form;
            this.level = data.level;
            this.costume = data.costume;
            this.weather = data.weather;
            this.gender = data.gender;
            this.spawnId = data.spawnId;
            this.cellId = data.cellId.toString();
            this.expireTimestamp = data.expireTimestamp;
            this.expireTimestampVerified = data.expireTimestampVerified;
            this.cp = data.cp;
            this.move1 = data.move1;
            this.move2 = data.move2;
            this.size = data.height;
            this.weight = data.weight;
            this.atkIv = data.atkIv;
            this.defIv = data.defIv;
            this.staIv = data.staIv;
            this.username = data.username;
            this.updated = data.updated;
            this.changed = data.changed;
        }
    }
    static getAll() {
        return this.load();
    }
    static getById(encounterId: string) {
        return this.Pokemon[encounterId.toString()];
    }
    async addEncounter(encounter: any, username: string) {
        this.pokemonId = encounter.wild_pokemon.pokemon_data.pokemon_id;
        this.cp = encounter.wild_pokemon.pokemon_data.cp;
        this.move1 = encounter.wild_pokemon.pokemon_data.move1;
        this.move2 = encounter.wild_pokemon.pokemon_data.move2;
        this.size = encounter.wild_pokemon.pokemon_data.height_m;
        this.weight = encounter.wild_pokemon.pokemon_data.weight_kg;
        this.atkIv = encounter.wild_pokemon.pokemon_data.individual_attack;
        this.defIv = encounter.wild_pokemon.pokemon_data.individual_defense;
        this.staIv = encounter.wild_pokemon.pokemon_data.individual_stamina;
        this.costume = encounter.wild_pokemon.pokemon_data.pokemon_display.costume;
        this.shiny = encounter.wild_pokemon.pokemon_data.pokemon_display.shiny;
        this.username = username;
        this.form = encounter.wild_pokemon.pokemon_data.pokemon_display.form;
        this.gender = encounter.wild_pokemon.pokemon_data.pokemon_display.gender;
        let cpMultiplier: number = encounter.wild_pokemon.pokemon_data.cp_multiplier;
        let level: number;
        if (cpMultiplier < 0.734) {
            level = Math.round(58.35178527 * cpMultiplier * cpMultiplier - 2.838007664 * cpMultiplier + 0.8539209906);
        } else {
            level = Math.round(171.0112688 * cpMultiplier - 95.20425243);
        }
        this.level = level
        /*
        this.isDitto = Pokemon.isDittoDisguised(this.pokemonId,
                                                this.level || 0,
                                                this.weather || 0,
                                                this.atkIv || 0,
                                                this.defIv || 0,
                                                this.staIv || 0
        )
        if (this.isDitto) {
            console.log("[POKEMON] Pokemon", this.id, " Ditto found, disguised as ", this.pokemonId);
            this.setDittoAttributes(displayPokemonId: this.pokemonId);
        }
        */
        
        if (this.spawnId === undefined) {
            this.spawnId = encounter.wild_pokemon.spawn_point_id;//, radix: 16)
            this.lat = encounter.wild_pokemon.latitude;
            this.lon = encounter.wild_pokemon.longitude;

            if (this.expireTimestampVerified === false && this.spawnId !== undefined) {
                let spawnpoint: Spawnpoint;
                try {
                    spawnpoint = await Spawnpoint.getById(this.spawnId);
                } catch (err) {
                    spawnpoint = null;
                }
                if (spawnpoint instanceof Spawnpoint && spawnpoint !== null) {
                    let despawnSecond = spawnpoint.despawnSecond;
                    if (despawnSecond !== undefined && despawnSecond !== null) {
                        let date = moment().format('mm:ss');
                        let split = date.split(':');
                        let minute = parseInt(split[0]);
                        let second = parseInt(split[1]);
                        let secondOfHour = second + minute * 60;
                    
                        let despawnOffset: number;
                        if (despawnSecond < secondOfHour) {
                            despawnOffset = 3600 + despawnSecond - secondOfHour;
                        } else {
                            despawnOffset = despawnSecond - secondOfHour;
                        }
                        this.expireTimestamp = parseInt(moment(date).format('x')) + despawnOffset;
                        this.expireTimestampVerified = true;
                    }
                }
            }            
        }
        
        this.updated = new Date().getUTCSeconds();
        this.changed = this.updated;
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Pokemon.Pokemon[this.id] = this;
        save(Pokemon.Pokemon, pokemonPath);
    }
    static load() {
        let data = fs.readFileSync(pokemonPath);
        let keys = Object.keys(data);
        keys.forEach(function(key) {
            this.Pokemon[key] = new Pokemon(data[key]);
        });
        //this.Pokemon = JSON.parse(data);
        return this.Pokemon;
    }
}

/**
 * Save object as json string to file path.
 * @param {*} obj 
 * @param {*} path 
 */
function save(obj: any, path: string) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
export { Pokemon };