"use strict"

import { Device } from "../models/device"
import { Pokemon } from "../models/pokemon"
import { Instance, InstanceType } from "../models/instance"
import { IInstanceController } from "./iinstance-controller"
import { CircleInstanceController } from "./circle-controller"
import { CircleSmartRaidInstanceController } from "./smart-circle-controller"
import { IVInstanceController } from "./iv-controller"
import { AutoInstanceController, AutoInstanceType } from "./auto-instance-controller"
import { AssignmentController } from "./assignment-controller"

class InstanceController implements IInstanceController {
    static instance = new InstanceController();
    static Devices = {};
    static Instances = {};

    private instancesByInstanceName = {};
    private devicesByDeviceUUID = {};

    constructor() { }
    setup() {
        console.log("[InstanceController] Starting up...");
        let devices = Device.getAll();
        devices.then(x => x.forEach((device: Device) => {
            InstanceController.Devices[device.uuid] = device;
        }));
        let instances = Instance.getAll();
        instances.then(x => x.forEach((instance: Instance) => {
            InstanceController.Instances[instance.name] = instance;
        }));
    }
    getInstanceControllerByInstanceName(instanceName: String) {
        var keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(key => {
            if (instanceName === key) {
                return this.instancesByInstanceName[key];
            }
        });
        return null;
    }
    getInstanceController(deviceUUID: String) {
        let keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(key => {
            if (deviceUUID === key) {
                let device = this.devicesByDeviceUUID[key];
                let instanceName = device.instanceName;
                if (device instanceof Device && instanceName !== undefined && instanceName !== null) {
                    return this.instancesByInstanceName[instanceName];
                }
                return null;
            }
        });
        return null;
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
                    coords.forEach((coord) => {
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
                    areas.forEach((coords: [any]) => {
                        coords.forEach((coord: [any]) => {
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
                    areaArray.forEach((coords: [any]) => {
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
        if (oldInstance != undefined && oldInstance !== null) {
            let keys = Object.keys(this.devicesByDeviceUUID);
            keys.forEach(deviceUUID => {
                let row = this.devicesByDeviceUUID[deviceUUID];
                if (row.instanceName === oldInstance.name) {
                    let device = row;
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
        keys.forEach(key => {
            var device = this.devicesByDeviceUUID[key];
            if (device.instanceName === instance.name) {
                this.devicesByDeviceUUID[key] = null;
            }
        });
        AssignmentController.instance.setup();

    }
    removeInstanceByName(instanceName: string) {
        this.instancesByInstanceName[instanceName].stop();
        this.instancesByInstanceName[instanceName] = null;
        var keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(key => {
            var device = this.devicesByDeviceUUID[key];
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
        let deviceUUIDS: string[];
        let keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(key => {
            let device = this.devicesByDeviceUUID[key];
            if (device.instanceName === instanceName) {
                deviceUUIDS.push(device.uuid);
            }
        });
        return deviceUUIDS;
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
        keys.forEach(key => {
            let instance = this.instancesByInstanceName[key];
            if (instance instanceof IVInstanceController) {
                instance.addPokemon(pokemon);
            }
        });
    }
    gotIV(pokemon: Pokemon) {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(key => {
            let instance = this.instancesByInstanceName[key];
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
        return new Pokemon[0];
    }
    getTask(uuid: string, username: string) {
    }
    reload() {
    }
    stop() {
    }
}

export { InstanceController, InstanceType };