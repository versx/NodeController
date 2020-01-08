"use strict"

const pokemonPath = 'pokemon.json';
const fs          = require('fs');

class Pokemon /*extends Consumable*/ {
    static Pokemon = {};
    constructor(data) {
        /*super(id, lat, lon);*/
        if (data.wild !== undefined) {
            this.id = data.wild.encounter_id.toString();
            this.pokemonId = data.wild.pokemon_data.pokemon_id;
            this.lat = data.wild.latitude;
            this.lon = data.wild.longitude;
            var spawnId = data.wild.spawn_point_id; //radix: 16);
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
                /*
                let spawnpoint: SpawnPoint
                do {
                    spawnpoint = try SpawnPoint.getWithId(id: spawnId!)
                } catch {
                    spawnpoint = nil
                }
                if let spawnpoint = spawnpoint, let despawnSecond = spawnpoint.despawnSecond {
                    let date = Date(timeIntervalSince1970: Double(timestampMs) / 1000)
                    
                    let formatter = DateFormatter()
                    formatter.dateFormat = "mm:ss"
                    let formattedDate = formatter.string(from: date)
                    
                    let split = formattedDate.components(separatedBy: ":")
                    let minute = Int(split[0])!
                    let second = Int(split[1])!
                    let secondOfHour = second + minute * 60
                    
                    let depsawnOffset: Int
                    if despawnSecond < secondOfHour {
                        depsawnOffset = 3600 + Int(despawnSecond) - secondOfHour
                    } else {
                        depsawnOffset = Int(despawnSecond) - secondOfHour
                    }
                    
                    self.expireTimestamp = UInt32(Int(date.timeIntervalSince1970) + depsawnOffset)
                    self.expireTimestampVerified = true
                }
                */
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
            this.expireTimeStamp = data.expireTimestamp;
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
    static getById(encounterId) {
        return this.Pokemon[encounterId.toString()];
    }
    addEncounter(encounter, username) {
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
        var cpMultiplier = encounter.wild_pokemon.pokemon_data.cp_multiplier;
        var level;
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
            var spawnId = encounter.wild_pokemon.spawn_point_id;//, radix: 16)
            this.spawnId = spawnId;
            this.lat = encounter.wild_pokemon.latitude;
            this.lon = encounter.wild_pokemon.longitude;

            if (this.expireTimestampVerified === false && spawnId !== undefined) {
                /*
                var spawnpoint;
                try {
                    spawnpoint = Spawnpoint.getById(spawnId);
                } catch (err) {
                    spawnpoint = null;
                }
                if (spawnpoint = spawnpoint, despawnSecond = spawnpoint.despawnSecond) {
                    var date = Date();
                    
                    var formatter = DateFormatter();
                    formatter.dateFormat = "mm:ss";
                    var formattedDate = formatter.string(date);
                    
                    var split = formattedDate.split(":");
                    var minute = parseInt(split[0]);
                    var second = parseInt(split[1]);
                    var secondOfHour = second + minute * 60;
                    
                    var depsawnOffset;
                    if (despawnSecond < secondOfHour) {
                        depsawnOffset = 3600 + parseInt(despawnSecond) - secondOfHour
                    } else {
                        depsawnOffset = parseInt(despawnSecond) - secondOfHour
                    }
                    
                    this.expireTimestamp = parseInt(date.timeIntervalSince1970) + depsawnOffset;
                    this.expireTimestampVerified = true
                }
                */
            }            
        }
        
        this.updated = parseInt(new Date());
        this.changed = this.updated;
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Pokemon.Pokemon[this.id.toString()] = this;
        save(Pokemon.Pokemon, pokemonPath);
    }
    static load() {
        var data = fs.readFileSync(pokemonPath);
        this.Pokemon = JSON.parse(data);
        return this.Pokemon;
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