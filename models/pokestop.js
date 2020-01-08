"use strict"

const pokestopsPath = '../pokestops.json';
//const pokestops     = require(pokestopsPath);
const fs            = require('fs');

const lureTime = 1800;

// Constructor
class Pokestop {
    constructor(data) {
        this.id = data.id;
        this.lat = data.lat;
        this.lon = data.lon;
        this.name = data.name;
        this.url = data.url;
        this.enabled = data.enabled;
        this.lureExpireTimestamp = data.lureExpireTimestamp;
        this.lastModifiedTimestamp = data.lastModifiedTimestamp;
        this.updated = data.updated;
        
        this.questType = data.questType;
        this.questTarget = data.questTarget;
        this.questTimestamp = data.questTimestamp;
        this.questConditions = data.questConditions;
        this.questRewards = data.questRewards;
        this.questTemplate = data.questTemplate;

        this.cellId = data.cellId;
        this.lureId = data.lureId;
        this.pokestopDisplay = data.pokestopDisplay;
        this.incidentExpireTimestamp = data.incidentExpireTimestamp;
        this.gruntType = data.gruntType;
        this.sponsorId = data.sponsorId;

        if (this.fort === undefined) {
            this.id = data.fort.id;
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            if (data.fort.sponsor !== .unsetSponsor) {
                this.sponsorId = data.fort.sponsor;
            }
            this.enabled = data.fort.enabled;
            var lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            if (data.fort.active_fort_modifier.contains(itemTroyDisk) ||
                data.fort.active_fort_modifier.contains(itemTroyDiskGlacial) ||
                data.fort.active_fort_modifier.contains(itemTroyDiskMossy) ||
                data.fort.active_fort_modifier.contains(itemTroyDiskMagnetic)) {
                this.lureExpireTimestamp = lastModifiedTimestamp + lureTime;
                this.lureId = data.fort.activeFortModifier[0];
            }
            this.lastModifiedTimestamp = lastModifiedTimestamp;
            if (data.fort.image_url !== null) {
                this.url = data.fort.image_url;
            }
            if (data.fort.pokestop_display !== undefined) {
                this.pokestopDisplay = data.fort.pokestop_display.character_display.style;
                this.incidentExpireTimestamp = data.fort.pokestop_display.incident_expiration_ms / 1000;
                this.gruntType = data.fort.pokestop_display.character_display.character;
            } else if (data.fort.pokestop_displays.length > 0) {
                this.pokestopDisplay = data.fort.pokestop_displays[0].character_display.style;
                this.incidentExpireTimestamp = data.fort.pokestop_displays[0].incident_expiration_ms / 1000;
                this.gruntType = data.fort.pokestop_displays[0].character_display.character;
            }
            this.cellId = data.cellId;
    
        }
    }
    static getAll() {
        //return pokestops;
        return this.load();
    }
    save() {
        var pokestops = Pokestop.getAll();
        if (pokestops[this.id] !== undefined) {
            pokestops[this.id] = this;
            save(pokestops, pokestopsPath);
        }
    }
    static load() {
        var data = fs.readFileSync(pokestopsPath);
        return JSON.parse(data);
    }
}

/**
 * Save object as json string to file path.
 * @param {*} obj 
 * @param {*} path 
 */
function save(obj, path) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
module.exports = Pokestop;