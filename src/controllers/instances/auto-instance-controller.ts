"use strict"

import { Account } from "../../models/account";
import { Pokestop } from "../../models/pokestop";
import { S2Cell } from "../../models/s2cell";

import S2 = require('nodes2ts');
import moment = require('moment');

const cooldownDataArray = { '0.3': 0.16, '1': 1, '2': 2, '4': 3, '5': 4, '8': 5, '10': 7, '15': 9, '20': 12, '25': 15, '30': 17, '35': 18, '45': 20, '50': 20, '60': 21, '70': 23, '80': 24, '90': 25, '100': 26, '125': 29, '150': 32, '175': 34, '201': 37, '250': 41, '300': 46, '328': 48, '350': 50, '400': 54, '450': 58, '500': 62, '550': 66, '600': 70, '650': 74, '700': 77, '751': 82, '802': 84, '839': 88, '897': 90, '900': 91, '948': 95, '1007': 98, '1020': 102, '1100': 104, '1180': 109, '1200': 111, '1221': 113, '1300': 117, '1344': 119/*, TODO: number.MAX_VALUE: 120*/ };//.sorted { (lhs, rhs) -> Bool in
//    lhs.key < rhs.key
//}

enum AutoInstanceType {
    Quest
}

class AutoInstanceController {
    name: string;
    area: [any];
    timeZoneOffset: number;
    minLevel: number;
    maxLevel: number;
    spinLimit: number;
    type: AutoInstanceType;
    multiPolygon: any;

    private allStops: Pokestop[];
    private todayStops: Pokestop[];
    private todayStopsTries: Map<Pokestop, number>; //pokestop:tries
    private shouldExit: boolean;
    private bootstrapCellIds: number[];
    private bootstrapTotalCount: number = 0;

    constructor(name: string, area: [any], type: AutoInstanceType, timeZoneOffset: number, minLevel: number, maxLevel: number, spinLimit: number) {
        this.name = name;
        this.area = area;
        this.type = type;
        this.timeZoneOffset = timeZoneOffset;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.spinLimit = spinLimit;

        this.update();
        this.bootstrap();

        if (type === AutoInstanceType.Quest) {
            setInterval(() => this.autoLoop());
        }
    }
    bootstrap() {
        console.log("[AutoInstanceController]", name, "Checking Bootstrap Status...");
        let start = new Date();
        let totalCount = 0;
        let missingCellIds: [S2.S2CellId];
        this.multiPolygon.polygons.forEach(polygon => {
            // TODO: actual multipolygon
            let cellIds = polygon.getS2CellIds(15, 15, Number.MAX_VALUE);
            totalCount += cellIds.length;
            let ids = cellIds.map(x => x.id);
            let done = false;
            let cells = [S2Cell];
            while (!done) {
                try {
                    cells = S2Cell.getInIds(ids);
                    done = true;
                } catch (err) {
                    // TODO: sleep 1 second
                }
            }
            for (let i = 0; i < cells.length; i++) {
                let cell = cells[i];
                if (cells.includes(cell)) {
                    missingCellIds.push(new S2.S2CellId(cell.prototype.id));
                }   
            }
        });
        console.log("[AutoInstanceController]", name, "Bootstrap Status:", totalCount - missingCellIds.length + "/" + totalCount, "after", Math.round(new Date().getUTCSeconds() - start.getUTCSeconds()) + "s")
        //this.bootstrapCellIds = missingCellIds; // TODO: fix
        this.bootstrapTotalCount = totalCount;
    }
    update() {
        switch (this.type) {
            case AutoInstanceType.Quest:
                this.allStops = [];
                this.multiPolygon.polygons.forEach(polygon => {
                    // TODO: let bounds = new S2.BoundingBox(polygon.outerRing.coordinates);
                    let stops = Pokestop.getAll(); //minLat: bounds.southEast.latitude, maxLat: bounds.northWest.latitude, minLon: bounds.northWest.longitude, maxLon: bounds.southEast.longitude, updated: 0, questsOnly: false, showQuests: true, showLures: true, showInvasions: true) {
                    let keys = Object.keys(stops);
                    keys.forEach(key => {
                        let stop = stops[key];
                        let coord = { lat: stop.lat, lon: stop.lon };
                        if (polygon.includes(coord, /*IgnoreBoundary*/ false)) {
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
    getTask(uuid: string, username: string) {
        switch (this.type) {
            case AutoInstanceType.Quest:
                if (this.bootstrapCellIds.length > 0) {
                    let target = this.bootstrapCellIds.pop();
                    var cellId = new S2.S2CellId(target.toString());
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
                        // TODO: let index = this.bootstrapCellIds.indexOf(cellId);
                        //if (index !== undefined) {
                        //    this.bootstrapCellIds.remove(index); // TODO: redo
                        //}
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
                                newStops = Pokestop.getIn(ids);
                                done = true;
                            } catch (err) {
                                // TODO: sleep 1 second
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
                        let current = { lat: lastLat, lon: lastLon };
                        let closest: Pokestop;
                        let closestDistance: number = 10000000000000000;
                        let todayStopsC = this.todayStops;
                        if (!(todayStopsC.length > 0)) {
                            return { };
                        }
                        todayStopsC.forEach(function(stop) {
                            let coord = { lat: stop.lat, lon: stop.lon };
                            let dist = 0; // TODO: current.getDistance(coord);
                            if (dist < closestDistance) {
                                closest = stop;
                                closestDistance = dist;
                            }
                        });
                        if (closest instanceof Pokestop) {
                            newLat = closest.lat;
                            newLon = closest.lon;
                            pokestop = closest;
                            let now = new Date().getUTCSeconds();
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
                            // TODO: this.todayStops.remove(index);
                        }
                    } else {
                        let stop = this.todayStops.pop();
                        if (stop instanceof Pokestop) {
                            newLat = stop.lat;
                            newLon = stop.lon;
                            pokestop = stop;
                            encounterTime = new Date().getUTCSeconds();
                            // TODO: remove _ this.todayStops.pop(); 
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
                    let delayT = 0; // TODO: Int(Date(timeIntervalSince1970: Double(encounterTime)).timeIntervalSinceNow);
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
                                newStops = Pokestop.getIn(ids);
                                done = true;
                            } catch (err) {
                                // TODO: sleep 1 second
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
    getStatus(formatted: boolean) {
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
                    let stops = Pokestop.getIn(ids);
                    if (stops instanceof Pokestop) {
                        stops.forEach(function(stop) {
                            if (stop.questType !== undefined) {
                                currentCountDb++;
                            }
                        });
                    }
    
                    let maxCount = this.allStops.length || 0;
                    let currentCount = maxCount - (this.todayStops.length || 0);
    
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
        while (!this.shouldExit) {
            let date = moment(new Date(), 'HH:mm:ss');
            // TODO: formatter.timeZone = TimeZone(secondsFromGMT: timezoneOffset) ?? Localizer.global.timeZone;
            let split = date.toString().split(":");
            let hour = parseInt(split[0]);
            let minute = parseInt(split[1]);
            let second = parseInt(split[2]);

            let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
            let at = date.add(timeLeft);
            console.log("[AutoInstanceController]", "[" + name + "]", "Clearing Quests in", timeLeft + "s", "at \(formatter.string(from: at)) (Currently: \(formatter.string(from: date)))");

            if (timeLeft > 0) {
                // TODO: sleep timeLeft
                if (this.shouldExit) {
                    return;
                }
                if (this.allStops === undefined || this.allStops === null) {
                    console.log("[AutoInstanceController]", "[" + name + "]", "Tried clearing quests but no stops.");
                    continue;
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
                        // TODO: sleep 5 seconds
                        if (this.shouldExit) {
                            return;
                        }
                    }
                }
                this.update();
            }
        }
    }
}

export { AutoInstanceController, AutoInstanceType };