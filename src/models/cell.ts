"use strict"

import { Database } from '../data/mysql';
import config = require('../config.json');
const db = new Database(config);

/**
 * S2Cell model class.
 */
class Cell {
    static Cells = {};

    id: string;
    level: number;
    centerLat: number;
    centerLon: number;
    updated: number;

    /**
     * Initialize new Cell object.
     * @param id 
     * @param level 
     * @param centerLat 
     * @param centerLon 
     * @param updated 
     */
    constructor(id: string, level: number, centerLat: number, centerLon: number, updated: number) {
        this.id = id;
        this.level = level;
        this.centerLat = centerLat;
        this.centerLon = centerLon;
        this.updated = updated;
    }
    /**
     * Get all S2Cells within a minimum and maximum latitude and longitude.
     * @param minLat 
     * @param maxLat 
     * @param minLon 
     * @param maxLon 
     * @param updated 
     */
    static async getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number): Promise<Cell[]> {
        let minLatReal = minLat - 0.01;
        let maxLatReal = maxLat + 0.01;
        let minLonReal = minLon - 0.01;
        let maxLonReal = maxLon + 0.01;
        let sql = `
        SELECT id, level, center_lat, center_lon, updated
        FROM s2cell
        WHERE center_lat >= ? AND center_lat <= ? AND center_lon >= ? AND center_lon <= ? AND updated > ?
        `;
        let args = [minLatReal, maxLatReal, minLonReal, maxLonReal];
        let results = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Cell] Error:", x);
            });
        let cells: Cell[] = [];
        if (results) {
            let keys = Object.values(results);
            keys.forEach(key => {
                let cell = new Cell(
                    key.id,
                    key.level,
                    key.center_lat,
                    key.center_lon,
                    key.updated
                );
                cells.push(cell);
            });
        }
        return cells;
    }
    /**
     * Get S2Cell by specific ID
     * @param id 
     */
    static async getById(id: string): Promise<Cell> {
        let sql = `
        SELECT id, level, center_lat, center_lon, updated
        FROM s2cell
        WHERE id = ?
        LIMIT 1
        `;
        let args = [id];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Cell] Error:", x);
            });
        let cell: Cell;
        if (result) {
            let keys = Object.values(result);
            keys.forEach(key => {
                cell = new Cell(
                    key.id,
                    key.level,
                    key.center_lat,
                    key.center_lon,
                    key.updated
                );
            });
        }
        return cell;
    }
    /**
     * Get all S2Cells with specific IDs.
     * @param ids 
     */
    static async getInIds(ids: string[]): Promise<Cell[]> {
        if (ids.length > 10000) {
            let result: Cell[] = [];
            let count = Math.ceil(ids.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let splice = ids.splice(start, end); // TODO: Double check
                let spliceResult = this.getInIds(splice);
                (await spliceResult).forEach(x => result.push(x));
                //result.push(spliceResult); // TODO: Double check
            }
            return result
        }
        
        if (ids.length === 0) {
            return [];
        }

        let inSQL = "(";
        for (let i = 1; i < ids.length; i++) {
            inSQL += "?, "; // TODO: Double check
        }
        inSQL += "?)";
        
        let sql = `
        SELECT id, level, center_lat, center_lon, updated
        FROM s2cell
        WHERE id IN ${inSQL}
        `
        let args = ids;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Cell] Error: " + x);
                return null;
            });
        console.log("[Cell] GetInIds:", result);
        let cells: Cell[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let cell = new Cell(
                key.id,
                key.level,
                key.center_lat,
                key.center_lon,
                key.updated
            );
            cells.push(cell);
        });
        return cells;
    }
    /**
     * Save S2Cell model data.
     * @param update 
     */
    async save(update: boolean): Promise<void> {
        let sql = `
        INSERT INTO s2cell (id, level, center_lat, center_lon, updated)
        VALUES (?, ?, ?, ?, UNIX_TIMESTAMP())
        `;
        if (update) {
            sql += `
            ON DUPLICATE KEY UPDATE
            level=VALUES(level),
            center_lat=VALUES(center_lat),
            center_lon=VALUES(center_lon),
            updated=VALUES(updated)
            `;
        }
        let args = [this.id, this.level, this.centerLat, this.centerLon];
        await db.query(sql, args)
            .then(x => x)
            .catch(x => {
                console.error("[Cell] Error: " + x);
                return null;
            });
        Cell.Cells[this.id] = this;
    }
    /**
     * Load all S2Cells.
     */
    static async load(): Promise<Cell[]> {
        let sql = `
        SELECT id, level, center_lat, center_lon, updated
        FROM s2cell
        `;
        let results = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Cell] Error: " + x);
                return null;
            });
        let cells: Cell[] = [];
        let keys = Object.values(results);
        keys.forEach(key => {
            let cell = new Cell(
                key.id,
                key.level,
                key.center_lat,
                key.center_lon,
                key.updated
            );
            cells.push(cell);
            Cell.Cells[cell.id] = cell;
        });
        return cells;
    }
    /**
     * 
     */
    toJson() {
        /*
        // TODO: Get polygon for s2cell
        let s2cell = S2Cell(cellId: S2CellId(uid: id))
        var polygon =  [[Double]]()
        for i in 0...3 {
            let coord = S2LatLng(point: s2cell.getVertex(i)).coord
            polygon.append([
                coord.latitude,
                coord.longitude
            ])
        }
        */
        let polygon = [];
        return {
            type: "s2cell",
            message: {
                id: this.id,
                level: this.level,
                updated: this.updated ?? 1,
                polygon: polygon
            }
        };
    }
}

// Export the class
export { Cell };