"use strict"

import { InstanceType } from "./instance-controller"
import { Coord } from "../../coord";
import { getCurrentTimestamp } from "../../utils/util";

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
        this.lastCompletedTime = getCurrentTimestamp();
        this.lastIndex = 0;
    }
    getTask(uuid: string, username: string) {
        let currentIndex: number = 0;
        if (this.type !== InstanceType.CirclePokemon) {
           currentIndex = this.lastIndex;
            if (this.lastIndex + 1 === this.coords.length) {
                this.lastLastCompletedTime = this.lastCompletedTime;
                this.lastCompletedTime = getCurrentTimestamp();
                this.lastIndex = 0;
            } else {
                this.lastIndex = this.lastIndex + 1
            }
        }

        let currentCoord = this.coords[currentIndex]; //TODO: Fix coords, add individually not full array, or find addRange method
        switch (this.type) {
            case InstanceType.CirclePokemon:
                let currentUuidIndex = {};
                currentUuidIndex[uuid] = (this.lastUuidIndex[uuid] || Math.round(Math.random() % this.coords.length)); // TODO: UInt16.random
                let shouldAdvance = true
                if ((Math.random() % 100) < 5) {
                    //Use a light hand and 5% of the time try to space out devices
                    //This ensures average round time decreases by at most 10% using this
                    //approach
                    let data = this.queryLiveDevices(uuid, currentUuidIndex[uuid]);
                    let numLiveDevices = data[0];
                    let distanceToNextLiveDevice = data[1];
                    //let (numLiveDevices, distanceToNextLiveDevice) = this.queryLiveDevices(uuid, currentUuidIndex[uuid]);
                    if ((distanceToNextLiveDevice * (numLiveDevices + 0.5)) < this.coords.length) {
                        //We're too close to the next device in the route.
                        shouldAdvance = false;
                    }
                }
                if (currentUuidIndex[uuid] === 0){
                    //Don't back up past 0 to avoid round time inaccuracy
                    shouldAdvance = true;
                }
                if (shouldAdvance) {
                    currentUuidIndex[uuid] = currentUuidIndex[uuid] + 1;
                    if (currentUuidIndex[uuid] >= this.coords.length) {
                        currentUuidIndex[uuid] = 0;
                        //This is an approximation of round time.
                        this.lastLastCompletedTime = this.lastCompletedTime;
                        this.lastCompletedTime = getCurrentTimestamp();
                    }
                } else {
                    //Back up!
                    currentUuidIndex[uuid] = currentUuidIndex[uuid] - 1;
                    if (currentUuidIndex[uuid] < 0) {
                        currentUuidIndex[uuid] = this.coords.length - 1;
                    }
                }
                //This is the only place either of these dicts are modified:
                this.lastUuidIndex[uuid] = currentUuidIndex[uuid];
                this.lastUuidSeenTime[uuid] = getCurrentTimestamp();
                currentCoord = this.coords[currentUuidIndex[uuid] || 0];

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
    routeDistance(x: number, y: number): number {
        if (x < y ) {
            return y - x;
        }
        return y + (this.coords.length - x);
    }
    queryLiveDevices(uuid: string, index: number): [number, number] {
        // In seconds
        let deadDeviceCutoff = getCurrentTimestamp() - 60 * 1000;
        // Include the querying device in the count
        let numLiveDevices = 1;
        let distanceToNext = this.coords.length;
        let keys = Object.keys(this.lastUuidIndex);
        keys.forEach((uuid, oindex) => {
            console.log(uuid);
            console.log(oindex);
            let ouuid: string = keys[oindex];
            let index: number = this.lastUuidIndex[uuid];
            // Skip the querying device
            if (ouuid !== uuid) {
                let lastSeen = this.lastUuidSeenTime[ouuid];
                if (lastSeen > deadDeviceCutoff) {
                    numLiveDevices++;
                    let dist = this.routeDistance(index, oindex);
                    if (dist < distanceToNext) {
                        distanceToNext = dist;
                    }
                }
            }
        });
        /*
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
        */
        return [numLiveDevices, distanceToNext];
    }
}

export { CircleInstanceController };