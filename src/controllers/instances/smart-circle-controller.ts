"use strict"

import * as S2 from 'nodes2ts';
import { Gym } from '../../models/gym';
import { InstanceType } from './instance-controller';
import { CircleInstanceController } from './circle-controller';
import { Coord } from '../../coord';
import { getCurrentTimestamp, snooze } from '../../utils/util';

class CircleSmartRaidInstanceController extends CircleInstanceController {
    private smartRaidInterval: number = 30 * 1000; // 30 seconds
    private smartRaidGyms: Map<string, Gym>;
    private smartRaidGymsInPoint: Map<Coord, string[]>;
    private smartRaidPointsUpdated: Map<Coord, Date>;

    private startDate: Date;
    private count: number = 0;
    private shouldExit: boolean = false;
    
    static raidInfoBeforeHatch: number = 120; // 2 minutes
    static ignoreTime: number = 150; // 2.5 minutes
    static noRaidTime: number = 1800; // 30 minutes

    constructor(name: string, minLevel: number, maxLevel: number, coords: Coord[]) {
        super(name, InstanceType.SmartCircleRaid, minLevel, maxLevel, coords);

        coords.forEach(async (point: Coord) => {
            // Get all cells rouching a 630m (-5m for error) circle at center
            let coord = new S2.S2Point(point.lat, point.lon, 0);
            let radians = 0.00009799064306948; // 625m
            let centerNormalizedPoint = S2.S2LatLng.fromPoint(coord).normalized().toPoint();
            let circle = new S2.S2Cap(centerNormalizedPoint, (radians * radians) / 2);
            let coverer = new S2.S2RegionCoverer();
            coverer.setMaxCells(100);
            coverer.setMinLevel(15);
            coverer.setMaxLevel(15);
            let cellIds = coverer.getCoveringCells(circle).map(cell => cell.id.toString());            
            let loaded = false;
            while (!loaded) {
                try {
                    let gyms: Gym[] = await Gym.getByCellIds(cellIds);
                    if (this.smartRaidGymsInPoint.has(point)) {
                        let gym = gyms.map(gym => gym.id.toString());
                        if (gym.length > 0) {
                            this.smartRaidGymsInPoint.set(point, gym);
                        }
                    }
                    if (this.smartRaidPointsUpdated.has(point)) {
                        this.smartRaidPointsUpdated.set(point, new Date(0));
                    }
                    gyms.forEach(gym => {
                        if (this.smartRaidGyms[gym.id] === null) {
                            this.smartRaidGyms[gym.id] = gym
                        }
                    });
                    loaded = true;
                } catch (err) {
                    snooze(5000);
                }
            }
        });
        
        setInterval(() => this.raidUpdaterRun(), this.smartRaidInterval);
    }
    async raidUpdaterRun() {
        while (!this.shouldExit) {
            let ids: string[] = Array.from(this.smartRaidGyms.keys());
            let gyms = await Gym.getByIds(ids);
            if (gyms === null) {
                snooze(5000);
                continue;
            }
            gyms.forEach(gym => {
                this.smartRaidGyms[gym.id] = gym;
            });
            snooze(30 * 1000);
        }
    }
    stop() {
        this.shouldExit = true;
        // TODO: Stop smart raid interval
        //if (raidUpdaterQueue !== null) {
        //    Threading.destroyQueue(raidUpdaterQueue);
        //}
    }
    getTask(uuid: string, username: string) {
        // Get gyms without raid and gyms without boss where updated ago > ignoreTime
        let gymsNoRaid: [Gym, Date, Coord][] = [];
        let gymsNoBoss: [Gym, Date, Coord][] = [];
        this.smartRaidGymsInPoint.forEach((value: string[], key: Coord, map: Map<Coord, string[]>) => {
            let updated = this.smartRaidPointsUpdated.get(key);
            let nowTimestamp = getCurrentTimestamp();
            if (updated === undefined || 
                updated === null || 
                nowTimestamp >= (/*TODO: Verify this is correct*/updated.getTime() / 1000) + CircleSmartRaidInstanceController.ignoreTime) {
                value.forEach(id => {
                    let gym = this.smartRaidGyms[id];
                    if (gym.raidEndTimestamp === undefined || 
                        gym.raidEndTimestamp === null ||
                        nowTimestamp >= parseInt(gym.raidEndTimestamp) + CircleSmartRaidInstanceController.noRaidTime) {
                        gymsNoRaid.push([gym, updated, key]);
                    } else if (gym.raidPokemonId === undefined ||
                        gym.raidPokemonId === null &&
                        gym.raidBattleTimestamp &&
                        nowTimestamp >= parseInt(gym.raidBattleTimestamp) - CircleSmartRaidInstanceController.raidInfoBeforeHatch) {
                        gymsNoBoss.push([gym, updated, key]);
                    }
                });
            }
        });

        // Get coord to scan
        let coord: Coord;
        // TODO: Type 'Coord' cannot be used as an index type.
        if (!(gymsNoBoss.length > 0)) {
            //gymsNoBoss.sort((lhs, rhs) => lhs[1] < rhs[1]);
            let first = gymsNoBoss.pop();
            //this.smartRaidPointsUpdated[first[2]] = new Date().getTime();
            coord = first[2];
        } else if (!(gymsNoRaid.length > 0)) {
            //gymsNoRaid.sort((lhs, rhs) => lhs[1] < rhs[1]);
            let first = gymsNoRaid.pop();
            //this.smartRaidPointsUpdated[first[2]] = new Date().getTime();
            coord = first[2];
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
                area: this.name,
                action: "scan_raid",
                lat: coord.lat,
                lon: coord.lon,
                min_level: this.minLevel,
                max_level: this.maxLevel
            };
        }
    }
    getStatus(formatted: boolean): any {
        let scansh: number;
        if (this.startDate instanceof Date) {
            scansh = this.count / getCurrentTimestamp() - (this.startDate.getTime() / 1000) * 3600;
        } else {
            scansh = null;
        }
        if (formatted) {
            return "Scans/h: " + (scansh === null ? "-" : scansh);
        }
        return { scans_per_h: scansh };
    }
}

export { CircleSmartRaidInstanceController };