import { InstanceController } from "instance-controller"

"use strict"

class CircleInstanceController extends InstanceController {
    lastUuidIndex = {};
    lastUuidSeenTime = {};

    //coords;
    lastIndex: number;
    lastLastCompletedTime: number;
    lastCompletedTime: number;

    constructor(name: string, type: InstanceType, minLevel: number, maxLevel: number, coords: [any]) {
        super(name, type, minLevel, maxLevel);
        coords = coords;
        this.lastCompletedTime = new Date().;
    }
    getTask(uuid: string, username: string) {
        var currentIndex = this.lastIndex;
        if (this.lastIndex + 1 === super.coords.length) {
            this.lastLastCompletedTime = this.lastCompletedTime;
            this.lastCompletedTime = new Date().getUTCSeconds();
            this.lastIndex = 0;
        } else {
            this.lastIndex = this.lastIndex + 1;
        }

        var currentCoord = super.coords[currentIndex];
        switch (super.type) {
            case "pokemon":
                return {
                    action: "scan_pokemon",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: super.minLevel,
                    max_level: super.maxLevel
                };
            case "raids":
                return {
                    action: "scan_raid",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: super.minLevel,
                    max_level: super.maxLevel
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

module.exports = CircleInstanceController;