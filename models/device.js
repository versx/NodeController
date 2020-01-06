"use strict"

const devicesPath = '../devices.json';
const devices  = require(devicesPath);

// Constructor
class Device {
    constructor(name, instanceName, accountUsername, lastHost, lastSeen, lastLat, lastLon) {
        this.name = name;
        this.instanceName = instanceName;
        this.accountUsername = accountUsername;
        this.lastHost = lastHost;
        this.lastSeen = lastSeen;
        this.lastLat = lastLat;
        this.lastLon = lastLon;
    }
    getDevices() {
        return devices;
    }
    save() {
        if (devices[this.name] !== undefined) {
            devices.push({
                uuid: this.name,
                instanceName: this.instanceName,
                accountUsername: this.accountUsername,
                lastHost: this.lastHost,
                lastSeen: this.lastSeen,
                lastLat: this.lastLat,
                lastLon: this.lastLon
            });
            save(devices, devicesPath);
        }
    }
    load() {
        var data = fs.readFileSync(devicesPath);
        return JSON.parse(data);
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