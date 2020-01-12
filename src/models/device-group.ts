"use strict"

import { Device } from "./device";

class DeviceGroup {
    name: string;
    instanceName: string;
    devices: Device[];
    count: number;
    constructor(name: string, instanceName: string, devices: Device[]) {
        this.name = name;
        this.instanceName = instanceName;
        this.devices = devices;
        this.count = devices.length;
    }
    static getAll() {

    }
    static getDevicesByGroup() {

    }
    static getByName() {
        
    }
    static delete(name: string) {

    }
    create() {

    }
    update(oldName: string) {
    }
    save() {

    }
}

export { DeviceGroup };