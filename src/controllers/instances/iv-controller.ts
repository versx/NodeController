"use strict";

import * as turf from '@turf/turf';
import { Pokemon } from '../../models/pokemon';
import { logger } from '../../utils/logger';
import { getCurrentTimestamp, snooze } from '../../utils/util';

class IVInstanceController {
    private multiPolygon: turf.MultiPolygon;
    private pokemonQueue: Pokemon[] = [];
    private scannedPokemon = []; // { date: "", pokemon: {} }
    private startDate: Date;
    private count: number = 0;
    private shouldExit = false;

    name: string;
    pokemonList: number[];
    minLevel: number = 0;
    maxLevel: number = 29;
    ivQueueLimit: number = 100;
    scatterList: number[];

    constructor(name: string, multiPolygon: turf.MultiPolygon, pokemonList: number[], 
        minLevel: number, maxLevel: number, ivQueueLimit: number, scatterList: number[]) {
        this.name = name;
        this.multiPolygon = multiPolygon;
        this.pokemonList = pokemonList;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.ivQueueLimit = ivQueueLimit;
        this.scatterList = scatterList;
        this.init();
    }
    async init() {
        if (this.shouldExit) {
            return;
        }
        if (this.scannedPokemon.length > 0) {
            await snooze(5000);
            if (this.shouldExit) {
                return;
            }
        } else {
            let first = this.scannedPokemon.pop();
            if (first) {
                let timeSince = getCurrentTimestamp() - (first["date"].getTime() / 1000);
                if (timeSince < 120) {
                    await snooze((120 - timeSince) * 1000);
                    if (this.shouldExit) {
                        return;
                    }
                }
                let success = false;
                let pokemonReal: Pokemon;
                while (!success) {
                    try {
                        pokemonReal = await Pokemon.getById(first["pokemon"].id);
                        success = true;
                    } catch (err) {
                        await snooze(1000);
                        if (this.shouldExit) {
                            return;
                        }
                    }
                }
                if (pokemonReal instanceof Pokemon) {
                    if (pokemonReal.atkIv === undefined) {
                        logger.warn("[IVInstanceController] Checked Pokemon doesn't have IV.");
                    } else {
                        logger.info("[IVInstanceController] Checked Pokemon has IV.");
                    }
                }
            }
        }
    }
    getTask(uuid: string, username: string) {
        if (this.pokemonQueue.length === 0) {
            return {};
        }
        let pokemon = this.pokemonQueue.pop();
        let now = getCurrentTimestamp();
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
    getStatus(formatted: boolean): any {
        let ivh = 0;
        if (this.startDate instanceof Date) {
            ivh = this.count / (new Date().getTime() - this.startDate.getTime()) * 3600;
        }
        if (formatted) {
            let ivhString = ivh || "-";
            return `<a href="/instance/ivqueue/${encodeURI(this.name) || ""}">Queue</a>: ${this.pokemonQueue.length}, IV/h: ${ivhString}`;
        }
        return { iv_per_hour: ivh };
    }
    reload() {}
    stop() {}
    getQueue() {
        let pokemon = this.pokemonQueue;
        return pokemon;
    }
    addPokemon(pokemon: Pokemon) {
        let point = turf.point([pokemon.lat, pokemon.lon]);
        let coord = turf.getCoord(point);
        if (this.pokemonList.includes(pokemon.pokemonId) && 
            this.multiPolygon.coordinates.includes(coord[0][0])) { // REVIEW: Make sure this doesn't fail
            if (this.pokemonQueue.includes(pokemon)) {
                return;
            }
            let index = this.lastIndexOf(pokemon.pokemonId);
            if (this.pokemonQueue.length >= this.ivQueueLimit && index === null) {
                logger.warn("[IVInstanceController] Queue is full!");
            } else if (this.pokemonQueue.length >= this.ivQueueLimit) {
                // Insert pokemon at top of queue.
                this.pokemonQueue.unshift(pokemon);
                // Remove last pokemon.
                this.pokemonQueue.pop();
            } else if (index >= 0) {
                this.pokemonQueue.splice(index, 0, pokemon);
            } else {
                this.pokemonQueue.push(pokemon);
            }
        }
    }
    gotIV(pokemon: Pokemon) {
        let coord = turf.getCoord([pokemon.lat, pokemon.lon]);
        if (this.multiPolygon.coordinates.includes(coord[0][0])) { // REVIEW: Make sure this doesn't fail
            let index = this.pokemonQueue.indexOf(pokemon, 0);
            if (index > -1) {
                this.pokemonQueue.splice(index, 1);
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
    lastIndexOf(pokemonId: number) {
        let targetPriority = this.pokemonList.indexOf(pokemonId);
        let i = 0;
        this.pokemonQueue.forEach(pokemon => {
            let priority = this.pokemonList.indexOf(pokemon.pokemonId);
            if (targetPriority < priority) {
                return i;
            }
            i++;
        });
        return null;
    }
}

export { IVInstanceController };