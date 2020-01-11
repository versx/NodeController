"use strict"

const spawnpointsPath = 'spawnpoints.json';
const fs              = require('fs');

class Spawnpoint {
    static Spawnpoints = {};
    constructor(data) {
        this.id = data.id;
    }
    static getAll() {
        return this.load();
    }
    static getById(spawnpointId) {
        return this.Spawnpoints[spawnpointId.toString()];
    }
    addDetails(spawnpoint) {
        
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Spawnpoint.Spawnpoints[this.id.toString()] = this;
        save(Spawnpoint.Spawnpoints, spawnpointsPath);
    }
    static load() {
        var data = fs.readFileSync(spawnpointsPath);
        this.Spawnpoints = JSON.parse(data);
        return this.Spawnpoints;
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
module.exports = Spawnpoint;