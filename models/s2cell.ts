"use strict"

const s2cellsPath = 's2cells.json';
const fs          = require('fs');

class S2Cell {
    static S2Cells = {};
    constructor(data) {
        this.id = data.id;
        this.level = data.level;
        this.centerLat = data.lat;
        this.centerLon = data.lon;
        this.updated = data.updated;
    }
    static getAll() {
        return this.load();
    }
    static getById(cellId) {
        return this.S2Cells[cellId.toString()];
    }
    save() {
        //TODO: Check if values changed, if not skip.
        S2Cell.S2Cells[this.id.toString()] = this;
        save(S2Cell.S2Cells, s2cellsPath);
    }
    static load() {
        var data = fs.readFileSync(s2cellsPath);
        this.S2Cells = JSON.parse(data);
        return this.S2Cells;
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

module.exports = S2Cell;