"use strict"

// TODO: All consumable objects should inherit the Consumable class.
class Consumable {
    id: string;
    lat: number;
    lon: number;
    constructor(id: string, lat: number, lon: number) {
        this.id = id;
        this.lat = lat;
        this.lon = lon;
    }
    save() {
        
    }
}