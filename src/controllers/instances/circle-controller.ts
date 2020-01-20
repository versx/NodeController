"use strict"

import { InstanceType } from "./instance-controller"
import { Coord } from "../../coord";

class CircleInstanceController {
    lastUuidIndex = {};
    lastUuidSeenTime = {};

    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    coords: Coord[];

    private lastIndex: number;
    private lastLastCompletedTime: number;
    private lastCompletedTime: number;

    constructor(name: string, type: InstanceType, minLevel: number, maxLevel: number, coords: Coord[]) {
        this.name = name;
        this.type = type;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.coords = coords;
        this.lastCompletedTime = new Date().getTime();
        this.lastIndex = 0;
    }
    getTask(uuid: string, username: string) {
        let currentIndex: number = 0;
        if (this.type !== InstanceType.CirclePokemon) {
           currentIndex = this.lastIndex;
            if (this.lastIndex + 1 === this.coords.length) {
                this.lastLastCompletedTime = this.lastCompletedTime;
                this.lastCompletedTime = new Date().getTime();
                this.lastIndex = 0;
            } else {
                this.lastIndex = this.lastIndex + 1
            }
        }

        let currentCoord = this.coords[currentIndex]; //TODO: Fix coords, add individually not full array, or find addRange method
        switch (this.type) {
            case InstanceType.CirclePokemon:
                return {
                    area: this.name,
                    action: "scan_pokemon",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: this.minLevel,
                    max_level: this.maxLevel
                };
            case InstanceType.CircleRaid:
                return {
                    area: this.name,
                    action: "scan_raid",
                    lat: currentCoord.lat,
                    lon: currentCoord.lon,
                    min_level: this.minLevel,
                    max_level: this.maxLevel
                };
            case InstanceType.Leveling:
                /*
                let currentUuidIndex: [string, number] = [uuid, this.lastUuidIndex[uuid] || 0];
                //if (!startup) {
                    if ((this.lastUuidIndex[uuid] || 0) + 1 == this.coords.length) {
                        this.lastUuidIndex[uuid] = 0
                    } else {
                        this.lastUuidIndex[uuid] = (this.lastUuidIndex[uuid] || 0) + 1
                    }
                //}
                currentCoord = this.coords[currentUuidIndex[uuid] || 0]
                */
                return {
                  area: this.name,
                    action: "leveling",
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
    routeDistance(x: number, y: number) {
        if (x < y ) {
            return y - x;
        }
        return y + (this.coords.length - x);
    }
    queryLiveDevices(uuid: string, index: number) {
        // In seconds
        let deadDeviceCutoff = new Date().getTime() - 60 * 1000;
        // Include the querying device in the count
        let numLiveDevices = 1;
        let distanceToNext = this.coords.length;
        var keys = Object.keys(this.lastUuidIndex);
        for (let i = 0; i < keys.length; i++) {
            let ouuid = this.lastUuidIndex[i];
            // Skip the querying device
            if (ouuid === uuid) {
                continue;
            }
            let lastSeen = this.lastUuidSeenTime[ouuid];
            if (lastSeen > deadDeviceCutoff) {
                numLiveDevices++;
                let dist = this.routeDistance(index, i);
                if (dist < distanceToNext) {
                    distanceToNext = dist;
                }
            }
        }
        return [numLiveDevices, distanceToNext];
    }
}

export { CircleInstanceController };