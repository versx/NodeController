"use strict"

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
    static getAll() {
        // TODO: Assignment.getAll
    }
    /**
     * Get assignment by assignment UUID.
     * @param instanceName 
     * @param deviceUUID 
     * @param time 
     */
    static getByUUID(instanceName: string, deviceUUID: string, time: number) {
        // TODO: Assignment.getByUUID
    }
    /**
     * Delete all assignments.
     */
    static deleteAll() {
        // TODO: Assignment.deleteAll
    }
    /**
     * Save assignment data.
     * @param oldInstanceName 
     * @param oldDeviceUUID 
     * @param oldTime 
     * @param enabled 
     */
    save(oldInstanceName: string, oldDeviceUUID: string, oldTime: number = null, enabled: boolean = true) {
        // TODO: Assignment.save
    }
    /**
     * Create new assignment object.
     */
    create() {
        // TODO: Assignment.create
    }
    /**
     * Delete assignment.
     */
    delete() {
        // TODO: Assignment.delete
    }
}

export { Assignment };