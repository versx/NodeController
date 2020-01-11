import { InstanceController, InstanceType } from "./instance-controller"

"use strict"

class CircleInstanceController extends InstanceController {
    lastUuidIndex = {};
    lastUuidSeenTime = {};

    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    coords: [any];

    //coords;
    lastIndex: number;
    lastLastCompletedTime: number;
    lastCompletedTime: number;

    constructor(name: string, type: InstanceType, minLevel: number, maxLevel: number, coords: [any]) {
        super();
        this.name = name;
        this.type = type;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.coords = coords;
        this.lastCompletedTime = new Date().getUTCSeconds();
    }
    getTask(uuid: string, username: string) {
        var currentIndex = this.lastIndex;
        if (this.lastIndex + 1 === this.coords.length) {
            this.lastLastCompletedTime = this.lastCompletedTime;
            this.lastCompletedTime = new Date().getUTCSeconds();
            this.lastIndex = 0;
        } else {
            this.lastIndex = this.lastIndex + 1;
        }

        var currentCoord = this.coords[currentIndex];
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
        var lastLast = this.lastLastCompletedTime;
        var last = this.lastCompletedTime;
        if (lastLast !== undefined && last !== undefined) {
            var time = parseInt(last.timeIntervalSince(lastLast));
            return { round_time: time };
        }
        return null;
    }
    reload() {
        this.lastIndex = 0;
    }
    stop() {}
    /*
    routeDistance(x, y) {
        if (x < y ) {
            return y - x;
        }
        return y + (coords.length - x);
    }
    queryLiveDevices(uuid, index) {
        var deadDeviceCutOff = new Date() - TimeInerval(60);
        var numLiveDevices = 1;
        var distanceToNext = coords.length;
        
    }
    */
}

export { CircleInstanceController };