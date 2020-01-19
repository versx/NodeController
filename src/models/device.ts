"use strict"

import { Database } from '../data/mysql';
//import { winston } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

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
        /*
        let deviceRedis = redisClient.get(DEVICE_LIST);
        if (deviceRedis) {
            let devices: Device[] = JSON.parse(deviceRedis);
            if (devices) {
                let device = devices.find(x => x.uuid === uuid);
                return device;
            }
        }
        */

        let sql = `
        SELECT uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon
        FROM device
        WHERE uuid = ?
        LIMIT 1
        `;
        let result = await db.query(sql, uuid)
            .then(x => x)
            .catch(x => { 
                console.error("[Device] Failed to get Device with uuid", uuid, "Error:", x);
            });
        let device: Device;
        if (result) {
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
            });
        }
        return device;
    }
    /**
     * Set last device location.
     * @param uuid 
     * @param lat 
     * @param lon 
     */
    static async setLastLocation(uuid: string, lat: number, lon: number): Promise<void> {
        let sql = `
        UPDATE device
        SET last_lat = ?, last_lon = ?, last_seen = UNIX_TIMESTAMP()
        WHERE uuid = ?
        `;
        let args = [lat, lon, uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Device] Error: " + x);
            });
        console.debug("[Device] SetLastLocation: " + results);
    }
    /**
     * Update host information for device.
     * @param uuid 
     * @param host 
     */
    async touch(uuid: string, host: string): Promise<void> {
        let sql = `
        UPDATE device
        SET last_host = ?
        WHERE uuid = ?
        `;
        let args = [host, uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Device] Error: " + x);
            });
        console.debug("[Device] Touch: " + results);
        //redisClient.addDevice(this);
    }
    /**
     * Create device.
     */
    async create(): Promise<void> {
        let sql = `
        INSERT INTO device (uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        let args = [this.uuid, this.instanceName, this.accountUsername, this.lastHost, this.lastSeen, this.lastLat, this.lastLon];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Device] Error: " + x);
            });
        console.debug("[Device] Insert: " + results);
        //redisClient.addDevice(this);
    }
    /**
     * Clear device group field.
     */
    async clearGroup(): Promise<void> {
        let sql = `
        UPDATE device 
        SET device_group = ?
        WHERE uuid = ?
        `;
        let args = ["", this.uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Device] Error: " + x);
                return null;
            });
        console.debug("[Device] ClearGroup: " + results);
        //redisClient.addDevice(this);
    }
    /**
     * Save device.
     * @param oldUUID 
     */
    async save(oldUUID?: string): Promise<void> {
       let sql = `
       UPDATE device 
       SET uuid = ?, instance_name = ?, account_username = ?, last_host = ?, last_seen = ?, last_lat = ?, last_lon = ?
       WHERE uuid = ?
       `;
       let args = [this.uuid, this.instanceName, this.accountUsername, this.lastHost, this.lastSeen, this.lastLat, this.lastLon, oldUUID];
       let results = await db.query(sql, args)
           .then(x => x)
           .catch(x => {
               console.error("[Device] Error: " + x);
           });
        console.debug("[Device] Save: " + results);
       //redisClient.addDevice(this);
    }
    /**
     * Load all devices.
     */
    static async load(): Promise<Device[]> {
        // TODO: Load devices from cache and mysql, check diff, add new/changes to cache.
        //let data = redisClient.get(DEVICE_LIST);
        /*
        client.get(DEVICE_LIST, function(err: Error, result) {
            if (err) {
                console.error("[Device] load: " + err);
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
                console.log("[Device] RESULT:", data);
            }
        });
        */
        let sql = `
        SELECT uuid, instance_name, account_username, last_host, last_seen, last_lat, last_lon
        FROM device
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Device] Error: " + x);
                return null;
            });
        let devices: Device[] = [];
        if (results) {
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
                //redisClient.addDevice(device);
                devices.push(device);
                //InstanceController.instance.Devices[key.uuid] = device;
            });
        }
        return devices;
    }
}

// Export the class
export { Device };