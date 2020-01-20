"use strict"

import { Pokestop } from "src/models/pokestop";
import { Pokemon } from "src/models/pokemon";
import { Gym } from "src/models/gym";
import { Weather } from "src/models/weather";
import request = require('request');
import config = require("../config.json");

const WebhookRelayInterval: number = 1 * 1000;

/**
 * WebhookController relay class.
 */
class WebhookController {
    static instance = new WebhookController();
    
    webhookURLStrings: string[];
    webhookSendDelay: number = 5.0;
    
    private pokemonEvents = {};
    private pokestopEvents = {};
    private lureEvents = {};
    private invasionEvents = {};
    private questEvents = {};
    private gymEvents = {};
    private gymInfoEvents = {};
    private eggEvents = {};
    private raidEvents = {};
    private weatherEvents = {};

    addPokemonEvent(pokemon: Pokemon): void {
        if (this.webhookURLStrings.length > 0) {
            this.pokemonEvents[pokemon.id] = pokemon.toJson();
        }
    }
    addPokestopEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.pokestopEvents[pokestop.id] = pokestop.toJson("pokestop");
        }
    }
    addLureEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.lureEvents[pokestop.id] = pokestop.toJson("pokestop");
        }
    }
    addInvasionEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.invasionEvents[pokestop.id] = pokestop.toJson("invasion");
        }
    }
    addQuestEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.questEvents[pokestop.id] = pokestop.toJson("quest");
        }
    }
    addGymEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymEvents[gym.id] = gym.toJson("gym");
        }
    }
    addGymInfoEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymInfoEvents[gym.id] = gym.toJson("gym-info");
        }
    }
    addEggEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.eggEvents[gym.id] = gym.toJson("egg");
        }
    }
    addRaidEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.raidEvents[gym.id] = gym.toJson("raid");
        }
    }
    addWeatherEvent(weather: Weather): void {
        if (this.webhookURLStrings.length > 0) {
            this.weatherEvents[weather.id] = weather.toJson();
        }
    }
    setup(): void {
        console.info("[WebhookController] Starting up...");
        // TODO: Background thread or event based?
        // TODO: Get webhook strings from database.
        setInterval(() => this.loopEvents(), WebhookRelayInterval);
    }
    loopEvents(): void {
        this.webhookURLStrings = config.webhook.urls;
        if (this.webhookURLStrings.length > 0) {
            let events: any[] = [];
            let pokemonKeys = Object.keys(this.pokemonEvents);
            pokemonKeys.forEach(pokemonKey => {
                // TODO: Remove event after added to events list.
                let pokemonEvent = this.pokemonEvents[pokemonKey];
                events.push(pokemonEvent);
            });
            this.pokemonEvents = {};
            
            let pokestopKeys = Object.keys(this.pokestopEvents);
            pokestopKeys.forEach(pokestopKey => {
                let pokestopEvent = this.pokestopEvents[pokestopKey];
                events.push(pokestopEvent);
            });
            this.pokestopEvents = {};
            
            let lureKeys = Object.keys(this.lureEvents);
            lureKeys.forEach(lureKey => {
                let lureEvent = this.lureEvents[lureKey];
                events.push(lureEvent);
            });
            this.lureEvents = {};
            
            let invasionKeys = Object.keys(this.invasionEvents);
            invasionKeys.forEach(invasionKey => {
                let invasionEvent = this.invasionEvents[invasionKey];
                events.push(invasionEvent);
            });
            this.invasionEvents = {};
            
            let questKeys = Object.keys(this.questEvents);
            questKeys.forEach(questKey => {
                let questEvent = this.questEvents[questKey];
                events.push(questEvent);
            });
            this.questEvents = {};
            
            let gymKeys = Object.keys(this.gymEvents);
            gymKeys.forEach(gymKey => {
                let gymEvent = this.gymEvents[gymKey];
                events.push(gymEvent);
            });
            this.gymEvents = {};
            
            let gymInfoKeys = Object.keys(this.gymInfoEvents);
            gymInfoKeys.forEach(gymInfoKey => {
                let gymInfoEvent = this.gymInfoEvents[gymInfoKey];
                events.push(gymInfoEvent);
            });
            this.gymInfoEvents = {};
            
            let raidKeys = Object.keys(this.raidEvents);
            raidKeys.forEach(raidKey => {
                let raidEvent = this.raidEvents[raidKey];
                events.push(raidEvent);
            });
            this.raidEvents = {};
            
            let eggKeys = Object.keys(this.eggEvents);
            eggKeys.forEach(eggKey => {
                let eggEvent = this.eggEvents[eggKey];
                events.push(eggEvent);
            });
            this.eggEvents = {};

            let weatherKeys = Object.keys(this.weatherEvents);
            weatherKeys.forEach(weatherKey => {
                let weatherEvent = this.weatherEvents[weatherKey];
                events.push(weatherEvent);
            });
            this.weatherEvents = {};
            
            if (events && events.length > 0) {
                this.webhookURLStrings.forEach(url => {
                    this.sendEvents(events, url);
                });
            }
        }
    }
    sendEvents(events: any, url: string): void {
        if (events === undefined || events === null) {
            return;
        }
        let options = {
            url: url,
            method: 'POST',
            json: true,
            body: events,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Nodedradamus'
            }
        };
        request(options, (err, res, body) => {
            if (err) { //throw err;
                console.error(err);
                return;
            }
            console.log("[WEBHOOK] Response:", body);
    });
    }
}

export { WebhookController };