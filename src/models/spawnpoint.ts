"use strict"

import { Database } from '../data/mysql';
import config = require('../config.json');
const db = new Database(config);

/**
 * Spawnpoint model class.
 */
class Spawnpoint {
    static Spawnpoints = {};

    id: string;
    lat: number;
    lon: number;
    despawnSecond: number;
    updated: number;

    /**
     * Initialize new Spawnpoint object.
     * @param data 
     */
    constructor(data: any) {
        this.id = data.id.toString();//parseInt(data.id.toString(), 16).toString();
        this.lat = data.lat;
        this.lon = data.lon;
        this.despawnSecond = data.despawn_sec;
        this.updated = data.updated;
    }
    /**
     * Get all Spawnpoints within a minimum and maximum latitude and longitude.
     * @param minLat 
     * @param maxLat 
     * @param minLon 
     * @param maxLon 
     * @param updated 
     */
    static async getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number): Promise<Spawnpoint[]> {
        let sql = `
        SELECT id, lat, lon, updated, despawn_sec
        FROM spawnpoint
        WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ? AND updated > ?
        `;
        let args = [minLat, maxLat, minLon, maxLon, updated];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Spawnpoint] Error:", x);
            });
        console.log("[Spawnpoint] Load:", result)
        let spawnpoints: Spawnpoint[] = [];
        if (result) {
            let keys = Object.values(result);
            keys.forEach(key => {
                let spawnpoint = new Spawnpoint({
                    id: key.id,
                    latitude: key.lat,
                    longitude: key.lon,
                    updated: key.updated,
                    despawn_sec: key.despawn_sec //despawnSecond
        
                });
                spawnpoints.push(spawnpoint);
            });
        }
        return spawnpoints;
    }
    /**
     * Get Spawnpoint by spawnpoint id.
     * @param spawnpointId 
     */
    static async getById(spawnpointId: string): Promise<Spawnpoint> {
        let sql = `
            SELECT id, lat, lon, updated, despawn_sec
            FROM spawnpoint
            WHERE id = ?
        `;
        let result = await db.query(sql, [spawnpointId])
            .then(x => x)
            .catch(x => {
                console.error("[Spawnpoint] Error:", x);
            });
        let spawnpoint: Spawnpoint;
        if (result) {
            let keys = Object.values(result);
            if (keys.length === 0) {
                return null;
            }
            keys.forEach(key => {
                spawnpoint = new Spawnpoint({
                    id: key.id,
                    latitude: key.lat,
                    longitude: key.lon,
                    updated: key.updated,
                    despawn_sec: key.despawn_sec
                });
            });
        }
        return spawnpoint;
    }
    /**
     * Save Spawnpoint model data.
     */
    async save(update: boolean = false): Promise<void> {
        //TODO: Check if values changed, if not skip.
        let oldSpawnpoint: Spawnpoint;
        try {
            oldSpawnpoint = await Spawnpoint.getById(this.id);
        } catch (err) {
            oldSpawnpoint = null;
        }
        this.updated = new Date().getTime();
        
        if (!update && oldSpawnpoint) {
            return;
        }
        
        if (oldSpawnpoint) {
            if ((this.despawnSecond === undefined || this.despawnSecond === null) && oldSpawnpoint.despawnSecond) {
                this.despawnSecond = oldSpawnpoint.despawnSecond;
            }            
            if (this.lat === oldSpawnpoint.lat &&
                this.lon === oldSpawnpoint.lon &&
                this.despawnSecond === oldSpawnpoint.despawnSecond) {
                return;
            }
        }

        let sql = `
            INSERT INTO spawnpoint (id, lat, lon, updated, despawn_sec)
            VALUES (?, ?, ?, UNIX_TIMESTAMP(), ?)
        `;
        if (update) {
            sql += `
            ON DUPLICATE KEY UPDATE
            lat=VALUES(lat),
            lon=VALUES(lon),
            updated=VALUES(updated),
            despawn_sec=VALUES(despawn_sec)
            `;
        }
        let args = [this.id, this.lat, this.lon, this.despawnSecond];
        await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Spawnpoint] Error:", x);
            });
        Spawnpoint.Spawnpoints[this.id] = this;        
    }
    /**
     * Load all Spawnpoints.
     */
    static async load(): Promise<Spawnpoint[]> {
        let sql = `
        SELECT id, lat, lon, updated, despawn_sec
        FROM spawnpoint
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Spawnpoint] Error:", x);
            });
        console.log("[Spawnpoint] Load:", result)
        let spawnpoints: Spawnpoint[] = [];
        if (result) {
            let keys = Object.values(result);
            keys.forEach(key => {
                let spawnpoint = new Spawnpoint({
                    id: key.id,
                    latitude: key.lat,
                    longitude: key.lon,
                    updated: key.updated,
                    despawn_sec: key.despawn_sec
        
                });
                spawnpoints.push(spawnpoint);
            });
        }
        return spawnpoints;
    }
    toJson() {
        return {
            id: this.id, // TODO: toHex()
            lat: this.lat,
            lon: this.lon,
            updated: this.upda || 1,
            despawn_second: this.despawnSecond
        };
    }
}


// Export the class
export { Spawnpoint };