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
import { Coord } from "../../coord";
//import { winston } from "../../utils/logger"

class InstanceController implements IInstanceController {
    static instance = new InstanceController();
    Devices = {};
    Instances = {};

    private instancesByInstanceName = {};
    private devicesByDeviceUUID = {};

    constructor() { }
    async setup() {
        console.info("[InstanceController] Starting up...");
        this.Devices = await Device.load();
        this.Instances = await Instance.load();

        let keys = Object.keys(this.Devices);
        if (keys) {
            keys.forEach((uuid: string) => {
                this.addDevice(this.Devices[uuid]);
            });
        }
        if (keys) {
            keys = Object.keys(this.Instances);
            keys.forEach((name: string) => {
                this.addInstance(this.Instances[name]);
            });
        }
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
            let instance: IInstanceController = <IInstanceController>this.instancesByInstanceName[device.instanceName];
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
            case InstanceType.Leveling:
            case InstanceType.GatherToken:
                let coordsArray: Coord[] = [];
                if (instance.data.area) {
                    coordsArray = instance.data.area; //TODO: Check
                } else {
                    let coords = instance.data.area;
                    coords.forEach((coord: any) => {
                        coordsArray.push(new Coord(coord["lat"], coord["lon"]));
                    });
                }
                let minLevel = instance.data.minLevel || 0;
                let maxLevel = instance.data.maxLevel || 29;
                switch (instance.type) {
                    case InstanceType.CirclePokemon:
                    case InstanceType.CircleRaid:
                    case InstanceType.Leveling:
                    case InstanceType.GatherToken:                        
                        instanceController = new CircleInstanceController(instance.name, instance.type, minLevel, maxLevel, coordsArray);
                        break;
                    default:
                        instanceController = new CircleSmartRaidInstanceController(instance.name, minLevel, maxLevel, coordsArray);
                        break;
                }
                break;
            case InstanceType.PokemonIV:
            case InstanceType.AutoQuest:
                // TODO: Polygon library
                let areaArray = [];
                if (instance.data.area) {
                    areaArray = instance.data.area;
                } else {
                    let areas = instance.data.area;
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
                    let timeZoneOffset = instance.data.timeZoneOffset || 0;
                    let areaArrayEmptyInner = [];
                    areaArray.forEach((coords: any) => {
                        let polyCoords = [];
                        coords.forEach(coord => {
                            polyCoords.push({ lat: coord["lat"], lon: coord["lon"] });
                        });
                        areaArrayEmptyInner.push(polyCoords);
                    });

                    let minLevel = instance.data.minLevel || 0;
                    let maxLevel = instance.data.maxLevel || 29;
                    if (instance.type == InstanceType.PokemonIV) {
                        let pokemonList: number[] = instance.data["pokemon_ids"] || [];
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
        let keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(deviceUUID => {
            let device = this.devicesByDeviceUUID[deviceUUID];
            if (device.instanceName === instance.name) {
                this.devicesByDeviceUUID[deviceUUID] = null;
            }
        });
        AssignmentController.instance.setup();

    }
    removeInstanceByName(instanceName: string) {
        this.instancesByInstanceName[instanceName].stop();
        this.instancesByInstanceName[instanceName] = null;
        let keys = Object.keys(this.devicesByDeviceUUID);
        keys.forEach(deviceUUID => {
            let device = this.devicesByDeviceUUID[deviceUUID];
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
    getInstanceStatus(instance: Instance, formatted: boolean): string {
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
    getIVQueue(name: string): Pokemon[] {
        let instance = this.instancesByInstanceName[name];
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