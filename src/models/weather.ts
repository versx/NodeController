"use strict"

class Weather {
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
        if (data.weather !== undefined) {
           // TODO: Init properties from protos data.weather object
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

    }
    static getInIDs(ids: number[]) {

    }
    save() {

    }
}

export { Weather };