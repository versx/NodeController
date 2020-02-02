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
    static async getAll(): Promise<DeviceGroup[]> {
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
            .catch(err => {
                console.log("[DEVICE-GROUP] Error:", err);
                return null;
            });
        let deviceGroups: DeviceGroup[] = [];
        if (results) {
            let keys = Object.keys(results);
            for (let i = 0; i < keys.length; i++) {
                let row = results[i];
                let devices = await this.getDevicesByGroup(row.name) || [];
                let deviceGroup = new DeviceGroup(
                    row.name,
                    row.instance_name,
                    devices
                );
                deviceGroups.push(deviceGroup);
            }
        }
        return deviceGroups;
    }
    /**
     * Get devices by group name.
     * @param name 
     */
    static async getDevicesByGroup(name: string): Promise<Device[]> {
        let sql = `
        SELECT uuid, instance_name, account_username, device_level, last_host, last_seen, last_lat, last_lon, device_group
        FROM device
        WHERE device_group = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(err => { 
                console.log("[DEVICE-GROUP] Failed to get devices with device group name", name, "Error:", err);
                return null;
            });
        let devices: Device[] = [];
        let keys = Object.values(result);
        keys.forEach(function(key) {
            devices.push(new Device(
                key.uuid,
                key.instance_name,
                key.account_username,
                key.device_level,
                key.last_host,
                key.last_seen,
                key.last_lat,
                key.last_lon,
                key.device_group
            ));
        })
        return devices;
    }
    /**
     * Get device group by name.
     * @param name 
     */
    static async getByName(name: string): Promise<DeviceGroup> {
        let sql = `
        SELECT name, instance_name
        FROM device_group
        WHERE name = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(err => { 
                console.log("[DEVICE-GROUP] Failed to get devices with device group name", name, "Error:", err);
                return null;
            });
        let deviceGroup: DeviceGroup;
        if (result) {
            let keys = Object.keys(result);
            for (let i = 0; i < keys.length; i++) {
                let row = result[i];
                let devices = await this.getDevicesByGroup(row.name) || [];
                deviceGroup = new DeviceGroup(
                    row.name,
                    row.instance_name,
                    devices
                );
            }
        }
        return deviceGroup; 
    }
    /**
     * Delete device group by name.
     * @param name 
     */
    static async delete(name: string): Promise<void> {
        let sql = `
        DELETE FROM device_group
        WHERE name = ?
        `;
        let result = await db.query(sql, name)
            .then(x => x)
            .catch(err => { 
                console.log("[DEVICE-GROUP] Failed to delete device group with name", name, "Error:", err);
                return null;
            });
        console.log("[DEVICE-GROUP] Delete:", result);
    }
    /**
     * Create device group.
     */
    async create(): Promise<void> {
        let sql = `
        INSERT INTO device_group (name, instance_name)
        VALUES (?, ?)
        `;
        let args = [this.name, this.instanceName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                console.log("[DEVICE-GROUP] Failed to create device group with name", this.name, "Error:", err);
                return null;
            });
        console.log("[DEVICE-GROUP] Create:", result);
    }
    /**
     * Update device group.
     * @param oldName 
     */
    async update(oldName: string): Promise<void> {
        let sql = `
        UPDATE device_group
        SET name = ?, instance_name = ?
        WHERE name = ?
        `;
        let args = [this.name, this.instanceName, oldName];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                console.log("[DEVICE-GROUP] Failed to update device group with name", this.name, "Error:", err);
                return null;
            });
        console.log("[DEVICE-GROUP] Update:", result);
    }
}

// Export class.
export { DeviceGroup };