"use strict";

import { ICache } from './icache';
import { RedisClient } from './redis-client';
import { Cell } from '../models/cell';
import { Gym } from '../models/gym';
import { Pokemon } from '../models/pokemon';
import { Pokestop } from '../models/pokestop';

const ACCOUNT_LIST = 'ACCOUNT_LIST';
const POKEMON_LIST = 'POKEMON_LIST';
const POKESTOP_LIST = 'POKESTOP_LIST';
const GYM_LIST = 'GYM_LIST';
const CELL_LIST = 'CELL_LIST';

class Cache implements ICache {
    static instance = new Cache();

    async get<T>(id: string, key: string): Promise<T> {
        let json = String(await RedisClient.instance.hget<T>(id, key));
        return <T>JSON.parse(json);
    }
    async set(id: string, key: string, data: any): Promise<boolean> {
        let json = data; //JSON.stringify(data, null, 2);
        return await RedisClient.instance.hset(id, key, json);
    }
    async getCell(id: string): Promise<Cell> {
        let json = String(await RedisClient.instance.hgetString(CELL_LIST, id));
        let obj = <Cell>JSON.parse(json);
        if (obj) {
            let cell: Cell = new Cell(
                obj.id,
                obj.level,
                obj.centerLat,
                obj.centerLon,
                obj.updated
            );
            return cell;
        }
        return null;
    }
    async getPokemon(id: string): Promise<Pokemon> {
        let json = String(await RedisClient.instance.hgetString(POKEMON_LIST, id));
        let obj = <Pokemon>JSON.parse(json);
        if (obj) {
            let pokemon: Pokemon = new Pokemon({
                id: String(obj.id),
                lat: obj.lat,
                lon: obj.lon,
                pokemon_id: obj.pokemonId,
                form: obj.form,
                level: obj.level,
                costume: obj.costume,
                weather: obj.weather,
                gender: obj.gender,
                spawn_id: obj.spawnId,
                cell_id: obj.cellId,
                first_seen_timestamp: obj.firstSeenTimestamp,
                expire_timestamp: obj.expireTimestamp,
                expire_timestamp_verified: obj.expireTimestampVerified,
                cp: obj.cp,
                move_1: obj.move1,
                move_2: obj.move2,
                size: obj.size,
                weight: obj.weight,
                atk_iv: obj.atkIv,
                def_iv: obj.defIv,
                sta_iv: obj.staIv,
                username: obj.username,
                updated: obj.updated,
                changed: obj.changed,
                display_pokemon_id: obj.displayPokemonId
            });
            return pokemon;
        }
        return null;
    }
    async getPokestop(id: string): Promise<Pokestop> {
        let json = String(await RedisClient.instance.hgetString(POKESTOP_LIST, id));
        let obj = <Pokestop>JSON.parse(json);
        if (obj) {
            let pokestop: Pokestop = new Pokestop({
                id: obj["id"],
                lat: obj["lat"],
                lon: obj["lon"],
                name: obj["name"],
                url: obj["url"],
                enabled: obj["enabled"],
                lure_expire_timestamp: obj["lureExpireTimestamp"],
                last_modified_timestamp: obj["lastModifiedTimestamp"],
                updated: obj["updated"],
                quest_type: obj["questType"],
                quest_target: obj["questTarget"],
                quest_timestamp: obj["questTimestamp"],
                quest_conditions: obj["questConditions"],
                quest_rewards: obj["questRewards"],
                quest_template: obj["questTemplate"],
                cell_id: obj["cellId"],
                lure_id: obj["lureId"],
                pokestop_display: obj["pokestopDisplay"],
                incident_expire_timestamp: obj["incidentExpireTimestamp"],
                grunt_type: obj["gruntType"],
                sponsor_id: obj["sponsorId"],
            })
            return pokestop;
        }
        return null;
    }
    async getGym(id: string): Promise<Gym> {
        return null;
    }
    async loadCells(): Promise<Cell[]> {
        let list: Cell[] = [];
        let json = await RedisClient.instance.hgetall(CELL_LIST);
        let values: string[] = Object.values(json);
        values.forEach(value => {
            let obj = JSON.parse(value);
            let cell: Cell = new Cell(
                obj.id,
                obj.level,
                obj.centerLat,
                obj.centerLon,
                obj.updated
            );
            list.push(cell);
        });
        return list;
    }
    async loadPokemon(): Promise<Pokemon[]> {
        let list: Pokemon[] = [];
        let json = await RedisClient.instance.hgetall(POKEMON_LIST);
        let values: string[] = Object.values(json);
        values.forEach(value => {
            let obj = JSON.parse(value);
            let pokemon: Pokemon = new Pokemon({
                id: String(obj.id),
                lat: obj.lat,
                lon: obj.lon,
                pokemon_id: obj.pokemonId,
                form: obj.form,
                level: obj.level,
                costume: obj.costume,
                weather: obj.weather,
                gender: obj.gender,
                spawn_id: obj.spawnId,
                cell_id: obj.cellId,
                first_seen_timestamp: obj.firstSeenTimestamp,
                expire_timestamp: obj.expireTimestamp,
                expire_timestamp_verified: obj.expireTimestampVerified,
                cp: obj.cp,
                move_1: obj.move1,
                move_2: obj.move2,
                size: obj.size,
                weight: obj.weight,
                atk_iv: obj.atkIv,
                def_iv: obj.defIv,
                sta_iv: obj.staIv,
                username: obj.username,
                updated: obj.updated,
                changed: obj.changed,
                display_pokemon_id: obj.displayPokemonId
            });
            list.push(pokemon);
        });
        return list;
    }
    async loadPokestops(): Promise<Pokestop[]> {
        let list: Pokestop[] = [];
        let json = await RedisClient.instance.hgetall(POKESTOP_LIST);
        let values: string[] = Object.values(json);
        values.forEach(value => {
            let obj = JSON.parse(value);
            let pokestop: Pokestop = new Pokestop({
                id: obj["id"],
                lat: obj["lat"],
                lon: obj["lon"],
                name: obj["name"],
                url: obj["url"],
                enabled: obj["enabled"],
                lure_expire_timestamp: obj["lureExpireTimestamp"],
                last_modified_timestamp: obj["lastModifiedTimestamp"],
                updated: obj["updated"],
                quest_type: obj["questType"],
                quest_target: obj["questTarget"],
                quest_timestamp: obj["questTimestamp"],
                quest_conditions: obj["questConditions"],
                quest_rewards: obj["questRewards"],
                quest_template: obj["questTemplate"],
                cell_id: obj["cellId"],
                lure_id: obj["lureId"],
                pokestop_display: obj["pokestopDisplay"],
                incident_expire_timestamp: obj["incidentExpireTimestamp"],
                grunt_type: obj["gruntType"],
                sponsor_id: obj["sponsorId"],
            })
            list.push(pokestop);
        });
        return list;
    }
    async loadGyms(): Promise<Gym[]> {
        let list: Gym[] = [];
        let json = await RedisClient.instance.hgetall(GYM_LIST);
        let values: string[] = Object.values(json);
        values.forEach(value => {
            let obj = JSON.parse(value);
            let gym: Gym = new Gym({
                id: obj.id,
                lat: obj.lat,
                lon: obj.lon,
                name: obj.name,
                url: obj.url,
                guard_pokemon_id: obj.guardPokemonId,
                enabled: obj.enabled,
                last_modified_timestamp: obj.lastModifiedTimestamp,
                team_id: obj.teamId,
                raid_end_timestamp: obj.raidEndTimestamp,
                raid_spawn_timestamp: obj.raidSpawnTimestamp,
                raid_battle_timestamp: obj.raidBattleTimestamp,
                raid_pokemon_id: obj.raidPokemonId,
                raid_level: obj.raidLevel,
                available_slots: obj.availableSlots,
                updated: obj.updated,
                ex_raid_eligible: obj.exRaidEligible,
                in_battle: obj.inBattle,
                raid_pokemon_move_1: obj.raidPokemonMove1,
                raid_pokemon_move_2: obj.raidPokemonMove2,
                raid_pokemon_form: obj.raidPokemonForm,
                raid_pokemon_cp: obj.raidPokemonCp,
                raid_pokemon_gender: obj.raidPokemonGender,
                raid_is_exclusive: obj.raidIsExclusive,
                cell_id: obj.cellId,
                total_cp: obj.totalCp,
                sponsor_id: obj.sponsorId
            });
            list.push(gym);
        });
        return list;
    }
}

export { Cache, ACCOUNT_LIST, POKEMON_LIST, POKESTOP_LIST, GYM_LIST, CELL_LIST };