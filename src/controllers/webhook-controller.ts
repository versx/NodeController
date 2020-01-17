"use strict"

import { Pokestop } from "src/models/pokestop";
import { Pokemon } from "src/models/pokemon";
import { Gym } from "src/models/gym";
import { Weather } from "src/models/weather";
import request = require('request');
import config = require("../config.json");

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
            this.pokemonEvents[pokemon.id] = pokemon;
        }
    }
    addPokestopEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.pokestopEvents[pokestop.id] = pokestop;
        }
    }
    addLureEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.lureEvents[pokestop.id] = pokestop;
        }
    }
    addInvasionEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.invasionEvents[pokestop.id] = pokestop;
        }
    }
    addQuestEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.questEvents[pokestop.id] = pokestop;
        }
    }
    addGymEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymEvents[gym.id] = gym;
        }
    }
    addGymInfoEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymInfoEvents[gym.id] = gym;
        }
    }
    addEggEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.eggEvents[gym.id] = gym;
        }
    }
    addRaidEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.raidEvents[gym.id] = gym;
        }
    }
    addWeatherEvent(weather: Weather): void {
        if (this.webhookURLStrings.length > 0) {
            this.weatherEvents[weather.id] = weather;
        }
    }
    setup(): void {
        console.info("[WebhookController] Starting up...");
        // TODO: Background thread or event based?
        // TODO: Get webhook strings from database.
        setInterval(() => this.loopEvents());
    }
    loopEvents(): void {
        this.webhookURLStrings = config.webhook.urls;
        if (this.webhookURLStrings.length > 0) {
            let events: any;
            let pokemonKeys = Object.keys(this.pokemonEvents);
            pokemonKeys.forEach(pokemonKey => {
                let pokemonEvent = this.pokemonEvents[pokemonKey];
                events.append(pokemonEvent.value.getWebhookValues("pokemon"))
            });
            this.pokemonEvents = {};
            
            let pokestopKeys = Object.keys(this.pokestopEvents);
            pokestopKeys.forEach(pokestopKey => {
                let pokestopEvent = this.pokestopEvents[pokestopKey];
                events.append(pokestopEvent.value.getWebhookValues("pokestop"))
            });
            this.pokestopEvents = {};
            
            let lureKeys = Object.keys(this.lureEvents);
            lureKeys.forEach(lureKey => {
                let lureEvent = this.lureEvents[lureKey];
                events.append(lureEvent.value.getWebhookValues("lure"))
            });
            this.lureEvents = {};
            
            let invasionKeys = Object.keys(this.invasionEvents);
            invasionKeys.forEach(invasionKey => {
                let invasionEvent = this.invasionEvents[invasionKey];
                events.append(invasionEvent.value.getWebhookValues("invasion"))
            });
            this.invasionEvents = {};
            
            let questKeys = Object.keys(this.questEvents);
            questKeys.forEach(questKey => {
                let questEvent = this.questEvents[questKey];
                events.append(questEvent.value.getWebhookValues("quest"))
            });
            this.questEvents = {};
            
            let gymKeys = Object.keys(this.gymEvents);
            gymKeys.forEach(gymKey => {
                let gymEvent = this.gymEvents[gymKey];
                events.append(gymEvent.value.getWebhookValues("gym"))
            });
            this.gymEvents = {};
            
            let gymInfoKeys = Object.keys(this.gymInfoEvents);
            gymInfoKeys.forEach(gymInfoKey => {
                let gymInfoEvent = this.gymInfoEvents[gymInfoKey];
                events.append(gymInfoEvent.value.getWebhookValues("gym-info"))
            });
            this.gymInfoEvents = {};
            
            let raidKeys = Object.keys(this.raidEvents);
            raidKeys.forEach(raidKey => {
                let raidEvent = this.raidEvents[raidKey];
                events.append(raidEvent.value.getWebhookValues("raid"))
            });
            this.raidEvents = {};
            
            let eggKeys = Object.keys(this.eggEvents);
            eggKeys.forEach(eggKey => {
                let eggEvent = this.eggEvents[eggKey];
                events.append(eggEvent.value.getWebhookValues("egg"))
            });
            this.eggEvents = {};

            let weatherKeys = Object.keys(this.weatherEvents);
            weatherKeys.forEach(weatherKey => {
                let weatherEvent = this.weatherEvents[weatherKey];
                events.append(weatherEvent.value.getWebhookValues("weather"));
            });
            this.weatherEvents = {};
            
            if (events) {
                this.webhookURLStrings.forEach(url => {
                    this.sendEvents(events, url);
                });
            }
        }
    }
    sendEvents(events: any, url: String): void {
        let data = JSON.stringify(events);
        let req = {
            url: url,
            method: 'POST',
            data: data,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'Cache-Control': 'no-cache',
                'User-Agent': 'Nodedradamus'
            }
        };
        request(req.url.toString(), (err, res, body) => {
            if (err) throw err;
            let data = JSON.parse(body);
            console.log("[WEBHOOK] Response:", data);
        });
    }
}

export { WebhookController };