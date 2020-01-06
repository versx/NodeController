"use strict"

const accountsPath = '../accounts.json';
const accounts  = require(accountsPath);

// Constructor
class Account {
    constructor(username, password, firstWarningTimestamp, level) {
        this.username = username;
        this.password = password;
        this.firstWarningTimestamp = firstWarningTimestamp;
        this.level = level;
    }
    getAccounts() {
        return accounts;
    }
    getNewAccount(minLevel, maxLevel) {
        return {};
    }
    save() {
        if (accounts[this.username] !== undefined) {
            accounts.push({
                username: this.username,
                password: this.password,
                first_warning_timestamp: this.firstWarningTimestamp,
                level: this.level
            });
            save(accounts, accountsPath);
        }
    }
    load() {
        var data = fs.readFileSync(accountsPath);
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
module.exports = Account;