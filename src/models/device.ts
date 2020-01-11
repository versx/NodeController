"use strict"

const devicesPath = 'devices.json';
const fs          = require('fs');

class Device {
    name: string;
    instanceName: string;
    accountUsername: string;
    lastHost: string;
    lastSeen: number;
    lastLat: number;
    lastLon: number;

    constructor(name: string, instanceName: string, accountUsername: string, lastHost: string, lastSeen: number, lastLat: number, lastLon: number) {
        this.name = name;
        this.instanceName = instanceName;
        this.accountUsername = accountUsername;
        this.lastHost = lastHost;
        this.lastSeen = lastSeen;
        this.lastLat = lastLat;
        this.lastLon = lastLon;
    }
    static getAll() {
        return this.load();
    }
    save() {
        let devices = Device.getAll();
        //if (devices[this.name] === undefined) {
            devices[this.name] = this;
            save(devices, devicesPath);
        //}
    }
    static load() {
        let data = fs.readFileSync(devicesPath);
        let obj = JSON.parse(data);
        let deviceList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                let dev = obj[key];
                deviceList.push(new Device(dev.uuid, dev.instanceName, dev.accountUsername, dev.lastHost, dev.lastSeen, dev.lastLat, dev.lastLon));
            }
        };
        return deviceList;
    }
}

/**
 * Save object as json string to file path.
 * @param {*} obj 
 * @param {*} path 
 */
function save(obj: any, path: string) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
export { Device };