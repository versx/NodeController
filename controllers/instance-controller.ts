import { Device } from "./../models/device"
import { IInstanceController } from "./iinstance-controller"
import { CircleInstanceController } from "./circle-controller"
import { CircleSmartRaidInstanceController } from "./smart-circle-controller"
import { IVInstanceController } from "./iv-controller"
import { AutoInstanceController } from "./auto-instance-controller"

"use strict"

enum InstanceType {
    CirclePokemon,
    CircleRaid,
    SmartCircleRaid,
    AutoQuest,
    PokemonIV
}

interface IInstanceData {
    timeZoneOffset: number;
    spinLimit: number;

}

interface IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    //timeZoneOffset: number;
    area: [any];
    data: IInstanceData;
}

class Instance implements IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    area: [any];
    data: IInstanceData;
}

class InstanceController implements IInstanceController {
    static Devices = {};
    static Instances = {};

    instancesByInstanceName = {};
    devicesByDeviceUUID = {};

    constructor() { }
    setup() {
        let devices = Device.getAll();
        devices.forEach(function(device: Device) {
            InstanceController.Devices[device.name] = device;
        });
        let instances = Instance.getAll();
        instances.forEach(function(instance: Instance) {
            InstanceController.Instances[instance.name] = instance;
        });
    }
    addInstance(instance: Instance) {
        let instanceController;
        switch (instance.type) {
            case InstanceType.SmartCircleRaid:
            case InstanceType.CirclePokemon:
            case InstanceType.CircleRaid:
                let coordsArray = <[any]>{ };
                if (instance.area !== undefined && instance.area !== null) {
                    coordsArray.push(instance.area); //TODO: Check
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
                        instanceController = new CircleInstanceController(instance.name, InstanceType.CirclePokemon, minLevel, maxLevel, coordsArray);
                        break;
                    case InstanceType.CircleRaid:
                        instanceController = new CircleInstanceController(instance.name, InstanceType.CircleRaid, minLevel, maxLevel, coordsArray);
                        break;
                    default:
                        instanceController = new CircleSmartRaidInstanceController(instance.name, minLevel, maxLevel, coordsArray);
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
                    //TODO: Cast instance to AutoQuestController and get timeZoneOffset property
                    let timeZoneOffset = instance.data.timeZoneOffset || 0;
                    let areaArrayEmptyInner = <[any]>{ };
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
                        instanceController = new IVInstanceController(instance.name, areaArrayEmptyInner, pokemonList, minLevel, maxLevel, ivQueueLimit, scatterList);
                    } else {
                        let spinLimit = instance.data["spin_limit"] || 500
                        instanceController = new AutoInstanceController(instance.name, areaArrayEmptyInner, timeZoneOffset, minLevel, maxLevel, spinLimit);
                    }
                    
                }
                break;
        }
        //instanceController.delegate = AssignmentController.global;
        this.instancesByInstanceName[instance.name] = instanceController;
    }
    reloadAllInstances() {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(function(instance) {
            this.instancesByInstanceName[instance].value.reload();
            // TODO: Add AssignmentController
            //AssignmentController.global.setup();
        });
    }
    reloadInstance(newInstance: Instance, oldInstanceName: string) {
        let oldInstance = this.instancesByInstanceName[oldInstanceName];
        if (oldInstance != undefined && oldInstance !== null) {
            let keys = Object.keys(this.devicesByDeviceUUID);
            keys.forEach(function(deviceUUID) {
                let row = this.devicesByDeviceUUID[deviceUUID];
                if (row.value.instanceName === oldInstance.name) {
                    let device = row.value
                    device.instanceName = newInstance.name
                    this.devicesByDeviceUUID[deviceUUID] = device
                }
            });
            this.instancesByInstanceName[oldInstanceName].stop();
            this.instancesByInstanceName[oldInstanceName] = null;
        }
        this.addInstance(newInstance)
    }
}

export { InstanceController, InstanceType };