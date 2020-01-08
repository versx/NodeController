"use strict"

const pokestopsPath = 'pokestops.json';
const fs            = require('fs');

const lureTime = 1800;

class Pokestop {
    static Pokestops = {};
    constructor(data) {
        if (data.fort !== undefined) {
            this.id = data.fort.id;
            this.lat = data.fort.latitude;
            this.lon = data.fort.longitude;
            if (data.fort.sponsor !== 0) {
                this.sponsorId = data.fort.sponsor;
            }
            this.enabled = data.fort.enabled;
            var lastModifiedTimestamp = data.fort.last_modified_timestamp_ms / 1000;
            if (data.fort.active_fort_modifier !== undefined && data.fort.active_fort_modifier !== null && data.fort.active_fort_modifier.length > 0) {
                console.log("Fort Modifier:", data.fort.active_fort_modifier);
                if (data.fort.active_fort_modifier.contains(501) ||
                    data.fort.active_fort_modifier.contains(502) ||
                    data.fort.active_fort_modifier.contains(503) ||
                    data.fort.active_fort_modifier.contains(504)) {
                    this.lureExpireTimestamp = lastModifiedTimestamp + lureTime;
                    this.lureId = data.fort.active_fort_modifier[0].item_id;
                }
            }
            this.lastModifiedTimestamp = lastModifiedTimestamp;
            if (data.fort.image_url !== null) {
                this.url = data.fort.image_url;
            }
            if (data.fort.pokestop_display !== undefined && data.fort.pokestop_display !== null) {
                this.incidentExpireTimestamp = data.fort.pokestop_display.incident_expiration_ms / 1000;
                if (data.fort.pokestop_display.character_display !== undefined && data.fort.pokestop_display.character_display !== null) {
                    this.pokestopDisplay = data.fort.pokestop_display.character_display.style;
                    this.gruntType = data.fort.pokestop_display.character_display.character;
                }
            } else if (data.fort.pokestop_displays !== undefined && data.fort.pokestop_displays.length > 0) {
                this.incidentExpireTimestamp = data.fort.pokestop_displays[0].incident_expiration_ms / 1000;
                if (data.fort.pokestop_displays[0].character_display !== undefined && data.fort.pokestop_displays[0].character_display !== null) {
                    this.pokestopDisplay = data.fort.pokestop_displays[0].character_display.style;
                    this.gruntType = data.fort.pokestop_displays[0].character_display.character;
                }
            }
            this.cellId = data.cellId.toString();
        } else {
            this.id = data.id.toString();
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
    
            this.cellId = data.cellId.toString();
            this.lureId = data.lureId;
            this.pokestopDisplay = data.pokestopDisplay;
            this.incidentExpireTimestamp = data.incidentExpireTimestamp;
            this.gruntType = data.gruntType;
            this.sponsorId = data.sponsorId;
        }
    }
    static getAll() {
        return this.load();
    }
    static getById(pokestopId) {
        return this.Pokestops[pokestopId.toString()];
    }
    addDetails(fort) {
        
    }
    addQuest(quest) {
        //TODO: Add quest
    }
    save() {
        //TODO: Check if values changed, if not skip.
        Pokestop.Pokestops[this.id.toString()] = this;
        save(Pokestop.Pokestops, pokestopsPath);
    }
    static load() {
        var data = fs.readFileSync(pokestopsPath);
        this.Pokestops = JSON.parse(data);
        return this.Pokestops;
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