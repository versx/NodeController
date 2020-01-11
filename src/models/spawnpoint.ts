"use strict"

const spawnpointsPath = 'spawnpoints.json';
const fs              = require('fs');

class Spawnpoint {
    static Spawnpoints = {};

    id: string;
    lat: number;
    lon: number;

    constructor(data: any) {
        this.id = data.id;
        this.lat = data.lat;
        this.lon = data.lon;
    }
    static getAll() {
        return this.load();
    }
    static getById(spawnpointId: string) {
        return this.Spawnpoints[spawnpointId];
    }
    addDetails(spawnpoint) {
        
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Spawnpoint.Spawnpoints[this.id] = this;
        save(Spawnpoint.Spawnpoints, spawnpointsPath);
    }
    static load() {
        let data = fs.readFileSync(spawnpointsPath);
        this.Spawnpoints = JSON.parse(data);
        return this.Spawnpoints;
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
module.exports = Spawnpoint;