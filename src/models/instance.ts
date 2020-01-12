"use strict"

enum InstanceType {
    CirclePokemon = 'circle_pokemon',
    CircleRaid = 'circle_raid',
    SmartCircleRaid = 'circle_smart_raid',
    AutoQuest = 'auto_quest',
    PokemonIV = 'pokemon_iv',
    GatherToken = 'gather_token',
    Leveling = 'leveling'
}

interface IInstanceData {
    timeZoneOffset: number;
    spinLimit: number;

}

interface IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    //timeZoneOffset: number;
    area: [any];
    data: IInstanceData;
}

class Instance implements IInstance {
    name: string;
    type: InstanceType;
    minLevel: number;
    maxLevel: number;
    area: [any];
    data: IInstanceData;

    static getAll() {
        return [];
    }
}

export { InstanceType, Instance };