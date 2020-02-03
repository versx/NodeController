"use strict";

import { Database } from '../data/mysql';
import { logger } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

/**
 * Device model class.
 */
class Device {
    uuid: string;
    instanceName: string;
    accountUsername: string;
    deviceLevel: number;
    lastHost: string;
    lastSeen: number;
    lastLat: number;
    lastLon: number;
    deviceGroup: string;

    /**
     * Initalize new Device object.
     * @param uuid 
     * @param instanceName 
     * @param accountUsername 
     * @param deviceLevel 
     * @param lastHost 
     * @param lastSeen 
     * @param lastLat 
     * @param lastLon 
     */
    constructor(uuid: string, instanceName: string, accountUsername: string, deviceLevel: number,
        lastHost: string, lastSeen: number, lastLat: number, lastLon: number, deviceGroup: string) {
        this.uuid = uuid;
        this.instanceName = instanceName;
        this.accountUsername = accountUsername;
        this.deviceLevel = deviceLevel;
        this.lastHost = lastHost;
        this.lastSeen = lastSeen;
        this.lastLat = lastLat;
        this.lastLon = lastLon;
        this.deviceGroup = deviceGroup;
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
        SELECT uuid, instance_name, account_username, device_level, last_host, last_seen, last_lat, last_lon, device_group
        FROM device
        WHERE uuid = ?
        LIMIT 1
        `;
        let args = [uuid];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Device] Failed to get Device with uuid " + uuid + " Error: " + err);
            });
        let device: Device;
        if (result) {
            let keys = Object.values(result);
            keys.forEach(key => {
                device = new Device(
                    key.uuid,
                    key.instance_name,
                    key.account_username,
                    key.device_level,
                    key.last_host || "",
                    key.last_seen || "",
                    key.last_lat || "",
                    key.last_lon || "",
                    key.device_group
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
            .catch(err => {
                logger.error("[Device] Error: " + err);
            });
        logger.info("[Device] SetLastLocation: " + results);
    }
    /**
     * Update host information for device.
     * @param uuid 
     * @param host 
     */
    static async touch(uuid: string, host: string, updateLastSeen: boolean): Promise<void> {
        let sql: string;
        if (updateLastSeen) {
            sql = `
            UPDATE device
            SET last_host = ?, last_seen = UNIX_TIMESTAMP()
            WHERE uuid = ?
            `;
        } else {
            sql = `
            UPDATE device
            SET last_host = ?
            WHERE uuid = ?
            `;
        }
        let args = [host, uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Device] Error: " + err);
            });
        logger.info("[Device] Touch: " + results);
    }
    /**
     * Create device.
     */
    async create(): Promise<void> {
        let sql = `
        INSERT INTO device (uuid, instance_name, account_username, device_level, last_host, last_seen, last_lat, last_lon, device_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        let args = [this.uuid, this.instanceName, this.accountUsername, this.deviceLevel, this.lastHost, this.lastSeen, this.lastLat, this.lastLon, this.deviceGroup];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Device] Error: " + err);
            });
        logger.info("[Device] Insert: " + results);
    }
    /**
     * Clear device group field.
     */
    async clearGroup(): Promise<void> {
        let sql = `
        UPDATE device 
        SET device_group = NULL
        WHERE uuid = ?
        `;
        let args = [this.uuid];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Device] Error: " + err);
                return null;
            });
        logger.info("[Device] ClearGroup: " + results);
    }
    /**
     * Save device.
     * @param oldUUID 
     */
    async save(oldUUID?: string): Promise<void> {
       let sql = `
       UPDATE device 
       SET uuid = ?, instance_name = ?, account_username = ?, device_level = ?, last_host = ?, last_seen = ?, last_lat = ?, last_lon = ?, device_group = ?
       WHERE uuid = ?
       `;
       let args = [this.uuid, this.instanceName, this.accountUsername, this.deviceLevel, this.lastHost, this.lastSeen || 0, this.lastLat || 0, this.lastLon || 0, this.deviceGroup, oldUUID];
       let results = await db.query(sql, args)
           .then(x => x)
           .catch(err => {
               logger.error("[Device] Error: " + err);
           });
        logger.info("[Device] Save: " + results);
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
                logger.error("[Device] load: " + err);
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
                logger.info("[Device] RESULT: " + data);
            }
        });
        */
        let sql = `
        SELECT uuid, instance_name, account_username, device_level, last_host, last_seen, last_lat, last_lon, device_group
        FROM device
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Device] Error: " + err);
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
                    key.device_level,
                    key.last_host,
                    key.last_seen,
                    key.last_lat,
                    key.last_lon,
                    key.device_group
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