"use strict"

import { InstanceController } from "./instance-controller";
import { Pokemon } from "../models/pokemon";

class IVInstanceController {
    multiPolygon: [any];
    pokemonQueue: [Pokemon];
    scannedPokemon = []; // { date: "", pokemon: {} }
    startDate: Date;
    count: number;
    shouldExit = false;

    name: string;
    area: [any];
    pokemonList: [number];
    minLevel: number = 0;
    maxLevel: number = 29;
    ivQueueLimit: number =  100;
    scatterList: [number];
    constructor(name: string, area: [any], pokemonList: [number], minLevel: number, maxLevel: number, ivQueueLimit: number, scatterList: [number]) {
        this.name = name;
        this.area = area;
        this.pokemonList = pokemonList;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.ivQueueLimit = ivQueueLimit;
        this.scatterList = scatterList;

        // TODO: new thread
        // while (!shouldExit) {
        if (this.scannedPokemon.length > 0) {
            // TODO: sleep 5 seconds
            if (this.shouldExit) {
                return;
            }
        } else {
            let first = this.scannedPokemon.pop();
            let timeSince = new Date().getUTCSeconds() - first["date"]; //TODO: review
            if (timeSince < 120) {
                // TODO: sleep (120 - timeSince)
                if (this.shouldExit) {
                    return;
                }
            }
            let success = false;
            let pokemonReal;
            while (!success) {
                // TODO: TryCatch
                try {
                    pokemonReal = Pokemon.getById(first["pokemon"].id);
                    success = true;
                } catch (err) {
                    // TODO: sleep 1 second
                    if (this.shouldExit) {
                        return;
                    }
                }
            }
            if (pokemonReal instanceof Pokemon && pokemonReal !== undefined) {
                if (pokemonReal.atkIv === undefined) {
                    console.log("[IVInstanceController] Checked Pokemon doesn't have IV.");
                } else {
                    console.log("[IVInstanceController] Checked Pokemon has IV.");
                }
            }
        }
    }
    getTask(uuid: string, username: string) {
        if (!(this.pokemonQueue.length > 0)) {
            return {}; // { string: any }
        }
        let pokemon = this.pokemonQueue.pop();
        var now = new Date().getUTCSeconds();
        if (now - (pokemon.firstSeenTimestamp || 1) >= 600) {
            return this.getTask(uuid, username);
        }
        this.scannedPokemon.push({ "date": new Date(), "pokemon": pokemon });

        return {
            action: "scan_iv",
            lat: pokemon.lat,
            lon: pokemon.lon,
            id: pokemon.id,
            is_spawnpoint: pokemon.spawnId !== undefined && pokemon.spawnId !== null,
            min_level: this.minLevel,
            max_level: this.maxLevel
        }
    }
    getStatus(formatted: boolean) {
        let ivh = 0;
        if (this.startDate instanceof Date) {
            // TODO: ivh = parseInt(this.count / parseInt(new Date() - this.startDate) * 3600);
        }
        if (formatted) {
            let ivhString = ivh === null ? "-" : ivh;
            return "";//"<a href=\"/dashboard/instance/ivqueue/\(name.encodeUrl() ?? "")\">Queue</a>: \(pokemonQueue.count), IV/h: \(ivhString)";
        } else {
            return {
                iv_per_hour: ivh
            }
        }
    }
    reload() {}
    stop() {}
    getQueue() {
        let pokemon = this.pokemonQueue;
        return pokemon;
    }
    addPokemon(pokemon: Pokemon) {
        if (this.pokemonList.includes(pokemon.pokemonId) && this.multiPolygon.includes({ lat: pokemon.lat, lon: pokemon.lon })) {
            if (this.pokemonQueue.includes(pokemon)) {
                return;
            }
            let index = lastIndexOf(pokemon.pokemonId);
            if (this.pokemonQueue.length >= this.ivQueueLimit && index === null) {
                console.log("[IVInstanceController] Queue is full!");
            } else if (this.pokemonQueue.length >= this.ivQueueLimit) {
                //this.pokemonQueue.insert(pokemon, index); // TODO: Insert pokemon into IV queue
                //_ = this.pokemonQueue.popLast()?
            } else if (index >= 0) {
                //this.pokemonQueue.insert(pokemon, index); // TODO: Insert pokemon into IV queue
            } else {
                this.pokemonQueue.push(pokemon);
            }
        }
    }
    gotIV(pokemon: Pokemon) {
        if (this.multiPolygon.includes({})) {
            let index = this.pokemonQueue.indexOf(pokemon);
            if (index >= 0) {
                // TODO: this.pokemonQueue.remove(index);
            }
            if (this.startDate === undefined) {
                this.startDate = new Date();
            }
            if (this.count === Number.MAX_VALUE) {
                this.count = 0;
                this.startDate = new Date();
            } else {
                this.count++;
            }
        }
    }
}

function lastIndexOf(pokemonId: number) {
    /*
    let targetPriority = pokemonList.indexOf(pokemonId);
    let i = 0;
    this.pokemonQueue.forEach(pokemon => { // TODO: Convert to for loop?
        let priority = pokemonList.indexOf(pokemon.pokemonId);
        if (targetPriority < priority) {
            return i;
        }
        i++;
    });
    */
    return null;
}

export { IVInstanceController };