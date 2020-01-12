"use strict"

class Assignment {
    instanceName: string;
    deviceUUID: string;
    time: number;
    enabled: boolean;
    constructor(instanceName: string, deviceUUID: string, time: number, enabled: boolean) {
        this.instanceName = instanceName;
        this.deviceUUID = deviceUUID;
        this.time = time;
        this.enabled = enabled;
    }
    static getAll() {
        
    }
    static getByUUID(instanceName: string, deviceUUID: string, time: number) {

    }
    static deleteAll() {

    }
    save(oldInstanceName: string, oldDeviceUUID: string, oldTime: number = null, enabled: boolean = true) {

    }
    create() {

    }
    delete() {

    }
}

export { Assignment };