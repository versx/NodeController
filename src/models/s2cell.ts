"use strict"

const s2cellsPath = 's2cells.json';
const fs          = require('fs');

class S2Cell {
    static S2Cells = {};

    id: string;
    level: number;
    centerLat: number;
    centerLon: number;
    updated: number;

    constructor(data: any) {
        this.id = data.id;
        this.level = data.level;
        this.centerLat = data.lat;
        this.centerLon = data.lon;
        this.updated = data.updated;
    }
    static getAll() {
        return this.load();
    }
    static getById(cellId: string) {
        return this.S2Cells[cellId];
    }
    save() {
        //TODO: Check if values changed, if not skip.
        S2Cell.S2Cells[this.id] = this;
        save(S2Cell.S2Cells, s2cellsPath);
    }
    static load() {
        let data = fs.readFileSync(s2cellsPath);
        this.S2Cells = JSON.parse(data);
        return this.S2Cells;
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

export { S2Cell };