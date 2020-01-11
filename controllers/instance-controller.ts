import { Device } from "./../models/device"
import { CircleInstanceController } from "./circle-controller"

"use strict"

enum InstanceType {
    CirclePokemon,
    CircleRaid,
    SmartCircleRaid,
    AutoQuest,
    PokemonIV
}

class IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
}

class Instance extends IInstance {
    area: [any];
}

interface IInstanceController {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    //timeZoneOffset: number;
    area: [any];
}

class InstanceController implements IInstanceController {
    static Devices = {};
    static Instances = {};

    name: string;
    type: InstanceType;
    minLevel: number = 0;
    maxLevel: number = 29;
    //timeZoneOffset = 0;
    area: [any];

    instancesByInstanceName = {};
    devicesByDeviceUUID = {};

    constructor() {
        let devices = Device.getAll();
        devices.forEach(function(device: Device) {
            InstanceController.Devices[device.name] = device;
        });
        let instances = Instance.getAll();
        instances.forEach(function(instance: Instance) {
            InstanceController.Instances[instance.name] = instance;
        });
    }
    setup() {
        // TODO: Populate devics
        // TODO: Populate instances
    }
    addInstance(instance: Instance) {
        let instanceController;
        switch (instance.type) {
            case InstanceType.SmartCircleRaid:
            case InstanceType.CirclePokemon:
            case InstanceType.CircleRaid:
                let coordsArray = [];
                if (instance.area !== undefined && instance.area !== null) {
                    coordsArray = instance.area;
                } else {
                    let coords = instance.area;
                    coords.forEach(function(coord) {
                        coordsArray.push({ lat: coord["lat"], lon: coord["lon"] });
                    });
                }
                let minLevel = instance.minLevel || 0;
                let maxLevel = instance.maxLevel || 29;
                switch (instance.type) {
                    case InstanceType.CirclePokemon:
                        instanceController = new CircleInstanceController(instance.name, coordsArray, InstanceType.CirclePokemon, minLevel, maxLevel);
                        break;
                    case InstanceType.CircleRaid:
                        instanceController = new CircleInstanceController(instance.name, coordsArray, InstanceType.CircleRaid, minLevel, maxLevel);
                        break;
                    default:
                        instanceController = new CircleSmartRaidInstanceController(instance.name, coordsArray, minLevel, maxLevel);
                        break;
                }
                break;
            case InstanceType.PokemonIV:
            case InstanceType.AutoQuest:
                let areaArray = [];
                if (instance.area !== undefined && instance.area !== null) {
                    areaArray = instance.area;
                } else {
                    let areas = instance.area;
                    let i = 0;
                    areas.forEach(function(coords: [any]) {
                        coords.forEach(function(coord: [any]) {
                            while (areaArray.length != i + 1) {
                                areaArray.push({});
                            }
                            areaArray[i].push({ lat: coord["lat"], lon: coord["lon"] });
                        });
                        i++;
                    });
                    let timeZoneOffset = instance.timeZoneOffset || 0;
                    let areaArrayEmptyInner = [];
                    areaArray.forEach(function(coords: [any]) {
                        let polyCoords = [];
                        coords.forEach(function(coord) {
                            polyCoords.push({ lat: coord["lat"], lon: coord["lon"] });
                        });
                        areaArrayEmptyInner.push(polyCoords);
                    });

                    let minLevel = instance.minLevel || 0;
                    let maxLevel = instance.maxLevel || 29;
                    if (instance.type == InstanceType.PokemonIV) {
                        let pokemonList = instance.data["pokemon_ids"] || [];
                        let ivQueueLimit = instance.data["iv_queue_limit"] || 100;
                        let scatterList = instance.data["scatter_pokemon_ids"] || [];
                        instanceController = new IVInstanceController(name: instance.name, multiPolygon: areaArrayEmptyInner, pokemonList: pokemonList, minLevel: minLevel, maxLevel: maxLevel, ivQueueLimit, ivQueueLimit, scatterPokemon: scatterList);
                    } else {
                        let spinLimit = instance.data["spin_limit"] as? Int ?? 500
                        instanceController = new AutoInstanceController(name: instance.name, multiPolygon: areaArrayEmptyInner, type: InstanceType.AutoQuest, timezoneOffset: timezoneOffset, minLevel: minLevel, maxLevel: maxLevel, spinLimit: spinLimit);
                    }
                    
                }
                break;
        }
        //instanceController.delegate = AssignmentController.global;
        instancesByInstanceName[instance.name] = instanceController;
    }
}

module.exports = InstanceController;