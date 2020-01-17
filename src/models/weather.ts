"use strict"

const weatherPath = './data/weather.json';
const fs          = require('fs');

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
            this.gameplayCondition = data.gameplayCondition;
            this.windDirection = data.windDirection;
            this.cloudLevel = data.cloudLevel;
            this.rainLevel = data.rainLevel;
            this.windLevel = data.windLevel;
            this.snowLevel = data.snowLevel;
            this.fogLevel = data.fogLevel;
            this.seLevel = data.seLevel;
            this.severity = data.severity;
            this.warnWeather = data.warnWeather;
            this.updated = data.updated;
        }
    }
    static getAll(minLat: number, maxLat: number, minLon: number, maxLon: number, updated: number) {
        return this.load();
    }
    static getInIds(ids: number[]) {

    }
    save() {
        //TODO: Check if values changed, if not skip.
        Weather.Weather[this.id] = this;
        save(Weather.Weather, weatherPath);
    }
    static load() {
        let data = fs.readFileSync(weatherPath);
        let keys = Object.keys(data);
        keys.forEach(function(key) {
            this.Weather[key] = new Weather(data[key]);
        });
        //this.Weather = JSON.parse(data);
        return this.Weather;
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

export { Weather };