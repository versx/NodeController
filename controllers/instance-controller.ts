import { Device } from "../models/device"

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
                break;
        }
        //instanceController.delegate = AssignmentController.global;
        instancesByInstanceName[instance.name] = instanceController;
    }
}

module.exports = InstanceController;

/*
    public func addInstance(instance: Instance) {
        case .pokemonIV:
            fallthrough
        case .autoQuest:
            var areaArray = [[Coord]]()
            if instance.data["area"] as? [[Coord]] != nil {
                areaArray = instance.data["area"] as! [[Coord]]
            } else {
                let areas = instance.data["area"] as! [[[String: Double]]]
                var i = 0
                for coords in areas {
                    for coord in coords {
                        while areaArray.count != i + 1{
                            areaArray.append([Coord]())
                        }
                        areaArray[i].append(Coord(lat: coord["lat"]!, lon: coord["lon"]!))
                    }
                    i += 1
                }
            }
            let timezoneOffset = instance.data["timezone_offset"] as? Int ?? 0

            var areaArrayEmptyInner = [[[CLLocationCoordinate2D]]]()
            for coords in areaArray {
                var polyCoords = [CLLocationCoordinate2D]()
                for coord in coords {
                    polyCoords.append(CLLocationCoordinate2D(latitude: coord.lat, longitude: coord.lon))
                }
                areaArrayEmptyInner.append([polyCoords])
            }

            let minLevel = instance.data["min_level"] as? UInt8 ?? (instance.data["min_level"] as? Int)?.toUInt8() ?? 0
            let maxLevel = instance.data["max_level"] as? UInt8 ?? (instance.data["max_level"] as? Int)?.toUInt8() ?? 29

            if instance.type == .pokemonIV {
                let pokemonList = instance.data["pokemon_ids"] as? [UInt16] ?? (instance.data["pokemon_ids"] as? [Int])?.map({ (e) -> UInt16 in
                    return UInt16(e)
                }) ?? [UInt16]()
                let ivQueueLimit = instance.data["iv_queue_limit"] as? Int ?? 100
                let scatterList = instance.data["scatter_pokemon_ids"] as? [UInt16] ?? (instance.data["scatter_pokemon_ids"] as? [Int])?.map({ (e) -> UInt16 in
                    return UInt16(e)
                }) ?? [UInt16]()
                instanceController = IVInstanceController(name: instance.name, multiPolygon: MultiPolygon(areaArrayEmptyInner), pokemonList: pokemonList, minLevel: minLevel, maxLevel: maxLevel, ivQueueLimit: ivQueueLimit, scatterPokemon: scatterList)
            } else {
                let spinLimit = instance.data["spin_limit"] as? Int ?? 500
                instanceController = AutoInstanceController(name: instance.name, multiPolygon: MultiPolygon(areaArrayEmptyInner), type: .quest, timezoneOffset: timezoneOffset, minLevel: minLevel, maxLevel: maxLevel, spinLimit: spinLimit)
            }
        }
        instanceController.delegate = AssignmentController.global
        instancesByInstanceName[instance.name] = instanceController
    }
*/