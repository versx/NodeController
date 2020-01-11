import { InstanceType } from "./instance-controller";
import { CircleInstanceController } from "./circle-controller"

"use strict"

class CircleSmartRaidInstanceController extends CircleInstanceController {
    constructor(name: string, minLevel: number, maxLevel: number, coords: [any]) {
        super(name, InstanceType.SmartCircleRaid, minLevel, maxLevel, coords);
    }
}

export { CircleSmartRaidInstanceController };