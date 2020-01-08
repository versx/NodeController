"use strict"

const gymsPath = '../gyms.json';
//const gyms     = require(gymsPath);
const fs       = require('fs');

// Constructor
class Gym {
    constructor(data) {
        this.id = data.id;
        this.lat = data.lat;
        this.lon = data.lon;
        this.name = data.name;
        this.url = data.url;
        this.guardPokemonId = data.guardPokemonId;
        this.enabled = data.enabled;
        this.lastModifiedTimestamp = data.lastModifiedTimestamp;
        this.teamId = data.teamId;
        this.raidEndTimestamp = data.raidEndTimestamp;
        this.raidSpawnTimestamp = data.raidSpawnTimestamp;
        this.raidBattleTimestamp = data.raidBattleTimestamp;
        this.raidPokemonId = data.raidPokemonId;
        this.raidLevel = data.raidLevel;
        this.availableSlots = data.availableSlots;
        this.updated = data.updated;
        this.exRaidEligible = data.exRaidEligible;
        this.inBattle = data.inBattle;
        this.raidPokemonMove1 = data.raidPokemonMove1;
        this.raidPokemonMove2 = data.raidPokemonMove2;
        this.raidPokemonForm = data.raidPokemonForm;
        this.raidPokemonCp = data.raidPokemonCp;
        this.raidPokemonGender = data.raidPokemonGender;
        this.raidIsExclusive = data.raidIsExclusive;
        this.cellId = data.cellId;
        this.totalCp = data.totalCp;
        this.sponsorId = data.sponsorId;
        if (this.fort === undefined) {
            this.id = data.fort.id;
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            this.enabled = data.fort.enabled;
            this.guardPokemonId = data.fort.guard_pokemon_id;
            this.teamId = data.fort.owned_by_team;
            this.availableSlots = data.fort.gym_display.slots_available;
            //this.lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            this.exRaidEligible = data.fort.is_ex_raid_eligible;
            this.inBattle = data.fort.is_in_battle;
            if (data.fort.sponsor !== 0) {
                //TODO: Double check sponsor id (unsetSponsor)
                this.sponsorId = data.fort.sponsor;
            }
            if (data.fort.image_url !== undefined) {
                this.url = data.fort.image_url;
            }
            if (data.fort.owned_by_team === 0) { //TODO: Check team id value
                this.totalCp = 0;
            } else {
                this.totalCp = data.fort.gym_display.total_gym_cp;
            }
            if (data.fort.raid_info !== undefined) {
                this.raidEndTimestamp = data.fort.raid_info.raid_end_ms / 1000;
                this.raidSpawnTimestamp = data.fort.raid_info.raid_spawn_ms / 1000;
                this.raidBattleTimestamp = data.fort.raid_info.raid_battle_ms / 1000;
                this.raidLevel = data.fort.raid_info.raid_level;
                this.raidPokemonId = data.fort.raid_info.raid_pokemon.pokemon_id;
                this.raidPokemonMove1 = data.fort.raid_info.raid_pokemon.move1;
                this.raidPokemonMove2 = data.fort.raid_info.raid_pokemon.move2;
                this.raidPokemonForm = data.fort.raid_info.raid_pokemon.pokemon_display.form;
                this.raidPokemonCp = data.fort.raid_info.raid_pokemon.cp;
                this.raidPokemonGender = data.fort.raid_info.raid_pokemon.pokemon_display.gender;
                this.raidIsExclusive = data.fort.raid_info.is_exclusive;
            }
            this.cellId = data.cellId;
        }
    }
    static getAll() {
        //return gyms;
        return this.load();
    }
    save() {
        var gyms = Gym.getAll();
        if (gyms[this.id] !== undefined) {
            gyms[this.id] = this;
            save(gyms, gymsPath);
        }
    }
    static load() {
        //var data = fs.readFileSync(gymsPath);
        //return JSON.parse(data);
        var data = fs.readFileSync(gymsPath);
        var obj = JSON.parse(data);
        var gymList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var gym = obj[key];
                gymList.push(new Gym(
                    gym.id,
                    gym.lat, 
                    gym.lon, 
                    gym.name,
                    gym.url,
                    gym.guardPokemonId,
                    gym.enabled,
                    gym.teamId,
                    gym.raidEndTimestamp,
                    gym.raidSpawnTimestamp,
                    gym.raidBattleTimestamp,
                    gym.raidPokemonId,
                    gym.raidLevel,
                    gym.availableSlots,
                    gym.updated,
                    gym.exRaidEligible,
                    gym.inBattle,
                    gym.raidPokemonMove1,
                    gym.raidPokemonMove2,
                    gym.raidPokemonForm,
                    gym.raidPokemonCp,
                    gym.raidPokemonGender,
                    gym.raidIsExclusive,
                    gym.cellId,
                    gym.totalCp,
                    gym.sponsorId
                ));
            }
        }
        return gymList;
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
module.exports = Gym;