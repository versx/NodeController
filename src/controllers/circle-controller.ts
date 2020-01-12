import { InstanceController, InstanceType } from "./instance-controller"

"use strict"

class CircleInstanceController extends InstanceController {
    lastUuidIndex = {};
    lastUuidSeenTime = {};

    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    coords: any[];

    //coords;
    lastIndex: number;
    lastLastCompletedTime: number;
    lastCompletedTime: number;

    constructor(name: string, type: InstanceType, minLevel: number, maxLevel: number, coords: any[]) {
        super();
        this.name = name;
        this.type = type;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.coords = coords;
        this.lastCompletedTime = new Date().getUTCSeconds();
    }
    getTask(uuid: string, username: string) {
        let currentIndex = this.lastIndex;
        if (this.lastIndex + 1 === this.coords.length) {
            this.lastLastCompletedTime = this.lastCompletedTime;
            this.lastCompletedTime = new Date().getUTCSeconds();
            this.lastIndex = 0;
        } else {
            this.lastIndex = this.lastIndex + 1;
        }

        let currentCoord = this.coords[currentIndex];
        switch (this.type) {
            case InstanceType.CirclePokemon:
                return {
                    action: "scan_pokemon",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: this.minLevel,
                    max_level: this.maxLevel
                };
            case InstanceType.CircleRaid:
                return {
                    action: "scan_raid",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: this.minLevel,
                    max_level: this.maxLevel
                };
        }
    }
    getStatus() {
        let lastLast = this.lastLastCompletedTime;
        let last = this.lastCompletedTime;
        if (lastLast !== undefined && last !== undefined) {
            // TODO: TimesinceLastInterval.
            let time = last - lastLast
            return { round_time: time };
        }
        return null;
    }
    reload() {
        this.lastIndex = 0;
    }
    stop() {}
    routeDistance(x, y) {
        if (x < y ) {
            return y - x;
        }
        return y + (this.coords.length - x);
    }
    queryLiveDevices(uuid: string, index: number) {
        let deadDeviceCutOff = new Date().getUTCSeconds() - 60 * 1000;
        let numLiveDevices = 1;
        let distanceToNext = this.coords.length;
        // TODO: finish new routing logic        
    }
}

export { CircleInstanceController };