"use strict"

const accountsPath = '../accounts.json';
//const accounts     = require(accountsPath);
const fs           = require('fs');

//console.log("Dir:", __dirname);

// Constructor
class Account {
    constructor(username, password, firstWarningTimestamp, level) {
        this.username = username;
        this.password = password;
        this.firstWarningTimestamp = firstWarningTimestamp;
        this.level = level;
    }
    static getAll() {
        //return accounts;
        return this.load();
    }
    static getNewAccount(minLevel, maxLevel) {
        return {};
    }
    save() {
        var accounts = Account.getAll();
        if (accounts[this.username] !== undefined) {
            accounts.push({
                username: this.username,
                password: this.password,
                firstWarningTimestamp: this.firstWarningTimestamp,
                level: this.level
            });
            save(accounts, accountsPath);
        }
    }
    static load() {
        var data = fs.readFileSync(accountsPath);
        var obj = JSON.parse(data);
        var accountList = []
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var acc = obj[key];
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
function save(obj, path) {
    fs.writeFileSync(path, JSON.stringify(obj, null, 2), 'utf-8');
}

// Export the class
module.exports = Account;