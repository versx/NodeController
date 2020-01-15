"use strict"

import { Device } from "../../models/device"
import { Pokemon } from "../../models/pokemon"
import { Instance, InstanceType } from "../../models/instance"
import { IInstanceController } from "./iinstance-controller"
import { CircleInstanceController } from "./circle-controller"
import { CircleSmartRaidInstanceController } from "./smart-circle-controller"
import { IVInstanceController } from "./iv-controller"
import { AutoInstanceController, AutoInstanceType } from "./auto-instance-controller"
import { AssignmentController } from "../assignment-controller"

class InstanceController implements IInstanceController {
    static instance = new InstanceController();
    Devices = {};
    Instances = {};

    private instancesByInstanceName = {};
    private devicesByDeviceUUID = {};

    constructor() { }
    setup() {
        console.log("[InstanceController] Starting up...");
        Device.load();
        Instance.load();
    }
    getInstanceControllerByInstanceName(instanceName: string) {
        if (this.instancesByInstanceName[instanceName]) {
            return this.instancesByInstanceName[instanceName];
        }
        return null;
    }
    getInstanceController(deviceUUID: string) {
        let device: Device = this.devicesByDeviceUUID[deviceUUID];
        if (device) {
            let instance: Instance = this.instancesByInstanceName[device.instanceName];
            return instance;
        }
        return null;
    }
    addInstance(instance: Instance) {
        let instanceController: IInstanceController;
        switch (instance.type) {
            case InstanceType.SmartCircleRaid:
            case InstanceType.CirclePokemon:
            case InstanceType.CircleRaid:
                let coordsArray = <[any]>{ };
                if (instance.area) {
                    coordsArray.push(instance.area); //TODO: Check
                } else {
                    let coords = instance.area;
                    coords.forEach((coord) => {
                        coordsArray.push({ lat: coord["lat"], lon: coord["lon"] }); // TODO: Use class
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
                if (instance.area) {
                    areaArray = instance.area;
                } else {
                    let areas = instance.area;
                    let i = 0;
                    areas.forEach((coords: any) => {
                        coords.forEach((coord: any) => {
                            while (areaArray.length !== i + 1) {
                                areaArray.push({});
                            }
                            areaArray[i].push({ lat: coord["lat"], lon: coord["lon"] });
                        });
                        i++;
                    });
                    //TODO: Cast instance to AutoQuestController and get timeZoneOffset property
                    let timeZoneOffset = instance.data.timeZoneOffset || 0;
                    let areaArrayEmptyInner = [];
                    areaArray.forEach((coords: any) => {
                        let polyCoords = [];
                        coords.forEach(coord => {
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
                        instanceController = new AutoInstanceController(instance.name, areaArrayEmptyInner, AutoInstanceType.Quest, timeZoneOffset, minLevel, maxLevel, spinLimit);
                    }                    
                }
                break;
        }
        // TODO: instanceController.delegate = AssignmentController.instance;
        this.instancesByInstanceName[instance.name] = instanceController;
    }
    reloadAllInstances() {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(function(instance) {
            this.instancesByInstanceName[instance].reload();
            AssignmentController.instance.setup();
        });
    }
    reloadInstance(newInstance: Instance, oldInstanceName: string) {
        let oldInstance = this.instancesByInstanceName[oldInstanceName];
        if (oldInstance) {
            let keys = Object.keys(this.devicesByDeviceUUID);
            keys.forEach(deviceUUID => {
                let device = this.devicesByDeviceUUID[deviceUUID];
                if (device.instanceName === oldInstance.name) {
                    device.instanceName = newInstance.name;
                    this.devicesByDeviceUUID[deviceUUID] = device;
                }
            });
            this.instancesByInstanceName[oldInstanceName].stop();
            this.instancesByInstanceName[oldInstanceName] = null;
        }
        this.addInstance(newInstance);
    }
    removeInstance(instance: Instance) {
        this.instancesByInstanceName[instance.name].stop();
        this.instancesByInstanceName[instance.name] = null;
        var keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(deviceUUID => {
            var device = this.devicesByDeviceUUID[deviceUUID];
            if (device.instanceName === instance.name) {
                this.devicesByDeviceUUID[deviceUUID] = null;
            }
        });
        AssignmentController.instance.setup();

    }
    removeInstanceByName(instanceName: string) {
        this.instancesByInstanceName[instanceName].stop();
        this.instancesByInstanceName[instanceName] = null;
        var keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(deviceUUID => {
            var device = this.devicesByDeviceUUID[deviceUUID];
            if (device.instanceName === instanceName) {
                this.devicesByDeviceUUID[device] = null;
            }
        });
        AssignmentController.instance.setup();

    }
    addDevice(device: Device) {
        if (device.instanceName !== null && this.instancesByInstanceName[device.instanceName] !== null) {
            this.devicesByDeviceUUID[device.uuid] = device;
        }
        AssignmentController.instance.setup();
    }
    reloadDevice(newDevice: Device, oldDeviceUUID: string) {
        this.removeDeviceByName(oldDeviceUUID);
        this.addDevice(newDevice);
    }
    removeDevice(device: Device) {
        this.devicesByDeviceUUID[device.uuid] = null;
        AssignmentController.instance.setup();
    }
    removeDeviceByName(deviceUUID: string) {
        this.devicesByDeviceUUID[deviceUUID] = null;
        AssignmentController.instance.setup();
    }
    getDeviceUUIDsInInstance(instanceName: String) {
        let deviceUUIDs: string[];
        let keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(deviceUUID => {
            let device = this.devicesByDeviceUUID[deviceUUID];
            if (device.instanceName === instanceName) {
                deviceUUIDs.push(device.uuid);
            }
        });
        return deviceUUIDs;
    }
    getInstanceStatus(instance: Instance, formatted: boolean) {
        let instanceProto = this.instancesByInstanceName[instance.name];
        if (instanceProto instanceof Instance) {
            return "";// TODO: instanceProto.getStatus(formatted);
        }
        return formatted ? "?" : null;
    }
    gotPokemon(pokemon: Pokemon) {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(instanceName => {
            let instance = this.instancesByInstanceName[instanceName];
            if (instance instanceof IVInstanceController) {
                instance.addPokemon(pokemon);
            }
        });
    }
    gotIV(pokemon: Pokemon) {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(instanceName => {
            let instance = this.instancesByInstanceName[instanceName];
            if (instance instanceof IVInstanceController) {
                instance.gotIV(pokemon);
            }
        });
    }
    getIVQueue(name: string) {
        var instance = this.instancesByInstanceName[name];
        if (instance instanceof IVInstanceController) {
            return instance.getQueue();
        }
        return [];
    }
    getTask(uuid: string, username: string) {
    }
    reload() {
    }
    stop() {
    }
}

export { InstanceController, InstanceType };