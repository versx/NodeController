"use strict"

import { Database } from '../data/mysql';
import config      = require('../config.json');
//import { winston } from '../utils/logger';
import { InstanceController } from '../controllers/instances/instance-controller';
const db           = new Database(config);

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
    //[json("timezone_offset")]
    timeZoneOffset: number;
    spinLimit: number;
    ivQueueLimit: number;
    area: any;
    minLevel: number;
    maxLevel: number
}

/**
 * Base instance interface.
 */
interface IInstance {
    name: string;
    type: InstanceType;
    data: IInstanceData;
}

/**
 * Instance model class.
 */
class Instance implements IInstance {
    name: string;
    type: InstanceType;
    data: IInstanceData;

    /**
     * Initialize new Instance object.
     * @param name Name of the instance.
     * @param type Type of instance.
     * @param data Instance data containing area coordinates, minimum and maximum account level, etc.
     */
    constructor(name: string, type: InstanceType, data: IInstanceData) {
        this.name = name;
        this.type = type;
        this.data = data;
    }
    /**
     * Get all Instances.
     */
    static getAll(): Promise<Instance[]> {
        return this.load();
    }
    /**
     * Get instance by name.
     * @param instanceName Name of the instance.
     */
    static async getByName(instanceName: string): Promise<Instance> {
        let sql = `
        SELECT name, type, data
        FROM instance
        WHERE name = ?
        LIMIT 1
        `;
        let result = await db.query(sql, instanceName)
            .then(x => x)
            .catch(x => { 
                console.log("[ACCOUNT] Failed to get Instance with name " + instanceName);
                return null;
            });
        let instance: Instance;
        let keys = Object.values(result);
        keys.forEach(function(key) {
            instance = new Instance(
                key.name,
                key.type,
                key.data
            );
        })
        return instance;
    }
    /**
     * Delete instance by name.
     * @param instanceName Name of the instance.
     */
    static async delete(instanceName: string): Promise<void> {
        let sql = `
        DELETE FROM instance
        WHERE name = ?
        `;
        let result = await db.query(sql, instanceName)
            .then(x => x)
            .catch(x => { 
                console.error("[INSTANCE] Failed to delete instance with name " + name);
                return null;
            });
        console.debug("[INSTANCE] Delete:", result);
    }
    /**
     * Update instance data.
     * @param oldName Old name of the instance.
     */
    async update(oldName: string): Promise<void> {
        let sql = `
        UPDATE instance
        SET data = ?, name = ?, type = ?
        WHERE name = ?
        `;
        let args = [this.data, this.name, this.type, oldName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => { 
                console.error("[INSTANCE] Failed to update instance with name " + name);
                return null;
            });
        console.debug("[INSTANCE] Update: " + result);
    }
    /**
     * Load all instances.
     */
    static async load(): Promise<Instance[]> {
        // TODO: Load instances from cache and mysql, check diff, add new/changes to cache.
        //let data = redisClient.get(INSTANCE_LIST);
        // TODO: Someone else do redis, I'm good.
        /*
        client.get(INSTANCE_LIST, function(err: Error, result) {
            if (err) {
                console.log("[INSTANCE] load: " + err);
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
                        instance.data
                    );
                }
                console.log("INSTANCE RESULT:", data);
                //return data;
            }
        });
        */
        let sql = `
        SELECT name, type, data
        FROM instance
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[INSTANCE] Error: " + x);
                return null;
            });
        let instances: Instance[] = [];
        let keys = Object.values(results);
        keys.forEach(key => {
            let data = JSON.parse(key.data);
            let instance = new Instance(
                key.name,
                key.type,
                data // TODO: Deserialize data to InstanceData object.
            );
            instances.push(instance);
            InstanceController.instance.Instances[key.name] = instance;
        });
        return instances;
    }
}

export { InstanceType, Instance };