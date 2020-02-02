"use strict"

import { DbController } from './db-controller';
import { Pokestop } from "src/models/pokestop";
import { Pokemon } from "src/models/pokemon";
import { Gym } from "src/models/gym";
import { Weather } from "src/models/weather";
import request = require('request');
//import { winston } from '../utils/logger';

const WebhookRelayInterval: number = 1 * 1000;

/**
 * WebhookController relay class.
 */
class WebhookController {
    static instance = new WebhookController();
    
    webhookURLStrings: string[];
    webhookSendDelay: number = 5.0;
    
    private pokemonEvents: Pokemon[] = [];
    private pokestopEvents: Pokestop[] = [];
    private lureEvents: Pokestop[] = [];
    private invasionEvents: Pokestop[] = [];
    private questEvents: Pokestop[] = [];
    private gymEvents: Gym[] = [];
    private gymInfoEvents: Gym[] = [];
    private eggEvents: Gym[] = [];
    private raidEvents: Gym[] = [];
    private weatherEvents: Weather[] = [];

    constructor() {
        this.init();
    }
    private async init(): Promise<void> {
        let webhookUrls: string = await DbController.instance.getValueForKey("WEBHOOK_URLS");
        if (webhookUrls) {
            this.webhookURLStrings = webhookUrls.split(',');
        }
        let webhookDelay: number = parseInt(await DbController.instance.getValueForKey("WEBHOOK_DELAY") || "5.0");
        if (webhookDelay) {
            this.webhookSendDelay = webhookDelay * 1000;
        }
    }

    addPokemonEvent(pokemon: Pokemon): void {
        if (this.webhookURLStrings.length > 0) {
            this.pokemonEvents.push(pokemon);
            //this.pokemonEvents[pokemon.id] = pokemon.toJson();
        }
    }
    addPokestopEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.pokestopEvents.push(pokestop);
            //this.pokestopEvents[pokestop.id] = pokestop.toJson("pokestop");
        }
    }
    addLureEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.lureEvents.push(pokestop);
            //this.lureEvents[pokestop.id] = pokestop.toJson("pokestop");
        }
    }
    addInvasionEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.invasionEvents.push(pokestop);
            //this.invasionEvents[pokestop.id] = pokestop.toJson("invasion");
        }
    }
    addQuestEvent(pokestop: Pokestop): void {
        if (this.webhookURLStrings.length > 0) {
            this.questEvents.push(pokestop);
            //this.questEvents[pokestop.id] = pokestop.toJson("quest");
        }
    }
    addGymEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymEvents.push(gym);
            //this.gymEvents[gym.id] = gym.toJson("gym");
        }
    }
    addGymInfoEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.gymInfoEvents.push(gym);
            //this.gymInfoEvents[gym.id] = gym.toJson("gym-info");
        }
    }
    addEggEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.eggEvents.push(gym);
            //this.eggEvents[gym.id] = gym.toJson("egg");
        }
    }
    addRaidEvent(gym: Gym): void {
        if (this.webhookURLStrings.length > 0) {
            this.raidEvents.push(gym);
            //this.raidEvents[gym.id] = gym.toJson("raid");
        }
    }
    addWeatherEvent(weather: Weather): void {
        if (this.webhookURLStrings.length > 0) {
            this.weatherEvents.push(weather);
            //this.weatherEvents[weather.id] = weather.toJson();
        }
    }
    setup(): void {
        console.info("[WebhookController] Starting up...");
        setInterval(() => this.loopEvents(), WebhookRelayInterval);
    }
    loopEvents(): void {
        if (this.webhookURLStrings && this.webhookURLStrings.length > 0) {
            let events: any[] = [];
            if (this.pokemonEvents.length > 0) {
                let pokemonEvent = this.pokemonEvents.pop()
                events.push(pokemonEvent.toJson());
            }
            if (this.pokestopEvents.length > 0) {
                let pokestopEvent = this.pokestopEvents.pop();
                events.push(pokestopEvent.toJson("pokestop"));
            }
            if (this.lureEvents.length > 0) {
                let lureEvent = this.lureEvents.pop();
                events.push(lureEvent.toJson("pokestop"));
            }
            if (this.invasionEvents.length > 0) {
                let invasionEvent = this.invasionEvents.pop();
                events.push(invasionEvent.toJson("invasion"));
            }
            if (this.questEvents.length > 0) {
                let questEvent = this.questEvents.pop();
                events.push(questEvent.toJson("quest"));
            }
            if (this.gymEvents.length > 0) {
                let gymEvent = this.gymEvents.pop();
                events.push(gymEvent.toJson("gym"));
            }
            if (this.gymInfoEvents.length > 0) {
                let gymInfoEvent = this.gymInfoEvents.pop();
                events.push(gymInfoEvent.toJson("gym-info"));
            }
            if (this.raidEvents.length > 0) {
                let raidEvent = this.raidEvents.pop();
                events.push(raidEvent.toJson("raid"));
            }
            if (this.eggEvents.length > 0) {
                let eggEvent = this.eggEvents.pop();
                events.push(eggEvent.toJson("egg"));
            }
            if (this.weatherEvents.length > 0) {
                let weatherEvent = this.weatherEvents.pop();
                events.push(weatherEvent.toJson());
            }
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