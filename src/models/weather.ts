"use strict"

import { Database } from '../data/mysql';
import config = require('../config.json');
const db = new Database(config);

class Weather {
    static Weather = {};

    id: number;
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

    constructor(data: any) {
        if (data.weather) {
           this.id = data.id;
           this.level = data.level;
           this.latitude = data.latitude;
           this.longitude = data.longitude;
           this.gameplayCondition = data.conditions.gameplayWeather.gameplayCondition;
           this.windDirection = data.conditions.displayWeather.windDirection;
           this.cloudLevel = data.conditions.displayWeather.cloudLevel;
           this.rainLevel = data.conditions.displayWeather.rainLevel;
           this.windLevel = data.conditions.displayWeather.windLevel;
           this.snowLevel = data.conditions.displayWeather.snowLevel;
           this.fogLevel = data.conditions.displayWeather.fogLevel;
           this.seLevel = data.conditions.displayWeather.specialEffectLevel;
           let alerts = data.conditions.alerts;
           this.severity = alerts[0].severity;
           this.warnWeather = alerts[0].warnWeather;
           /*
           for (let severityConditions in data.conditions.alerts) {
               this.severity = severityConditions.severity;
               this.warnWeather = severityConditions.warnWeather
           }
           */
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
     * Get all Weather models.
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
            .catch(x => {
                console.error("[Weather] Error:", x);
            });
        console.log("[Weather] GetAll:", result)
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
    static async getInIds(ids: number[]): Promise<Weather[]> {
        if (ids.length > 10000) {
            let result: Weather[] = [];
            let count = Math.ceil(ids.length / 10000.0);
            for (let i = 0; i < count; i++) {
                let start = 10000 * i;
                let end = Math.min(10000 * (i + 1) - 1, ids.length - 1);
                let splice = ids.splice(start, end);
                let spliceResult = this.getInIds(splice);
                (await spliceResult).forEach(x => result.push(x));
                //result.push(spliceResult); // TODO: Double check
            }
            return result;
        }
        
        if (ids.length === 0) {
            return [];
        }

        var inSQL = "(";
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
            .catch(x => {
                console.error("[Weather] Error: " + x);
                return null;
            });
        console.log("[Weather] GetInIds:", result);
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
    async save(update: boolean): Promise<void> {
        //TODO: Check if values changed, if not skip.
        Weather.Weather[this.id] = this;

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
        let args = [this.id, this.level, this.latitude, this.longitude, this.gameplayCondition, this.windDirection, this.cloudLevel, this.rainLevel,
             this.windLevel, this.snowLevel, this.fogLevel, this.seLevel, this.severity, this.warnWeather];
        let result = await db.query(sql, args)
             .then(x => x)
             .catch(x => {
                 console.error("[Weather] Error: " + x);
             });
         console.log("[Weather] Save:", result);
    }
    static async load(): Promise<Weather[]> {
        let sql = `
        SELECT id, level, latitude, longitude, gameplay_condition, wind_direction, cloud_level, rain_level, wind_level, snow_level, fog_level, special_effect_level, severity, warn_weather, updated
        FROM weather
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(x => {
                console.error("[Weather] Error:", x);
            });
        console.log("[Weather] Load:", result)
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
}

export { Weather };