"use strict"

import * as mysql from '../data/mysql';
import { client, RedisClient, INSTANCE_LIST } from '../redis-client';
import config      = require('../config.json');
import { logger } from '../utils/logger';
import { InstanceController } from '../controllers/instances/instance-controller';
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
    static async delete(instanceName: string) {
        let sql = `
        DELETE FROM instance
        WHERE name = ?
        `;
        let result = await db.query(sql, instanceName)
            .then(x => x)
            .catch(x => { 
                console.log("[INSTANCE] Failed to delete instance with name", name);
                return null;
            });
        console.log("[INSTANCE] Delete:", result);
    }
    /**
     * Update instance data.
     * @param oldName 
     */
    async update(oldName: string) {
        let sql = `
        UPDATE instance
        SET data = ?, name = ?, type = ?
        WHERE name = ?
        `;
        let args = [this.data, this.name, this.type, oldName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => { 
                console.log("[INSTANCE] Failed to update instance with name", name);
                return null;
            });
        console.log("[INSTANCE] Update:", result);
    }
    /**
     * Load all instances.
     */
    static async load() {
        // TODO: Load instances from cache and mysql, check diff, add new/changes to cache.
        //let data = redisClient.get(INSTANCE_LIST);
        client.get(INSTANCE_LIST, function(err: Error, result) {
            if (err) {
                logger.error("[INSTANCE] load: " + err);
            }
            if (result) {
                let data = JSON.parse(result);
                let keys = Object.keys(data);
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let instance = data[key];
                    InstanceController.instance.Instances[key] = new Instance(
                        instance.name,
                        instance.type,
                        instance.minLevel,
                        instance.maxLevel,
                        instance.area,
                        instance.data
                    );
                }
                console.log("INSTANCE RESULT:", data);
                //return data;
            }
        });
        /*
        let sql = `
        SELECT name, type, data
        FROM instance
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.log("[INSTANCE] Error:", x);
                return null;
            });
        let instances: Instance[] = [];
        let keys = Object.values(results);
        keys.forEach(key => {
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
        */
    }
}

export { InstanceType, Instance };