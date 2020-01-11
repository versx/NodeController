"use strict"

const accountsPath = './data/accounts.json';
import fs = require('fs');

//console.log("Dir:", __dirname);

class Account {
    username: string;
    password: string;
    firstWarningTimestamp: number;
    level: number;
    constructor(username: string, password: string, firstWarningTimestamp: number, level: number) {
        this.username = username;
        this.password = password;
        this.firstWarningTimestamp = firstWarningTimestamp;
        this.level = level;
    }
    static getAll() {
        return this.load();
    }
    static getNewAccount(minLevel, maxLevel) {
        return {};
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
        let obj = JSON.parse(data.toString());
        let accountList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                let acc = obj[key];
                accountList.push(new Account(acc.username, acc.password, acc.firstWarningTimestamp, acc.level));
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