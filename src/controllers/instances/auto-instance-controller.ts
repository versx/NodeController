"use strict";

import * as turf from '@turf/turf';
import * as S2 from 'nodes2ts';
import moment = require('moment');

import { Account } from '../../models/account';
import { Cell } from '../../models/cell';
import { Pokestop } from '../../models/pokestop';
import { logger } from '../../utils/logger';
import { getCurrentTimestamp, snooze } from '../../utils/util';

const AutoInstanceInterval: number = 2 * 1000;

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
    private shouldExit: boolean = false;
    private bootstrapCellIds: string[] = [];
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
    async bootstrap() {
        logger.info(`[AutoInstanceController] [${this.name}] Checking Bootstrap Status...`);
        let start = new Date();
        let totalCount = 0;
        let missingCellIds: S2.S2CellId[] = [];
        let coordinates = this.multiPolygon.coordinates;
        if (coordinates) {
            //this.multiPolygon.coordinates.forEach(async (pos: turf.helpers.Position[][], index: number, array: turf.helpers.Position[][][]) => {
            for (let i = 0; i < coordinates.length; i++) {
                let polygonArray = coordinates[i];
                let polygonPositions = AutoInstanceController.convertGeometryToPositions(polygonArray);
                try {
                    let polygon = turf.polygon(polygonPositions);
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
                            await snooze(1000);
                        }
                    }
                    for (let i = 0; i < cells.length; i++) {
                        let cell = cells[i];
                        if (cells.includes(cell)) {
                            missingCellIds.push(new S2.S2CellId(cell.id));
                        }   
                    }
                } catch (err) {
                    logger.error(`[AutoInstanceController] [${this.name}] Failed to bootstrap instance: ${err}`);
                    // TODO: Fix bootstrap polygon issues.
                }
            }
        }

        logger.info(`[AutoInstanceController] [${this.name}] Bootstrap Status: ${(totalCount - missingCellIds.length)} / ${totalCount} after ${Math.round(getCurrentTimestamp() - (start.getTime() / 1000))}s`)
        this.bootstrapCellIds = missingCellIds.map(x => x.id.toString());
        this.bootstrapTotalCount = totalCount;
    }
    async update() {
        switch (this.type) {
            case AutoInstanceType.Quest:
                this.allStops = [];
                let coordinates = this.multiPolygon.coordinates;
                if (coordinates) {
                    //this.multiPolygon.coordinates.forEach(async (pos: turf.helpers.Position[][], index: number, array: turf.helpers.Position[][][]) => {
                    for (let i = 0; i < coordinates.length; i++) {
                        let polygonArray = coordinates[i];
                        let polygonPositions = AutoInstanceController.convertGeometryToPositions(polygonArray);
                        try {
                            let polygon = turf.polygon(polygonPositions);
                            let bounds = turf.bbox(polygon);
                            //minX, minY, maxX, maxY
                            //bounds.southEast.latitude, bounds.northWest.latitude, bounds.northWest.longitude, bounds.southEast.longitude, 0);
                            let stops = await Pokestop.getAll(bounds[0], bounds[1], bounds[2], bounds[3], 0);
                            if (stops) {
                                stops.forEach(stop => {
                                    let position = turf.point([stop.lat, stop.lon]);
                                    let coord = turf.getCoord(position);
                                    if (polygon.geometry.coordinates.includes([coord])) {
                                        this.allStops.push(stop);
                                    }
                                });
                            }
                        } catch (err) {
                            logger.error(`[AutoInstanceController] [${this.name}] Failed to update bootstrap list: ${err}`);
                            // TODO: Fix Polygon issues.
                        }
                    }
                }
                this.todayStops = [];
                this.todayStopsTries = new Map<Pokestop, number>();
                this.allStops.forEach(stop => {
                    if ((stop.questType === undefined || stop.questType === null) && stop.enabled === true) {
                        this.todayStops.push(stop);
                    }
                });                
                break;
        }
    }
    encounterCooldown(distanceM: number) {
        //let dist = distanceM / 1000;
        let delay = AutoInstanceController.getCooldownDelay(distanceM);
        return delay;
        /*
        let keys = Object.keys(cooldownDataArray);
        keys.forEach(key => {
            let value = cooldownDataArray[key];
            if (parseInt(key) >= dist) {
                return parseInt(value) * 60;
            }
        });
        return 0;
        */
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
                        await this.bootstrap();
                        if (!(this.bootstrapCellIds.length > 0)) {
                            await this.update();
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
                        if (username) {
                            let accountT = await Account.getWithUsername(username);
                            if (accountT instanceof Account) {
                                account = accountT;
                                lastLat = accountT.lastEncounterLat;
                                lastLon = accountT.lastEncounterLon;
                                lastTime = accountT.lastEncounterTime;
                            } else {
                                // REVIEW: Don't think this is needed anymore
                                /*
                                lastLat = Double(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_lat") || "")
                                lastLon = Double(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_lon") || "")
                                lastTime = UInt32(try DBController.global.getValueForKey(key: "AIC_\(uuid)_last_time") || "")
                                */
                            }
                        }
                    } catch (err) {
                        logger.error("[AutoInstanceController] Failed to get account: " + err);
                    }

                    if (username && account instanceof Account) {
                        if (account.spins >= this.spinLimit) {
                            return {
                                action: "switch_account",
                                min_level: this.minLevel,
                                max_level: this.maxLevel
                            }
                        } else {
                            await Account.spin(username);
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
                            await Account.didEncounter(username, newLat, newLon, encounterTime);
                        } catch (err) { }
                    } else {
                        // REVIEW: Don't think this is needed anymore
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
                            logger.info(`[AutoInstanceController] ${this.name} Instance done.`);
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
    async getStatus(formatted: boolean): Promise<any> {
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
                        return `Bootstrapping ${count}/${totalCount} (${Math.fround(percentage)}%)`;
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
                    let ids = this.allStops.map(stop => {
                        return stop.id
                    });
                    let stops = await Pokestop.getInIds(ids);
                    if (stops instanceof Pokestop) {
                        stops.forEach(stop => {
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
                        return `Done: ${currentCountDb}|${currentCount}/${maxCount} (${Math.fround(percentageReal)}|${Math.fround(percentage)}%)`;
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
    async reload() {
        await this.update();
    }
    stop() {
        this.shouldExit = true;
        //if (this.questClearerQueue !== null) {
        //    // TODO: Threading.destroyQueue(questClearerQueue!)
        //}
    }
    async autoLoop() {
        if (this.shouldExit) {
            return;
        }
        let date = moment(new Date());
        let formattedHours = date.format('hh:mm:ss');
        // formatter.timeZone = TimeZone(secondsFromGMT: timezoneOffset) || Localizer.global.timeZone;
        let split = formattedHours.split(":");
        let hour = parseInt(split[0]);
        let minute = parseInt(split[1]);
        let second = parseInt(split[2]);
        let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
        let future = date.clone();
        let at = future.add(timeLeft, 'seconds');

        if (timeLeft > 0) {
            await snooze(timeLeft * 1000);
            logger.info(`[AutoInstanceController] [${this.name}] Clearing Quests in ${timeLeft}s at ${at} (Currently: ${date})`);
            
            if (this.shouldExit) {
                return;
            }
            if (this.allStops.length === 0) {
                logger.warn(`[AutoInstanceController] [${this.name}] Tried clearing quests but no stops.`);
                //continue;
                return;
            }

            logger.debug(`[AutoInstanceController] [${this.name}] Getting stop ids.`);
            let ids = this.allStops.map(stop => stop.id);
            let done = false;
            logger.debug(`[AutoInstanceController] [${this.name}] Clearing Quests for ids: ${ids}`);
            while (!done) {
                try {
                    await Pokestop.clearQuests(ids);
                    done = true;
                } catch (err) {
                    await snooze(5000);
                    if (this.shouldExit) {
                        return;
                    }
                }
            }
            await this.update();
        }
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
    static getCooldownDelay(distance: number) {
        //Credits: Mizu
        let delay: number;
        if (distance <= 30.0) {
            delay = 0;
            logger.debug(`[AutoInstanceController] Distance: ${distance}m < 40.0m Already spun. Go to next stop`)
        }else if (distance <= 1000.0) {
            delay = (distance / 1000.0) * 60.0;
        } else if (distance <= 2000.0) {
            delay = (distance / 2000.0) * 90.0;
        } else if (distance < 4000.0) {
            delay = (distance / 4000.0) * 120.0;
        } else if (distance < 5000.0) {
            delay = (distance / 5000.0) * 150.0;
        } else if (distance < 8000.0) {
            delay = (distance / 8000.0) * 360.0;
        } else if (distance < 10000.0) {
            delay = (distance / 10000.0) * 420.0;
        } else if (distance < 15000.0) {
            delay = (distance / 15000.0) * 480.0;
        } else if (distance < 20000.0) {
            delay = (distance / 20000.0) * 600.0;
        } else if (distance < 25000.0) {
            delay = (distance / 25000.0) * 900.0;
        } else if (distance < 30000.0) {
            delay = (distance / 30000.0) * 1020.0;
        } else if (distance < 40000.0) {
            delay = (distance / 40000.0) * 1140.0;
        } else if (distance < 65000.0) {
            delay = (distance / 65000.0) * 1320.0
        } else if (distance < 81000.0) {
            delay = (distance / 81000.0) * 1800.0
        } else if (distance < 100000.0) {
            delay = (distance / 100000.0) * 2400.0
        } else if (distance < 220000.0) {
            delay = (distance / 220000.0) * 2700.0
        } else {
            delay = 7200.0
        }
        return delay;
    }
    static convertGeometryToPositions(array: any[]): turf.Position[][] {
        let result: turf.Position[][] = [];
        let first: any;
        for (let i = 0; i < array.length; i++) {
            let feature = array[i];
            let geometry = feature.geometry;
            let coordinates = geometry.coordinates;
            if (i === 0) {
                first = coordinates;
            }
            result.push(coordinates);
            /*
            if (coordinates && coordinates.length == 2) {
                let point = turf.point([coordinates[0], coordinates[1]]);
                result.push([point.geometry.coordinates]);
                logger.debug(coordinates);
            }
            */
        }
        result.push(first);
        return result;
    }
}

export { AutoInstanceController, AutoInstanceType };