"use strict"

import * as mysql from '../data/mysql';
import { client, RedisClient, DEVICE_LIST } from '../redis-client';
import config      = require('../config.json');
import { logger } from '../utils/logger';
import { InstanceController } from '../controllers/instances/instance-controller';
const db           = new mysql.Database(config);
const redisClient       = new RedisClient();

/**
 * Device model class.
 */
class Device {
    uuid: string;
    instanceName: string;
    accountUsername: string;
    lastHost: string;
    lastSeen: number;
    lastLat: number;
    lastLon: number;

    /**
     * Initalize new Device object.
     * @param uuid 
     * @param instanceName 
     * @param accountUsername 
     * @param lastHost 
     * @param lastSeen 
     * @param lastLat 
     * @param lastLon 
     */
    constructor(uuid: string, instanceName: string, accountUsername: string, lastHost: string, 
        lastSeen: number, lastLat: number, lastLon: number) {
        this.uuid = uuid;
        this.instanceName = instanceName;
        this.accountUsername = accountUsername;
        this.lastHost = lastHost;
        this.lastSeen = lastSeen;
        this.lastLat = lastLat;
        this.lastLon = lastLon;
    }
    /**
     * Get all devices.
     */
    /*
    static getAll(): Promise<Device[]> {
        return this.load();
    }
    */
    /**
     * Get device based on uuid.
     * @param uuid 
     */
    static async getById(uuid: string): Promise<Device> {
        let deviceRedis = redisClient.get(DEVICE_LIST);
        if (deviceRedis) {
            let devices: Device[] = JSON.parse(deviceRedis);
            if (devices) {
                let device = devices.find(x => x.uuid === uuid);
                return device;
            }
        }

        let sql = `
        SELECT uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon
        FROM device
        WHERE uuid = ?
        LIMIT 1
        `;
        let result = await db.query(sql, uuid)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE] Failed to get Device with uuid", uuid);
                return null;
            });
        let device: Device;
        let keys = Object.values(result);
        keys.forEach(key => {
            device = new Device(
                key.uuid,
                key.instance_name,
                key.account_username,
                key.last_host || "",
                key.last_seen || "",
                key.last_lat || "",
                key.last_lon || ""
            );
        })
        return device;
    }
    /**
     * Set last device location.
     * @param uuid 
     * @param lat 
     * @param lon 
     */
    static async setLastLocation(uuid: string, lat: number, lon: number) {
        let sql = `
        UPDATE device
        SET last_lat = ?, last_lon = ?, last_seen = UNIX_TIMESTAMP()
        WHERE uuid = ?
        `;
        let args = [lat, lon, uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE] Error:", x);
                return null;
            });
        console.log("[DEVICE] SetLastLocation:", results);
    }
    /**
     * Update host information for device.
     * @param uuid 
     * @param host 
     */
    async touch(uuid: string, host: string) {
        let sql = `
        UPDATE device
        SET last_host = ?
        WHERE uuid = ?
        `;
        let args = [host, uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE] Error:", x);
                return null;
            });
        console.log("[DEVICE] Touch:", results);
        redisClient.addDevice(this);
    }
    /**
     * Create device.
     */
    async create() {
        let sql = `
        INSERT INTO device (uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        let args = [this.uuid, this.instanceName, this.accountUsername, this.lastHost, this.lastSeen, this.lastLat, this.lastLon];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE] Error:", x);
                return null;
            });
        console.log("[DEVICE] Insert:", results);
        redisClient.addDevice(this);
    }
    /**
     * Clear device group field.
     */
    async clearGroup() {
        let sql = `
        UPDATE device 
        SET device_group = ?
        WHERE uuid = ?
        `;
        let args = ["", this.uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE] Error:", x);
                return null;
            });
        console.log("[DEVICE] ClearGroup:", results);
        redisClient.addDevice(this);
    }
    /**
     * Save device.
     * @param oldUUID 
     */
    async save(oldUUID?: string) {
       let sql = `
       UPDATE device 
       SET uuid = ?, instance_name = ?, account_username = ?, last_host = ?, last_seen = ?, last_lat = ?, last_lon = ?
       WHERE uuid = ?
       `;
       let args = [this.uuid, this.instanceName, this.accountUsername, this.lastHost, this.lastSeen, this.lastLat, this.lastLon, oldUUID];
       let results = await db.query(sql, args)
           .then(x => x)
           .catch(x => {
               console.log("[DEVICE] Error:", x);
               return null;
           });
       console.log("[DEVICE] Update:", results);
       redisClient.addDevice(this);
    }
    /**
     * Load all devices.
     */
    static load() {
        // TODO: Load devices from cache and mysql, check diff, add new/changes to cache.
        //let data = redisClient.get(DEVICE_LIST);
        client.get(DEVICE_LIST, function(err: Error, result) {
            if (err) {
                logger.error("[DEVICE] load: " + err);
            }
            if (result) {
                let data = JSON.parse(result);
                let keys = Object.keys(data);
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let device = data[key];
                    InstanceController.instance.Devices[key] = new Device(
                        device.uuid,
                        device.instanceName,
                        device.accountUsername,
                        device.lastHost,
                        device.lastSeen,
                        device.lastLat,
                        device.lastLon
                    );
                }
                console.log("[DEVICE] RESULT:", data);
            }
        });
        /*

        let sql = `
        SELECT uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon
        FROM device
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE] Error:", x);
                return null;
            });
        let devices: Device[] = [];
        let keys = Object.values(results);
        keys.forEach(key => {
            let device = new Device(
                key.uuid,
                key.instance_name,
                key.account_username,
                key.last_host,
                key.last_seen,
                key.last_lat,
                key.last_lon
            );
            redisClient.addDevice(device);
            devices.push(device);
        });
        return devices;
        */
    }
}

// Export the class
export { Device };