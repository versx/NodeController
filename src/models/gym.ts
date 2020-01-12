"use strict"

const gymsPath = './data/gyms.json';
const fs       = require('fs');

class Gym {
    static Gyms = {};

    id: string;
    lat: number;
    lon: number;
    name: string;
    url: string;
    enabled: boolean;
    guardPokemonId: number;
    teamId: number;
    availableSlots: number;
    lastModifiedTimestamp: number;
    exRaidEligible: boolean;
    inBattle: boolean;
    sponsorId: number;
    totalCp: number;
    raidEndTimestamp: number;
    raidSpawnTimestamp: number;
    raidBattleTimestamp: number;
    raidLevel: number;
    raidIsExclusive: boolean;
    raidPokemonId: number;
    raidPokemonMove1: number;
    raidPokemonMove2: number;
    raidPokemonForm: number;
    raidPokemonCp: number;
    raidPokemonGender: number;
    updated: number;
    cellId: string;

    constructor(data: any) {
        if (data.fort !== undefined) {
            this.id = data.fort.id.toString();
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            this.enabled = data.fort.enabled;
            this.guardPokemonId = data.fort.guard_pokemon_id;
            this.teamId = data.fort.owned_by_team;
            this.availableSlots = data.fort.gym_display.slots_available;
            this.lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            this.exRaidEligible = data.fort.is_ex_raid_eligible;
            this.inBattle = data.fort.is_in_battle;
            if (data.fort.sponsor !== 0) {
                this.sponsorId = data.fort.sponsor;
            }
            if (data.fort.image_url !== undefined) {
                this.url = data.fort.image_url;
            }
            if (data.fort.owned_by_team === 0) {
                this.totalCp = 0;
            } else {
                this.totalCp = data.fort.gym_display.total_gym_cp;
            }
            if (data.fort.raid_info !== undefined && data.fort.raid_info !== null) {
                this.raidEndTimestamp = data.fort.raid_info.raid_end_ms / 1000;
                this.raidSpawnTimestamp = data.fort.raid_info.raid_spawn_ms / 1000;
                this.raidBattleTimestamp = data.fort.raid_info.raid_battle_ms / 1000;
                this.raidLevel = data.fort.raid_info.raid_level;
                this.raidIsExclusive = data.fort.raid_info.is_exclusive;
                if (data.fort.raid_info.raid_pokemon !== undefined && data.fort.raid_info.raid_pokemon !== null) {
                    this.raidPokemonId = data.fort.raid_info.raid_pokemon.pokemon_id;
                    this.raidPokemonMove1 = data.fort.raid_info.raid_pokemon.move1;
                    this.raidPokemonMove2 = data.fort.raid_info.raid_pokemon.move2;
                    this.raidPokemonCp = data.fort.raid_info.raid_pokemon.cp;
                    this.raidPokemonForm = data.fort.raid_info.raid_pokemon.pokemon_display.form;
                    this.raidPokemonGender = data.fort.raid_info.raid_pokemon.pokemon_display.gender;
                }
            }
            this.cellId = data.cellId.toString();
        } else {
            this.id = data.id.toString();
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
            this.cellId = data.cellId.toString();
            this.totalCp = data.totalCp;
            this.sponsorId = data.sponsorId;
        }
    }
    static getAll() {
        return this.load();
    }
    static getById(gymId: string) {
        return this.Gyms[gymId];
    }
    static getByCellIds(cellIds: string[]) {
        return new Gym[0]; // TODO: Implement getByCellIds
    }
    addDetails(fort: any) {

    }
    addGymInfo(gymInfo: any) {
        if (this.name !== gymInfo.name && gymInfo.name !== undefined && gymInfo.name !== null) {
            this.name = gymInfo.name;
        }
        if (this.url !== gymInfo.url && gymInfo.url !== undefined && gymInfo.url !== null) {
            this.url = gymInfo.url;
        }
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Gym.Gyms[this.id] = this;
        save(Gym.Gyms, gymsPath);
    }
    static load() {
        let data = fs.readFileSync(gymsPath);
        let keys = Object.keys(data);
        keys.forEach(function(key) {
            this.Gyms[key] = new Gym(data[key]);
        });
        //this.Gyms = JSON.parse(data);
        return this.Gyms;
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
export { Gym };