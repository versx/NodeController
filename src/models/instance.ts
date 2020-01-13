"use strict"

import * as mysql from '../data/mysql';
const config       = require('../config.json');
const db           = new mysql.Database(config);

/**
 * Instance type enumeration.
 */
enum InstanceType {
    CirclePokemon = 'circle_pokemon',
    CircleRaid = 'circle_raid',
    SmartCircleRaid = 'circle_smart_raid',
    AutoQuest = 'auto_quest',
    PokemonIV = 'pokemon_iv',
    GatherToken = 'gather_token',
    Leveling = 'leveling'
}

/**
 * Instance data interface.
 */
interface IInstanceData {
    timeZoneOffset: number;
    spinLimit: number;
}

/**
 * Base instance interface.
 */
interface IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    area: [any];
    data: IInstanceData;
}

/**
 * Instance model class.
 */
class Instance implements IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    area: [any];
    data: IInstanceData;

    /**
     * Initialize new Instance object.
     * @param name 
     * @param type 
     * @param minLevel 
     * @param maxLevel 
     * @param area 
     * @param data 
     */
    constructor(name: string, type: InstanceType, minLevel: number, maxLevel: number, area: [any], data: IInstanceData) {
        this.name = name;
        this.type = type;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.area = area,
        this.data = data;
    }
    /**
     * Get all Instances.
     */
    static getAll() {
        return this.load();
    }
    /**
     * Get instance by name.
     * @param instanceName 
     */
    static async getByName(instanceName: string) {
        let sql = `
        SELECT name, type, data
        FROM instance
        WHERE name = ?
        LIMIT 1
        `;
        let result = await db.query(sql, instanceName)
            .then(x => x)
            .catch(x => { 
                console.log("[ACCOUNT] Failed to get Instance with name", instanceName);
                return null;
            });
        let instance: Instance;
        let keys = Object.values(result);
        keys.forEach(function(key) {
            instance = new Instance(
                key.name,
                key.type,
                key.data.minLevel,
                key.data.maxLevel,
                key.data.area,
                key.data
            );
        })
        return instance;
    }
    /**
     * Delete instance by name.
     * @param instanceName 
     */
    static delete(instanceName: string) {
        // TODO: Instance.delete
    }
    /**
     * Update instance data.
     * @param oldName 
     */
    update(oldName: string) {
        // TODO: Instance.update
    }
    /**
     * Load all instances.
     */
    static async load() {
        let sql = `
        SELECT name, type, data
        FROM instance
        `; //TODO: ptc_token
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.log("[INSTANCE] Error:", x);
                return null;
            });
        let instances: Instance[] = [];
        let keys = Object.values(results);
        keys.forEach(function(key) {
            let instance = new Instance(
                key.name,
                key.type,
                key.data.minLevel,
                key.data.maxLevel,
                key.data.area,
                key.data
            );
            instances.push(instance);
        });
        return instances;
    }
}

export { InstanceType, Instance };