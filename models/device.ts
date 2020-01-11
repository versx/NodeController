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
    constructor(name, instanceName, accountUsername, lastHost, lastSeen, lastLat, lastLon) {
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
        var devices = Device.getAll();
        //if (devices[this.name] === undefined) {
            devices[this.name] = this;
            save(devices, devicesPath);
        //}
    }
    static load() {
        var data = fs.readFileSync(devicesPath);
        var obj = JSON.parse(data);
        var deviceList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var dev = obj[key];
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
function save(obj, path) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
module.exports = Device;