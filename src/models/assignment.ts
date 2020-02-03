"use strict";

import { Database } from '../data/mysql';
import { logger } from '../utils/logger';
import config      = require('../config.json');
const db           = new Database(config);

/**
 * Assignment model class.
 */
class Assignment {
    instanceName: string;
    deviceUUID: string;
    time: number;
    enabled: boolean;

    /**
     * Initialize new Assignment object.
     * @param instanceName 
     * @param deviceUUID 
     * @param time 
     * @param enabled 
     */
    constructor(instanceName: string, deviceUUID: string, time: number, enabled: boolean) {
        this.instanceName = instanceName;
        this.deviceUUID = deviceUUID;
        this.time = time;
        this.enabled = enabled;
    }
    /**
     * Get all assignments.
     */
    static async getAll() {
        let sql = `
        SELECT device_uuid, instance_name, time, enabled
        FROM assignment
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        let assignments: Assignment[] = [];
        if (results) {
            let keys = Object.values(results);
            keys.forEach(function(key) {
                let assignment = new Assignment(
                    key.instance_name,
                    key.device_uuid,
                    key.time,
                    key.enabled                
                );
                assignments.push(assignment);
            });
        }
        return assignments;
    }

    /**
     * Get assignment by assignment UUID.
     * @param instanceName 
     * @param deviceUUID 
     * @param time 
     */
    static async getByUUID(instanceName: string, deviceUUID: string, time: number) {
        let sql = `
        SELECT device_uuid, instance_name, time, enabled
        FROM assignment
        WHERE device_uuid = ? AND instance_name = ? AND time = ?
        `;
        let args = [deviceUUID, instanceName, time];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        let assignment: Assignment;
        let keys = Object.values(result);
        keys.forEach(key => {
            assignment = new Assignment(
                key.instance_name,
                key.device_uuid,
                key.time,
                key.enabled               
            );
        });
        return assignment;
    }
    /**
     * Delete all assignments.
     */
    static async deleteAll() {
        let sql = `DELETE FROM assignment`;
        let result = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        logger.info("[Assignment] DeleteAll: " + result);
    }
    /**
     * Save assignment data.
     * @param oldInstanceName 
     * @param oldDeviceUUID 
     * @param oldTime 
     * @param enabled 
     */
    async save(oldInstanceName: string, oldDeviceUUID: string, oldTime: number = null, enabled: boolean = true) {
        let sql = `
        UPDATE assignment
        SET device_uuid = ?, instance_name = ?, time = ?, enabled = ?
        WHERE device_uuid = ? AND instance_name = ? AND time = ?
        `;
        let args = [this.deviceUUID, this.instanceName, this.time, enabled, oldDeviceUUID, oldInstanceName, oldTime];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        logger.info("[Assignment] Save: " + result);
    }
    /**
     * Create new assignment object.
     */
    async create() {
        let sql = `
        INSERT INTO assignment (device_uuid, instance_name, time, enabled)
        VALUES (?, ?, ?, ?)
        `;
        let args = [this.deviceUUID, this.instanceName, this.time, this.enabled];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        logger.info("[Assignment] Create: " + result);
    }
    /**
     * Delete assignment.
     */
    async delete() {
        let sql = `
        DELETE FROM assignment
        WHERE device_uuid = ? AND instance_name = ? AND time = ?
        `;
        let args = [this.deviceUUID, this.instanceName, this.time];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Assignment] Error: " + err);
                return null;
            });
        logger.info("[Assignment] Delete: " + result);
    }
}

export { Assignment };