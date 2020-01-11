const Device = require('../models/device.js');

"use strict"

class InstanceController {
    static Devices = {};
    static Instances = {};

    instancesByInstanceName = {};
    devicesByDeviceUUID = {};

    name = "";
    type = "pokemon";
    minLevel = 0;
    maxLevel = 29;
    timeZoneOffset = 0;
    area = [];
    constructor() {
        Devices = Device.getAll();

    }
    setup() {
        // TODO: Populate devics
        // TODO: Populate instances
    }
    addInstance(instance) {
        var instanceController;
        switch (instance.type) {
            case "smart_raid":
            case "circle_pokemon":
            case "circle_raid":
                var coordsArray = [];
                if (instance.data["area"] !== undefined && instance.data["area"] !== null) {
                    coordsArray = instance.data["area"];
                } else {
                    var coords = instance.data["area"];
                    coords.foreach(function(coord) {
                        coordsArray.push({ lat: coord["lat"], lon: coord["lon"] });
                    });
                }
                var minLevel = parseInt(instance.data["min_level"]) || 0;
                var maxLevel = parseInt(instance.data["max_level"]) || 29;
                switch (instance.type) {
                    case "circle_pokemon":
                        instanceController = CircleInstanceController(instance.name, coordsArray, "pokemon", minLevel, maxLevel);
                        break;
                    case "circle_raid":
                        instanceController = CircleInstanceController(instance.name, coordsArray, "raid", minLevel, maxLevel);
                        break;
                    default:
                        instanceController = CircleSmartRaidInstanceController(instance.name, coordsArray, minLevel, maxLevel);
                        break;
                }
                break;
            case "pokemon_iv":
            case "auto_quest":
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