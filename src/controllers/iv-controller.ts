//import { CircleInstanceController } from "./circle-controller"
import { InstanceController } from "./instance-controller";

"use strict"

class IVInstanceController extends InstanceController {
    name: string;
    area: [any];
    pokemonList: [number];
    minLevel: number;
    maxLevel: number;
    ivQueueLimit: number;
    scatterList: [number];
    constructor(name: string, area: [any], pokemonList: [number], minLevel: number, maxLevel: number, ivQueueLimit: number, scatterList: [number]) {
        super();
        this.name = name;
        this.area = area;
        this.pokemonList = pokemonList;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.ivQueueLimit = ivQueueLimit;
        this.scatterList = scatterList;
    }
}

export { IVInstanceController };