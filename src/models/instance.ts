"use strict"

enum instanceType {
    circlePokemon = 'circle_pokemon',
    circleRaid = 'circle_raid',
    circleSmartRaid = 'circle_smart_raid',
    autoquest = 'auto_quest',
    pokemonIV = 'pokemon_iv',
    gatherToken = 'gather_token',
    leveling = 'leveling'
}

class Instance {

    name: string;
    type: string;
    data: object;

    constructor(name: string, type: string, data: object) {
        this.name = name;
        this.type = type;
        this.data = data;
    }
    
}