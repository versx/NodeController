"use strict"

//enum CircleType {
//    case pokemon
//    case raid
//}

class CircleInstanceController {
    lastUuidIndex = {};
    lastUuidSeenTime = {};
    name;
    minLevel;
    maxLevel;
    type;
    coords;
    lastIndex;
    lastLastCompletedTime;
    lastCompletedTime;

    constructor(name, coords, type, minLevel, maxLevel) {
        this.name = name;
        this.coords = coords;
        this.type = type;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.lastCompletedTime = new Date();
    }
    getTask(uuid, username) {
        var currentIndex = this.lastIndex;
        if (lastIndex + 1 === this.coords.length) {
            this.lastLastCompletedTime = this.lastCompletedTime;
            lastCompletedTime = new Date();
            lastIndex = 0;
        } else {
            lastIndex = lastIndex + 1;
        }

        var currentCoord = coords[currentIndex];
        if (type === "pokemon") {
            return {
                action: "scan_pokemon",
                lat: currentCoord.lat,
                lon: currentCoord.lon,
                min_level: this.minLevel,
                max_level: this.maxLevel
            };
        } else if (type === "raid") {
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
        lastIndex = 0;
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