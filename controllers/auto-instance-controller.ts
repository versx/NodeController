//import { CircleInstanceController } from "./circle-controller"
import { InstanceController } from "./instance-controller";

"use strict"

class AutoInstanceController extends InstanceController {
    name: string;
    area: [any];
    timeZoneOffset: number;
    minLevel: number;
    maxLevel: number;
    spinLimit: number;
    constructor(name: string, area: [any], timeZoneOffset: number, minLevel: number, maxLevel: number, spinLimit: number) {
        super();
        this.name = name;
        this.area = area;
        this.timeZoneOffset = timeZoneOffset;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.spinLimit = spinLimit;
    }
}

export { AutoInstanceController };