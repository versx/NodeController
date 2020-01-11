"use strict"

const accountsPath = './data/accounts.json';
const fs           = require('fs');
const redis        = require('redis');

class Account {
    username: string;
    password: string;
    firstWarningTimestamp: number;
    failedTimestamp: number;
    failed: string;
    level: number;
    lastEncounterLat: number;
    lastEncounterLon: number;
    lastEncounterTime: number;
    spins: number;
    tutorial: number;
    ptcToken: string;

    constructor(username: string, password: string, firstWarningTimestamp: number, failedTimestamp: number,
        failed: string, level: number, lastEncounterLat: number, lastEncounterLon: number, lastEncounterTime: number,
        spins: number, tutorial: number, ptcToken: string) {
        this.username = username;
        this.password = password;
        this.firstWarningTimestamp = firstWarningTimestamp;
        this.failedTimestamp = failedTimestamp;
        this.failed = failed;
        this.level = level;
        this.lastEncounterLat = lastEncounterLat;
        this.lastEncounterLon = lastEncounterLon;
        this.lastEncounterTime = lastEncounterTime;
        this.spins = spins;
        this.tutorial = tutorial;
        this.ptcToken = ptcToken;
    }
    static getAll() {
        return this.load();
    }
    static getNewAccount(minLevel: number, maxLevel: number) {
        return new Account(null, null, null, null, null, null, null, null, null, null, null, null);
    }
    static spin(username: string) {
        return new Account(null, null, null, null, null, null, null, null, null, null, null, null);
    }
    static getWithUsername(username: string) {
        return new Account(null, null, null, null, null, null, null, null, null, null, null, null);
    }
    static didEncounter(username: string, newLat: number, newLon: number, encounterTime: number) {
    }
    static clearSpins() {
    }
    save() {
        let accounts = Account.getAll();
        //if (accounts[this.username] !== undefined) {
            accounts[this.username] = this
            save(accounts, accountsPath);
        //}
    }
    static load() {
        let data = fs.readFileSync(accountsPath);
        let obj = JSON.parse(data);
        let accountList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                let acc = obj[key];
                accountList.push(new Account(acc.username, acc.password, acc.firstWarningTimestamp, acc.failedTimestamp,
                    acc.failed, acc.level, acc.lastEncounterLat, acc.lastEncounterLon, acc.lastEncounterTime,
                    acc.spins, acc.tutorial, acc.ptcToken));
            }
        }
        return accountList;
    }
}

/**
 * Save object as json string to file path.
 * @param {*} obj 
 * @param {*} path 
 */
function save(obj: any, path: string) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
export { Account };