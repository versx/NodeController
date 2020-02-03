"use strict";

import * as S2 from 'nodes2ts';
import { Coord } from '../coord';
import { Database } from '../data/mysql';
import { logger } from '../utils/logger';
import config = require('../config.json');
const db = new Database(config);

/**
 * Weather model class.
 */
class Weather {
    static Weather = {};

    id: string;
    level: number;
    latitude: number;
    longitude: number;
    gameplayCondition: number;
    windDirection: number;
	cloudLevel: number;
	rainLevel: number;
	windLevel: number;
	snowLevel: number;
	fogLevel: number;
	seLevel: number;
	severity: number = 0;
	warnWeather: boolean = false;
    updated: number;

    /**
     * Initialize new Weather object.
     * @param data 
     */
    constructor(data: any) {
        if (data.conditions) {
           this.id = data.id.toString();
           this.level = data.level;
           this.latitude = data.latitude;
           this.longitude = data.longitude;
           this.gameplayCondition = data.conditions.gameplay_weather.gameplay_condition;
           this.windDirection = data.conditions.display_weather.wind_direction;
           this.cloudLevel = data.conditions.display_weather.cloud_level;
           this.rainLevel = data.conditions.display_weather.rain_level;
           this.windLevel = data.conditions.display_weather.wind_level;
           this.snowLevel = data.conditions.display_weather.snow_level;
           this.fogLevel = data.conditions.display_weather.fog_level;
           this.seLevel = data.conditions.display_weather.special_effect_level;
           let alerts = data.conditions.alerts;
           this.severity = alerts.length > 0 ? alerts[0].severity : 0;
           this.warnWeather = alerts.length > 0 ? alerts[0].warn_weather : 0;
           this.updated = data.updated;
   
        } else {
            this.id = data.id;
            this.level = data.level;
            this.latitude = data.latitude;
            this.longitude = data.longitude;
            this.gameplayCondition = data.gameplay_condition;
            this.windDirection = data.wind_direction;
            this.cloudLevel = data.cloud_level;
            this.rainLevel = data.rain_level;
            this.windLevel = data.wind_level;
            this.snowLevel = data.snow_level;
            this.fogLevel = data.fog_level;
            this.seLevel = data.se_level;
            this.severity = data.severity;
            this.warnWeather = data.warn_weather;
            this.updated = data.updated;
        }
    }
    /**
     * Get all Weather Cells within a minimum and maximum latitude and longitude.
     * @param minLat 
     * @param maxLat 
     * @param minLon 
     * @param maxLon 
     * @param updated 
     */
    static async getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number): Promise<Weather[]> {
        let minLatReal = minLat - 0.1
        let maxLatReal = maxLat + 0.1
        let minLonReal = minLon - 0.1
        let maxLonReal = maxLon + 0.1
        let sql = `
        SELECT id, level, latitude, longitude, gameplay_condition, wind_direction, cloud_level, rain_level, wind_level, snow_level, fog_level, special_effect_level, severity, warn_weather, updated
        FROM weather
        WHERE latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ? AND updated > ?
        `;
        let args = [minLatReal, maxLatReal, minLonReal, maxLonReal, updated];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Weather] Error: " + err);
            });
        let weather: Weather[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let w = new Weather({
                id: key.id,
                level: key.level,
                latitude: key.latitude,
                longitude: key.longitude,
                gameplay_condition: key.gameplay_condition,
                wind_direction: key.wind_direction,
                cloud_level: key.cloud_level,
                rain_level: key.rain_level,
                wind_level: key.wind_level,
                snow_level: key.snow_level,
                fog_level: key.fog_level,
                se_level: key.se_level,
                severity: key.severity || 0,
                warn_weather: key.warn_weather || false,
                updated: key.updated
            });
            weather.push(w);
        });
        return weather;
    }
    /**
     * 
     * @param ids 
     */
    static async getInIds(ids: number[]): Promise<Weather[]> {
        if (ids.length > 10000) {
            let result: Weather[] = [];
            let count = Math.ceil(ids.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let splice = ids.splice(start, end);
                let spliceResult = await this.getInIds(splice);
                spliceResult.forEach(x => result.push(x));
            }
            return result;
        }
        
        if (ids.length === 0) {
            return [];
        }

        let inSQL = "(";
        for (let i = 1; i < ids.length; i++) {
            inSQL += "?, ";
        }
        inSQL += "?)";
        
        let sql = `
        SELECT id, level, latitude, longitude, gameplay_condition, wind_direction, cloud_level, rain_level, wind_level, snow_level, fog_level, special_effect_level, severity, warn_weather, updated
        FROM weather
        WHERE id IN ${inSQL}
        `;        
        let args = ids;
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Weather] Error: " + err);
                return null;
            });
        logger.info("[Weather] GetInIds: " + result);
        let weather: Weather[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let w = new Weather({
                id: key.id,
                level: key.level,
                latitude: key.latitude,
                longitude: key.longitude,
                gameplay_condition: key.gameplay_condition,
                wind_direction: key.wind_direction,
                cloud_level: key.cloud_level,
                rain_level: key.rain_level,
                wind_level: key.wind_level,
                snow_level: key.snow_level,
                fog_level: key.fog_level,
                se_level: key.se_level,
                severity: key.severity || 0,
                warn_weather: key.warn_weather || false,
                updated: key.updated
            });
            weather.push(w);
        });
        return weather;
    }
    /**
     * Save Spawnpoint model data.
     * @param update 
     */
    async save(update: boolean): Promise<void> {
        let sql = `
        INSERT INTO weather (id, level, latitude, longitude, gameplay_condition, wind_direction, cloud_level, rain_level, wind_level, snow_level, fog_level, special_effect_level, severity, warn_weather, updated) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP())
        `;
        if (update) {
            sql += `
            ON DUPLICATE KEY UPDATE
            level=VALUES(level),
            latitude=VALUES(latitude),
            longitude=VALUES(longitude),
            gameplay_condition=VALUES(gameplay_condition),
            wind_direction=VALUES(wind_direction),
            cloud_level=VALUES(cloud_level),
            rain_level=VALUES(rain_level),
            wind_level=VALUES(wind_level),
            snow_level=VALUES(snow_level),
            fog_level=VALUES(fog_level),
            special_effect_level=VALUES(special_effect_level),
            severity=VALUES(severity),
            warn_weather=VALUES(warn_weather),
            updated=VALUES(updated)
            `;
        }
        let args = [this.id.toString(), this.level, this.latitude, this.longitude, this.gameplayCondition, this.windDirection, this.cloudLevel, this.rainLevel,
            this.windLevel, this.snowLevel, this.fogLevel, this.seLevel, this.severity, this.warnWeather];
        await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Weather] Error: " + err);
            });
        Weather.Weather[this.id.toString()] = this;
    }
    /**
     * Load all Weather Cells.
     */
    static async load(): Promise<Weather[]> {
        let sql = `
        SELECT id, level, latitude, longitude, gameplay_condition, wind_direction, cloud_level, rain_level, wind_level, snow_level, fog_level, special_effect_level, severity, warn_weather, updated
        FROM weather
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Weather] Error: " + err);
            });
        logger.info("[Weather] Load: " + result)
        let weather: Weather[] = [];
        let keys = Object.values(result);
        keys.forEach(key => {
            let w = new Weather({
                id: key.id,
                level: key.level,
                latitude: key.latitude,
                longitude: key.longitude,
                gameplay_condition: key.gameplay_condition,
                wind_direction: key.wind_direction,
                cloud_level: key.cloud_level,
                rain_level: key.rain_level,
                wind_level: key.wind_level,
                snow_level: key.snow_level,
                fog_level: key.fog_level,
                se_level: key.se_level,
                severity: key.severity || 0,
                warn_weather: key.warn_weather || false,
                updated: key.updated
            });
            weather.push(w);
        });
        return weather;
    }
    toJson() {
        let s2cell = new S2.S2Cell(new S2.S2CellId(this.id));
        let polygon: Coord[] = [];
        for (let i = 0; i <= 3; i++) {
            let vertex = s2cell.getVertex(i);
            //let coord = new S2.S2LatLng(vertex);
            polygon.push(new Coord(vertex.x, vertex.y));
        }
        /*
        let s2cell = S2Cell(cellId: S2CellId(id: id))
        var polygon =  [[Double]]()
        for i in 0...3 {
            let coord = S2LatLng(point: s2cell.getVertex(i)).coord
            polygon.append([
                coord.latitude,
                coord.longitude
                ])
        }
        */
        return {
            type: "weather",
            message: {
                id: this.id,
                level: this.level,
                latitude: this.latitude,
                longitude: this.longitude,
                polygon: polygon,
                gameplay_condition: this.gameplayCondition,
                wind_direction: this.windDirection,
                cloud_level: this.cloudLevel,
                rain_level: this.rainLevel,
                wind_level: this.windLevel,
                snow_level: this.snowLevel,
                fog_level: this.fogLevel,
                special_effect_level: this.seLevel,
                severity: this.severity,
                warn_weather: this.warnWeather,
                updated: this.updated || 1
            }
        };
    }
}

// Export the class
export { Weather };