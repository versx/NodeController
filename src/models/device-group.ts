"use strict"

import { Device } from "./device";
import { Database } from '../data/mysql';

const config = require('../config.json');
const db = new Database(config);

/**
 * DeviceGroup model class.
 */
class DeviceGroup {
    name: string;
    instanceName: string;
    devices: Device[];
    count: number;

    /**
     * Initialize new DeviceGroup object.
     * @param name 
     * @param instanceName 
     * @param devices 
     */
    constructor(name: string, instanceName: string, devices: Device[]) {
        this.name = name;
        this.instanceName = instanceName;
        this.devices = devices;
        this.count = devices.length;
    }
    /**
     * Get all device groups.
     */
    static async getAll() {
        let sql = `
        SELECT name, instance_name
        FROM device_group AS devgroup
        LEFT JOIN (
            SELECT device_group
            FROM device
            GROUP BY device_group
        ) AS dev ON (dev.device_group = devgroup.name)
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.log("[DEVICE-GROUP] Error:", x);
                return null;
            });
        let deviceGroups: DeviceGroup[] = [];
        let keys = Object.values(results);
        keys.forEach(async key => {
            let devices = await this.getDevicesByGroup(key.name);
            let deviceGroup = new DeviceGroup(
                key.name,
                key.instance_type,
                devices
            );
            deviceGroups.push(deviceGroup);
        });
        return deviceGroups;
    }
    /**
     * Get devices by group name.
     * @param name 
     */
    static async getDevicesByGroup(name: string) {
        let sql = `
        SELECT uuid, instance_name, last_host, last_seen, account_username, last_lat, last_lon, device_group
        FROM device
        WHERE device_group = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE-GROUP] Failed to get devices with device group name", name);
                return null;
            });
        let devices: Device[] = [];
        let keys = Object.values(result);
        keys.forEach(function(key) {
            devices.push(new Device(
                key.uuid,
                key.instance_name,
                key.account_username,
                key.last_host,
                key.last_seen,
                key.last_lat,
                key.last_lon
            ));
        })
        return devices;
    }
    /**
     * Get device group by name.
     * @param name 
     */
    static async getByName(name: string) {
        let sql = `
        SELECT instance_name
        FROM device_group
        WHERE name = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE-GROUP] Failed to get devices with device group name", name);
                return null;
            });
        let deviceGroup: DeviceGroup;
        let keys = Object.values(result);
        keys.forEach(function(key) {
            let devices = this.getDevicesByGroup(key.name);
            deviceGroup = new DeviceGroup(
                key.name,
                key.instance_name,
                devices
            );
        })
        return deviceGroup; 
    }
    /**
     * Delete device group by name.
     * @param name 
     */
    static async delete(name: string) {
        let sql = `
        DELETE FROM device_group
        WHERE name = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE-GROUP] Failed to delete device group with name", name);
                return null;
            });
        console.log("[DEVICE-GROUP] Delete:", result);
    }
    /**
     * Create device group.
     */
    async create() {
        let sql = `
        INSERT INTO device_group (name, instance_name)
        VALUES (?, ?)
        `;
        let args = [this.name, this.instanceName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE-GROUP] Failed to create device group with name", this.name);
                return null;
            });
        console.log("[DEVICE-GROUP] Create:", result);
    }
    /**
     * Update device group.
     * @param oldName 
     */
    async update(oldName: string) {
        let sql = `
        UPDATE device_group
        SET name = ?, instance_name = ?
        WHERE name = ?
        `;
        let args = [this.name, this.instanceName, oldName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => { 
                console.log("[DEVICE-GROUP] Failed to update device group with name", this.name);
                return null;
            });
        console.log("[DEVICE-GROUP] Update:", result);
    }
}

export { DeviceGroup };