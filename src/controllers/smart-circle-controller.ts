import { Gym } from "../models/gym";
import { InstanceType } from "./instance-controller";
import { CircleInstanceController } from "./circle-controller";
const S2 = require("nodes2ts");

"use strict"

class Coord {
    latitude: number;
    longitude: number;
}

class CircleSmartRaidInstanceController extends CircleInstanceController {
    smartRaidGyms: Map<string, Gym>;
    smartRaidGymsInPoint: Map<Coord, string>;
    smartRaidPointsUpdated: Map<Coord, Date>;

    //raidUpdaterQueue ThreadQueue

    startDate: Date;
    count: number = 0;
    shouldExit: boolean = false;
    static raidInfoBeforeHatch: number = 120; // 2 minutes
    static ignoreTime: number = 150; // 2.5 minutes
    static noRaidTime: number = 1800; // 30 minutes

    constructor(name: string, minLevel: number, maxLevel: number, coords: [any]) {
        super(name, InstanceType.SmartCircleRaid, minLevel, maxLevel, coords);

        coords.forEach(function(point) {
            // Get all cells rouching a 630m (-5m for error) circle at center
            let coord = { latitude: point.lat, longitude: point.lon };
            let radians = 0.00009799064306948; // 625m
            let centerNormalizedPoint = new S2.S2LatLng(coord).normalized().point;
            let circle = new S2.S2Cap(centerNormalizedPoint, (radians * radians) / 2);
            let coverer = new S2.S2RegionCoverer();
            coverer.setMaxCells(100);
            coverer.setMinLevel(15);
            coverer.setMaxLevel(15);
            let cellIds = coverer.getCovering(circle).map(cell => cell.uid);            
            let loaded = false;
            while (!loaded) {
                try {
                    let gyms = Gym.getByCellIds(cellIds);
                    this.smartRaidGymsInPoint[point] = gyms.map(gym => gym.id);
                    this.smartRaidPointsUpdated[point] = 0;// Date(timeIntervalSince1970: 0)
                    gyms.forEach(function(gym) {
                        if (this.smartRaidGyms[gym.id] === null) {
                            this.smartRaidGyms[gym.id] = gym
                        }
                    });
                    loaded = true;
                } catch (err) {
                    // TODO: Sleep 5 seconds
                }
            }
        });
        
        //raidUpdaterQueue = Threading.getQueue(name:  "\(name)-raid-updater", type: .serial)
        //raidUpdaterQueue!.dispatch {
            this.raidUpdaterRun();
        //}
    }
    raidUpdaterRun() {

    }
    stop() {
        this.shouldExit = true;
        //if (raidUpdaterQueue !== null) {
        //    Threading.destroyQueue(raidUpdaterQueue);
        //}
    }
    getTask(uuid: string, username: string) {
        // Get gyms without raid and gyms without boss where updated ago > ignoreTime
        let gymsNoRaid: [Gym, Date, Coord][];
        let gymsNoBoss: [Gym, Date, Coord][];
        this.smartRaidGymsInPoint.forEach(function(gymsInPoint) {
            let updated = this.smartRaidPointsUpdated.get(gymsInPoint);
            let nowTimestamp = new Date().getUTCSeconds();
            if (updated === null || nowTimestamp >= updated + CircleSmartRaidInstanceController.ignoreTime) {
                this.gymsInPoint.forEach(function(id) {
                    let gym = this.smartRaidGyms[id];
                    if (gym.raidEndTimestamp === null ||
                        nowTimestamp >= parseInt(gym.raidEndTimestamp) + CircleSmartRaidInstanceController.noRaidTime) {
                        gymsNoRaid.push([gym, updated, null]);/*TODO: gymsInPoint*/
                    } else if (gym.raidPokemonId === null &&
                        gym.raidBattleTimestamp !== null &&
                        nowTimestamp >= parseInt(gym.raidBattleTimestamp) - CircleSmartRaidInstanceController.raidInfoBeforeHatch) {
                        gymsNoBoss.push([gym, updated, null]);/*TODO: gymsInPoint*/
                    }
                });
            }
        });

        // Get coord to scan
        var coord: Coord;
        if (!(gymsNoBoss.length > 0)) {
            // TODO: gymsNoBoss.sort((lhs, rhs) => lhs.1 < rhs.1);
            let first = gymsNoBoss.pop();
            // TODO: smartRaidPointsUpdated[first.2] = new Date();
            // TODO: coord = first.2;
        } else if (!(gymsNoRaid.length > 0)) {
            // TODO: gymsNoRaid.sort((lhs, rhs) => lhs.1 < rhs.1);
            let first = gymsNoRaid.pop();
            // TODO: smartRaidPointsUpdated[first.2] = new Date();
            // TODO: coord = first.2;
        }
        
        if (coord instanceof Coord) {
            if (this.startDate === null) {
                this.startDate = new Date();
            }
            if (this.count === Number.MAX_VALUE) {
                this.count = 0;
                this.startDate = new Date();
            } else {
                this.count++;
            }
            return {
                action: "scan_raid",
                lat: coord.latitude,
                lon: coord.longitude,
                min_level: this.minLevel,
                max_level: this.maxLevel
            };
        }
    }
    getStatus() {//formatted: boolean) {
        let scansh: number;
        if (this.startDate !== null) {
            scansh = this.count / new Date().getUTCSeconds() - this.startDate.getUTCSeconds() * 3600;
        } else {
            scansh = null;
        }
        //if (formatted) {
            //return "Scans/h: " + (scansh === null ? "-" : scansh);
        //} else {
            //return { scans_per_h: scansh };
            return { round_time: scansh };
        //}
    }
}

export { CircleSmartRaidInstanceController };