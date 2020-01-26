"use strict"

import { Account } from "../../models/account";
import { Cell } from "../../models/cell";
import { Pokestop } from "../../models/pokestop";
import * as turf from '@turf/turf';
import * as S2 from "nodes2ts";
import moment = require('moment');
import { getCurrentTimestamp, snooze } from "../../utils/util";

const AutoInstanceInterval: number = 2 * 1000;

const cooldownDataArray = { '0.3': 0.16, '1': 1, '2': 2, '4': 3, '5': 4, '8': 5, '10': 7, '15': 9, '20': 12, '25': 15, '30': 17, '35': 18, '45': 20, '50': 20, '60': 21, '70': 23, '80': 24, '90': 25, '100': 26, '125': 29, '150': 32, '175': 34, '201': 37, '250': 41, '300': 46, '328': 48, '350': 50, '400': 54, '450': 58, '500': 62, '550': 66, '600': 70, '650': 74, '700': 77, '751': 82, '802': 84, '839': 88, '897': 90, '900': 91, '948': 95, '1007': 98, '1020': 102, '1100': 104, '1180': 109, '1200': 111, '1221': 113, '1300': 117, '1344': 119/*, TODO: Number.MAX_VALUE: 120*/ };//.sorted { (lhs, rhs) -> Bool in
//    lhs.key < rhs.key
//}

enum AutoInstanceType {
    Quest
}

class AutoInstanceController {
    name: string;
    timeZoneOffset: number;
    minLevel: number;
    maxLevel: number;
    spinLimit: number;
    type: AutoInstanceType;
    multiPolygon: turf.MultiPolygon;

    private allStops: Pokestop[];
    private todayStops: Pokestop[];
    private todayStopsTries: Map<Pokestop, number>; //pokestop:tries
    private shouldExit: boolean;
    private bootstrapCellIds: string[];
    private bootstrapTotalCount: number = 0;

    constructor(name: string, multiPolygon: turf.MultiPolygon, type: AutoInstanceType, 
        timeZoneOffset: number, minLevel: number, maxLevel: number, spinLimit: number) {
        this.name = name;
        this.multiPolygon = multiPolygon;
        this.type = type;
        this.timeZoneOffset = timeZoneOffset;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.spinLimit = spinLimit;

        this.update();
        this.bootstrap();

        if (type === AutoInstanceType.Quest) {
            setInterval(() => this.autoLoop(), AutoInstanceInterval);
        }
    }
    bootstrap() {
        console.info("[AutoInstanceController]", name, "Checking Bootstrap Status...");
        let start = new Date();
        let totalCount = 0;
        let missingCellIds: S2.S2CellId[];
        this.multiPolygon.coordinates.forEach(async (pos: turf.helpers.Position[][], index: number, array: turf.helpers.Position[][][]) => {
            let polygon = turf.polygon(this.multiPolygon.coordinates[0]);
            let cellIds = this.getS2CellIds(polygon.geometry, 15, 15, Number.MAX_VALUE);
            totalCount += cellIds.length;
            let ids = cellIds.map(x => x.id);
            let done = false;
            let cells: Cell[] = [];
            while (!done) {
                try {
                    cells = await Cell.getInIds(ids.map(x => x.toString()));
                    done = true;
                } catch (err) {
                    snooze(1000);
                }
            }
            for (let i = 0; i < cells.length; i++) {
                let cell = cells[i];
                if (cells.includes(cell)) {
                    missingCellIds.push(new S2.S2CellId(cell.id));
                }   
            }
        });

        console.log("[AutoInstanceController]", name, "Bootstrap Status:", (totalCount - missingCellIds.length) + "/" + totalCount, "after", Math.round(getCurrentTimestamp() - (start.getTime() / 1000)) + "s")
        this.bootstrapCellIds = missingCellIds.map(x => x.id.toString());
        this.bootstrapTotalCount = totalCount;
    }
    update() {
        switch (this.type) {
            case AutoInstanceType.Quest:
                this.allStops = [];
                this.multiPolygon.coordinates.forEach(async (pos: turf.helpers.Position[][], index: number, array: turf.helpers.Position[][][]) => {
                    let polygon = turf.polygon(pos);
                    let bounds = turf.bbox(polygon);
                    //minX, minY, maxX, maxY
                    //bounds.southEast.latitude, bounds.northWest.latitude, bounds.northWest.longitude, bounds.southEast.longitude, 0);
                    let stops = Pokestop.getAll(bounds[0], bounds[1], bounds[2], bounds[3], 0);
                    let keys = Object.keys(stops);
                    keys.forEach(key => {
                        let stop = stops[key];
                        let position = turf.point([stop.lat, stop.lon]);
                        let coord = turf.getCoord(position);
                        if (polygon.geometry.coordinates.includes([coord])) {
                            this.allStops.push(stop);
                        }
                    });
                });
                this.todayStops = [];
                this.todayStopsTries = new Map<Pokestop, number>();
                this.allStops.forEach(stop => {
                    if (stop.questType === undefined && stop.enabled === true) {
                        this.todayStops.push(stop);
                    }
                });                
                break;
        }
    }
    encounterCooldown(distanceM: number) {
        let dist = distanceM / 1000;
        let keys = Object.keys(cooldownDataArray);
        keys.forEach(key => {
            let value = cooldownDataArray[key];
            if (parseInt(key) >= dist) {
                return parseInt(value) * 60;
            }
        });
        return 0;
    }
    async getTask(uuid: string, username: string) {
        switch (this.type) {
            case AutoInstanceType.Quest:
                if (this.bootstrapCellIds.length > 0) {
                    let target = this.bootstrapCellIds.pop();
                    let cellId = new S2.S2CellId(target);
                    let cell = new S2.S2Cell(cellId);
                    let center = S2.S2LatLng.fromPoint(cell.getCenter());
                    
                    // Get all cells touching a 630 (-5m for error) circle at center
                    let coord = center.toPoint();//.coordinates;
                    let raidans = 0.00009799064306948; //625m
                    let centerNormalizedPoint = center.normalized().toPoint();
                    let circle = new S2.S2Cap(centerNormalizedPoint, (raidans * raidans) / 2);
                    let coverer = new S2.S2RegionCoverer();
                    coverer.setMaxCells(100);
                    coverer.setMinLevel(15);
                    coverer.setMaxLevel(15);
                    let cellIds = coverer.getCoveringCells(circle);
                    cellIds.forEach(cellId => {
                        let index = this.bootstrapCellIds.indexOf(cellId.id.toString());
                        if (index) {
                            this.bootstrapCellIds.splice(index, 1);
                        }
                    });
                    if (!(this.bootstrapCellIds.length > 0)) {
                        this.bootstrap();
                        if (!(this.bootstrapCellIds.length > 0)) {
                            this.update();
                        }
                    }
                    return {
                        action: "scan_raid",
                        lat: coord.x,
                        lon: coord.y
                    };
                } else {
                    if (this.todayStops === null) {
                        this.todayStops = [];
                        this.todayStopsTries = new Map<Pokestop, number>();
                    }
                    if (this.allStops === null) {
                        this.allStops = [];
                    }
                    if (!(this.allStops.length > 0)) {
                        return { };
                    }
                    if (!(this.todayStops.length > 0)) {
                        let ids = this.allStops.map(stop => {
                            return stop.id;
                        });
                        let newStops: Pokestop[];
                        let done = false;
                        while (!done) {
                            try {
                                newStops = await Pokestop.getInIds(ids);
                                done = true;
                            } catch (err) {
                                snooze(1000);
                            }
                        }
                        newStops.forEach(stop => {
                            let count = this.todayStopsTries.get(stop) || 0;
                            if (stop.questType === undefined && stop.enabled && count <= 5) {
                                this.todayStops.push(stop);
                            }
                        });
                        if (!(this.todayStops.length > 0)) {
                            // TODO: delegate.instanceControllerDone(name);
                            return { };
                        }
                    }
                    
                    let lastLat: number;
                    let lastLon: number;
                    let lastTime: number;
                    let account: Account;
                    try {
                        if (username !== undefined && username !== null) {
                            let accountT = Account.getWithUsername(username).then(x => {
                                if (accountT) {
                                    account = x;
                                    lastLat = x.lastEncounterLat;
                                    lastLon = x.lastEncounterLon;
                                    lastTime = x.lastEncounterTime;
                                } else {
                                    // TODO: Don't think this is needed anymore
                                    /*
                                    lastLat = Double(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_lat") ?? "")
                                    lastLon = Double(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_lon") ?? "")
                                    lastTime = UInt32(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_time") ?? "")
                                    */
                                }
                            });
                        }
                    } catch (err) {
                        console.log("[AutoInstanceController] Failed to get account.");
                    }

                    if (username !== undefined && username !== null && account instanceof Account) {
                        if (account.spins >= this.spinLimit) {
                            return {
                                action: "switch_account",
                                min_level: this.minLevel,
                                max_level: this.maxLevel
                            }
                        } else {
                            Account.spin(username);
                        }
                    }

                    let newLat: number;
                    let newLon: number;
                    let encounterTime: number;
                    let pokestop: Pokestop;
                    if (lastLat && lastLon) {
                        let current = turf.point([lastLat, lastLon]);
                        let closest: Pokestop;
                        let closestDistance: number = 10000000000000000; // TODO: Fix numeric literals
                        let todayStopsC = this.todayStops;
                        if (!(todayStopsC.length > 0)) {
                            return { };
                        }
                        todayStopsC.forEach(function(stop) {
                            let coord = turf.point([stop.lat, stop.lon]);
                            let dist = turf.distance(current, coord, { units: "kilometers" });
                            if (dist < closestDistance) {
                                closest = stop;
                                closestDistance = dist;
                            }
                        });
                        if (closest instanceof Pokestop) {
                            newLat = closest.lat;
                            newLon = closest.lon;
                            pokestop = closest;
                            let now = getCurrentTimestamp();
                            if (lastTime > 0) {
                                let encounterTimeT = lastTime + this.encounterCooldown(closestDistance);
                                if (encounterTimeT < now) {
                                    encounterTime = now;
                                } else {
                                    encounterTime = encounterTimeT;
                                }
                                if (encounterTime - now >= 7200) {
                                    encounterTime = now + 7200;
                                }
                            } else {
                                encounterTime = now;
                            }
                        } else {
                            return { };
                        }
                        let index = this.todayStops.indexOf(pokestop);
                        if (index >= 0) {
                            this.todayStops.splice(index, 1);
                        }
                    } else {
                        let stop = this.todayStops.pop();
                        if (stop instanceof Pokestop) {
                            newLat = stop.lat;
                            newLon = stop.lon;
                            pokestop = stop;
                            encounterTime = getCurrentTimestamp();
                            this.todayStops.pop();
                        } else {
                            return { };
                        }
                    }

                    if (this.todayStopsTries.has(pokestop)) {
                        let todayStopTries = this.todayStopsTries.get(pokestop);
                        this.todayStopsTries.set(pokestop, todayStopTries + 1);
                    } else {
                        this.todayStopsTries.set(pokestop, 1);
                    }
                    if (username !== undefined && username !== null && account instanceof Account) {
                        try {
                            Account.didEncounter(username, newLat, newLon, encounterTime);
                        } catch (err) { }
                    } else {
                        /*
                        try? DBController.global.setValueForKey(key: "AIC_\(uuid)_last_lat", value: newLat.description)
                        try? DBController.global.setValueForKey(key: "AIC_\(uuid)_last_lon", value: newLon.description)
                        try? DBController.global.setValueForKey(key: "AIC_\(uuid)_last_time", value: encounterTime.description)
                        */
                    }
                    let delayT = getCurrentTimestamp() - encounterTime;
                    let delay = 0;
                    if (delayT < 0) {
                        delay = 0;
                    } else {
                        delay = delayT + 1;
                    }
                    if (!(this.todayStops.length > 0)) {
                        let ids = this.allStops.map(function(stop) {
                            return stop.id;
                        });
                        let newStops: Pokestop[];
                        let done: boolean = false;
                        while (!done) {
                            try {
                                newStops = await Pokestop.getInIds(ids);
                                done = true;
                            } catch (err) {
                                snooze(1000);
                            }
                        }
                        newStops.forEach(function(stop) {
                            if ((stop.questType === undefined || stop.questType === null) && stop.enabled) {
                                this.todayStops.push(stop);
                            }
                        });
                        if (!(this.todayStops.length > 0)) {
                            console.log("[AutoInstanceController]", name, "Instance done.");
                            // TODO: delegate.instanceControllerDone(name);
                        }
                    }

                    return {
                        action: "scan_quest",
                        lat: newLat,
                        lon: newLon,
                        delay: delay,
                        min_level: this.minLevel,
                        max_level: this.maxLevel
                    }
                }
                break;
        }
    }
    async getStatus(formatted: boolean) {
        switch (this.type) {
            case AutoInstanceType.Quest:
                if (!(this.bootstrapCellIds.length > 0)) {
                    let totalCount = this.bootstrapTotalCount;
                    let count = totalCount - this.bootstrapCellIds.length;
                    let percentage: number;
                    if (totalCount > 0) {
                        percentage = count / totalCount * 100;
                    } else {
                        percentage = 100;
                    }
                    if (formatted) {
                        return ""; // TODO: "Bootstrapping \(count)/\(totalCount) (\(percentage.rounded(toStringWithDecimals: 1))%)";
                    } else {
                        return {
                            bootstrapping: {
                                current_count: count,
                                total_count: totalCount
                            }
                        };
                    }
                } else {
                    let currentCountDb = 0;
                    let ids = this.allStops.map(function(stop) {
                        return stop.id
                    });
                    let stops = await Pokestop.getInIds(ids);
                    if (stops instanceof Pokestop) {
                        stops.forEach(function(stop) {
                            if (stop.questType !== undefined) {
                                currentCountDb++;
                            }
                        });
                    }
    
                    let maxCount = this.allStops.length || 0;
                    let currentCount = maxCount - (this.todayStops.length || 0);

                    /*
                    let percentage: number;
                    if (maxCount > 0) {
                        percentage = currentCount / maxCount * 100;
                    } else {
                        percentage = 100;
                    }
                    let percentageReal: number;
                    if (maxCount > 0) {
                        percentageReal = currentCountDb / maxCount * 100;
                    } else {
                        percentageReal = 100;
                    }
                    */
                    if (formatted) {
                        return ""; //"Done: \(currentCountDb)|\(currentCount)/\(maxCount) (\(percentageReal.rounded(toStringWithDecimals: 1))|\(percentage.rounded(toStringWithDecimals: 1))%)"
                    } else {
                        return {
                            "quests": {
                                "current_count_db": currentCountDb,
                                "current_count_internal": currentCount,
                                "total_count": maxCount
                            }
                        };
                    }
    
                }
                break;
        }
    }
    reload() {
        this.update();
    }
    stop() {
        this.shouldExit = true;
        //if (this.questClearerQueue !== null) {
        //    // TODO: Threading.destroyQueue(questClearerQueue!)
        //}
    }
    autoLoop() {
        //while (!this.shouldExit) {
            let date = moment(new Date(), 'HH:mm:ss');
            // TODO: formatter.timeZone = TimeZone(secondsFromGMT: timezoneOffset) ?? Localizer.global.timeZone;
            let split = date.toString().split(":");
            let hour = parseInt(split[0]);
            let minute = parseInt(split[1]);
            let second = parseInt(split[2]);

            let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
            let at = date.add(timeLeft);
            console.log("[AutoInstanceController]", "[" + name + "]", "Clearing Quests in", timeLeft + "s", "at", at, "(Currently:", date, ")");

            if (timeLeft > 0) {
                snooze(timeLeft * 1000);
                if (this.shouldExit) {
                    return;
                }
                if (this.allStops === undefined || this.allStops === null) {
                    console.log("[AutoInstanceController]", "[" + name + "]", "Tried clearing quests but no stops.");
                    //continue;
                    return;
                }

                console.log("[AutoInstanceController]", "[" + name + "]", "Getting stop ids.");
                let ids = this.allStops.map(function(stop) {
                    return stop.id;
                });
                let done = false;
                console.log("[AutoInstanceController]", "[", name, "]", "Clearing Quests for ids:", ids);
                while (!done) {
                    try {
                        Pokestop.clearQuests(ids);
                        done = true;
                    } catch (err) {
                        snooze(5000);
                        if (this.shouldExit) {
                            return;
                        }
                    }
                }
                this.update();
            }
        //}
    }
    getS2CellIds(polygon: turf.Polygon, minLevel: number, maxLevel: number, maxCells: number): S2.S2CellId[] {
        let bbox = polygon.bbox;//new S2.BoundingBox(polygon.coordinates[0])
        let region = S2.S2LatLngRect.fromLatLng(
            S2.S2LatLng.fromDegrees(
                new S2.S1Angle(bbox[0]/*southEast.latitude*/).degrees(),
                new S2.S1Angle(bbox[1]/*northWest.longitude*/).degrees()
            ),
            new S2.S2LatLng(
                new S2.S1Angle(bbox[2]/*northWest.latitude*/).degrees(),
                new S2.S1Angle(bbox[3]/*southEast.longitude*/).degrees()
            )
        );
        let regionCoverer = new S2.S2RegionCoverer();
        regionCoverer.setMaxCells(maxCells);
        regionCoverer.setMinLevel(minLevel);
        regionCoverer.setMaxLevel(maxLevel);
        let cellIdsBBox = regionCoverer.getInteriorCoveringCells(region);

        let cellIds: S2.S2CellId[] = [];
        cellIdsBBox.forEach(cellId => {
            let cell = new S2.S2Cell(cellId);
            let vertex0 = cell.getVertex(0);
            let vertex1 = cell.getVertex(1);
            let vertex2 = cell.getVertex(2);
            let vertex3 = cell.getVertex(3);
            //init(lat: S1Angle(degrees: coord.latitude), lng: S1Angle(degrees: coord.longitude)
            let coord0 = S2.S2LatLng.fromPoint(new S2.S2Point(vertex0.x, vertex0.y, vertex0.z));
            let coord1 = S2.S2LatLng.fromPoint(new S2.S2Point(vertex1.x, vertex1.y, vertex1.z));
            let coord2 = S2.S2LatLng.fromPoint(new S2.S2Point(vertex2.x, vertex2.y, vertex2.z));
            let coord3 = S2.S2LatLng.fromPoint(new S2.S2Point(vertex3.x, vertex3.y, vertex3.z));
            //REVIEW: Make sure this works.
            if (polygon.coordinates.includes(turf.point([coord0.latDegrees, coord0.lngDegrees])[0]) || 
                polygon.coordinates.includes(turf.point([coord1.latDegrees, coord1.lngDegrees])[0]) || 
                polygon.coordinates.includes(turf.point([coord2.latDegrees, coord2.lngDegrees])[0]) || 
                polygon.coordinates.includes(turf.point([coord3.latDegrees, coord3.lngDegrees])[0])) {
                cellIds.push(cellId);
            }
        });
        return cellIds;
    }
}

export { AutoInstanceController, AutoInstanceType };