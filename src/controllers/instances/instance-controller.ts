"use strict";

import * as turf from '@turf/turf';
import { Coord } from '../../coord';
import { Device } from '../../models/device';
import { Pokemon } from '../../models/pokemon';
import { Instance, InstanceType } from '../../models/instance';
import { IInstanceController } from './iinstance-controller';
import { CircleInstanceController } from './circle-controller';
import { CircleSmartRaidInstanceController } from './smart-circle-controller';
import { IVInstanceController } from './iv-controller';
import { AutoInstanceController, AutoInstanceType } from './auto-instance-controller';
import { AssignmentController } from '../assignment-controller';
//import { winston } from '../../utils/logger';

class InstanceController implements IInstanceController {
    static instance = new InstanceController();
    static DefaultMinLevel: number = 0;
    static DefaultMaxLevel: number = 29;
    static DefaultIVQueueLimit: number = 100;
    static DefaultSpinLimit: number = 500;

    private instancesByInstanceName = {};
    private devicesByDeviceUUID = {};

    constructor() { }
    async setup() {
        console.info("[InstanceController] Starting up...");
        let devices = await Device.load();
        let instances = await Instance.load();

        if (devices) {
            devices.forEach(device => this.addDevice(device));
        }
        if (instances) {
            instances.forEach(instance => this.addInstance(instance));
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
                    coordsArray = instance.data.area; //TODO: Confirm working
                } else {
                    let coords = instance.data.area;
                    coords.forEach((coord: any) => {
                        coordsArray.push(new Coord(coord["lat"], coord["lon"]));
                    });
                }
                let circleMinLevel = instance.data.min_level || InstanceController.DefaultMinLevel;
                let circleMaxLevel = instance.data.max_level || InstanceController.DefaultMaxLevel;
                switch (instance.type) {
                    case InstanceType.CirclePokemon:
                    case InstanceType.CircleRaid:
                    case InstanceType.Leveling:
                    case InstanceType.GatherToken:                        
                        instanceController = new CircleInstanceController(instance.name, instance.type, circleMinLevel, circleMaxLevel, coordsArray);
                        break;
                    default:
                        instanceController = new CircleSmartRaidInstanceController(instance.name, circleMinLevel, circleMaxLevel, coordsArray);
                        break;
                }
                break;
            case InstanceType.PokemonIV:
            case InstanceType.AutoQuest:
                let areaArray: Coord[][] = [];
                if (instance.data["area"]) {
                    areaArray = instance.data["area"];
                } else {
                    let areas = instance.data["area"];
                    let i = 0;
                    areas.forEach((coords: any) => {
                        coords.forEach((coord: any) => {
                            while (areaArray.length !== i + 1) {
                                areaArray.push([]);
                            }
                            areaArray[i].push(new Coord(coord["lat"], coord["lon"]));
                        });
                        i++;
                    });
                }
                let timeZoneOffset = instance.data.timezone_offset || 0;
                let areaArrayEmptyInner = [];
                areaArray.forEach((coords: Coord[]) => {
                    let polyCoords = [];
                    coords.forEach(coord => {
                        polyCoords.push(turf.point([coord["lat"], coord["lon"]]));
                    });
                    areaArrayEmptyInner.push(polyCoords);
                });

                let ivMinLevel = instance.data.min_level || InstanceController.DefaultMinLevel;
                let ivMaxLevel = instance.data.max_level || InstanceController.DefaultMaxLevel;
                if (instance.type == InstanceType.PokemonIV) {
                    let pokemonList: number[] = instance.data["pokemon_ids"] || [];
                    let ivQueueLimit = instance.data["iv_queue_limit"] || InstanceController.DefaultIVQueueLimit;
                    let scatterList = instance.data["scatter_pokemon_ids"] || [];
                    instanceController = new IVInstanceController(
                        instance.name,
                        turf.multiPolygon(areaArrayEmptyInner).geometry,
                        pokemonList,
                        ivMinLevel,
                        ivMaxLevel,
                        ivQueueLimit,
                        scatterList
                    );
                } else {
                    let spinLimit = instance.data["spin_limit"] || InstanceController.DefaultSpinLimit;
                    instanceController = new AutoInstanceController(
                        instance.name,
                        turf.multiPolygon(areaArrayEmptyInner).geometry,
                        AutoInstanceType.Quest,
                        timeZoneOffset,
                        ivMinLevel,
                        ivMaxLevel,
                        spinLimit
                    );
                }                    
                break;
        }
        // TODO: instanceController.delegate = AssignmentController.instance;
        this.instancesByInstanceName[instance.name] = instanceController;
    }
    reloadAllInstances() {
        let keys = Object.keys(this.instancesByInstanceName);
        keys.forEach(instanceName => {
            let controller = InstanceController.instance.getInstanceControllerByInstanceName(instanceName);
            if (controller) {
                controller.reload();
            }
            AssignmentController.instance.setup();
        });
    }
    reloadInstance(newInstance: Instance, oldInstanceName: string) {
        let oldInstance = InstanceController.instance.getInstanceControllerByInstanceName(oldInstanceName);
        if (oldInstance) {
            let keys = Object.keys(this.devicesByDeviceUUID);
            keys.forEach(deviceUUID => {
                let device = this.devicesByDeviceUUID[deviceUUID];
                if (device.instanceName === oldInstance.name) {
                    device.instanceName = newInstance.name;
                    this.devicesByDeviceUUID[deviceUUID] = device;
                }
            });
            oldInstance.stop();
            oldInstance = null;
        }
        this.addInstance(newInstance);
    }
    removeInstance(instance: Instance) {
        return this.removeInstanceByName(instance.name);
    }
    removeInstanceByName(instanceName: string) {
        let controller = InstanceController.instance.getInstanceControllerByInstanceName(instanceName);
        if (controller) {
            this.instancesByInstanceName[instanceName].stop();
            this.instancesByInstanceName[instanceName] = null;
        }
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
        if (device.instanceName && this.instancesByInstanceName[device.instanceName]) {
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
    async getInstanceStatus(instance: Instance, formatted: boolean): Promise<any> {
        //let instanceProto = this.instancesByInstanceName[instance.name];
        switch (instance.type) {
            case InstanceType.AutoQuest:
                let auto: AutoInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return await auto.getStatus(formatted);
            case InstanceType.CirclePokemon:
                let pkmn: CircleInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return pkmn.getStatus(formatted);
            case InstanceType.CircleRaid:
                let raid: IVInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return raid.getStatus(formatted);
            case InstanceType.GatherToken:
                let token: IVInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return token.getStatus(formatted);
            case InstanceType.Leveling:
                let level: CircleInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return level.getStatus(formatted);
            case InstanceType.PokemonIV:
                let iv: IVInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return iv.getStatus(formatted);
            case InstanceType.SmartCircleRaid:
                let smart: CircleSmartRaidInstanceController = InstanceController.instance.getInstanceControllerByInstanceName(instance.name);
                return smart.getStatus(formatted);
            default:
                return formatted ? "?" : null;
        }
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
            let instance = InstanceController.instance.getInstanceControllerByInstanceName(instanceName)
            if (instance instanceof IVInstanceController) {
                instance.gotIV(pokemon);
            }
        });
    }
    getIVQueue(name: string): Pokemon[] {
        let instance = InstanceController.instance.getInstanceControllerByInstanceName(name);
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