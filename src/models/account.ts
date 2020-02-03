"use strict";

import config      = require('../config.json');
import { Database } from '../data/mysql';
import { logger } from '../utils/logger';
const db           = new Database(config);

/**
 * Account model class.
 */
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

    /**
     * Initalize new Account object.
     * @param username 
     * @param password 
     * @param firstWarningTimestamp 
     * @param failedTimestamp 
     * @param failed 
     * @param level 
     * @param lastEncounterLat 
     * @param lastEncounterLon 
     * @param lastEncounterTime 
     * @param spins 
     * @param tutorial 
     * @param ptcToken 
     */
    constructor(username: string, password: string, firstWarningTimestamp: number, failedTimestamp: number,
        failed: string, level: number, lastEncounterLat: number, lastEncounterLon: number, lastEncounterTime: number,
        spins: number, tutorial: number, ptcToken: string) {
        this.username = username;
        this.password = password;
        if (firstWarningTimestamp > 0) {
            this.firstWarningTimestamp = firstWarningTimestamp;
        }
        if (failedTimestamp > 0) {
            this.failedTimestamp = failedTimestamp;
        }
        this.failed = failed;
        this.level = level;
        this.lastEncounterLat = lastEncounterLat;
        this.lastEncounterLon = lastEncounterLon;
        if (lastEncounterTime > 0) {
            this.lastEncounterTime = lastEncounterTime;
        }
        this.spins = spins;
        this.tutorial = tutorial;
        this.ptcToken = ptcToken;
    }
    /**
     * Get all accounts.
     */
    static getAll(): Promise<Account[]> {
        return this.load();
    }
    /**
     * Get new account between minimum and maximum level.
     * @param minLevel 
     * @param maxLevel 
     */
    static async getNewAccount(minLevel: number, maxLevel: number): Promise<Account> {
        let sql = `
        SELECT username, password, level, first_warning_timestamp, failed_timestamp, failed, last_encounter_lat, last_encounter_lon, last_encounter_time, spins
        FROM account
        LEFT JOIN device ON username = account_username
        WHERE first_warning_timestamp is NULL AND failed_timestamp is NULL and device.uuid IS NULL AND level >= ? AND level <= ? AND failed IS NULL AND (last_encounter_time IS NULL OR UNIX_TIMESTAMP() -  CAST(last_encounter_time AS SIGNED INTEGER) >= 7200 AND spins < 400)
        ORDER BY level DESC, RAND()
        LIMIT 1
        `;
        let result = await db.query(sql, [minLevel, maxLevel])
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to get new Account " + err);
                return null;
            });
        let account: Account;
        if (result) {
            let keys = Object.values(result);
            keys.forEach(key => {
                account = new Account(
                    key.username,
                    key.password,
                    key.first_warning_timestamp,
                    key.failed_timestamp,
                    key.failed,
                    key.level,
                    key.last_encounter_lat,
                    key.last_encounter_lon,
                    key.last_encounter_time,
                    key.spins,
                    key.tutorial,
                    key.ptcToken
                );
            });
        }
        return account;
    }
    /*
    getNewAccount(mysql: MySQL?=nil, uuid: String, area: String, minLevel: Int, maxLevel: Int) throws -> Account? {
        var newLat: Double = 0
        var newLon: Double = 0
        var spinLimit: Int = 0
        var findAccount = false
        var action: String = ""
        var username: String = ""
        var password: String = ""
        var level: UInt8 = 0
        var firstWarningTimestamp: UInt32 = 0
        var failedTimestamp: UInt32 = 0
        var failed: String = ""
        var lastEncounterLat: Double = 0
        var lastEncounterLon: Double = 0
        var lastEncounterTime: UInt32 = 0
        var spins: UInt16 = 0
        var tutorial: UInt8 = 0
        var ptcToken: String = ""
        let controller = InstanceController.global.getInstanceController(deviceUUID: uuid)
        if controller != nil {
            let newTask = controller!.getTask(uuid: uuid, username: nil, startup: true)
            newLat = newTask["lat"] as! Double
            newLon = newTask["lon"] as! Double
            action = newTask["action"] as! String
            if action == "scan_quest" {
                spinLimit = newTask["spin_limit"] as! Int
            }
        }
        let sql = """
        SELECT username, password, level, first_warning_timestamp, failed_timestamp, failed, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, tutorial, ptcToken
        FROM account
        LEFT JOIN device ON username = account_username
        WHERE (first_warning_timestamp < UNIX_TIMESTAMP() - 604801 OR first_warning_timestamp IS NULL)  AND (failed_timestamp < UNIX_TIMESTAMP() - 2592001 OR failed_timestamp IS NULL) AND device.uuid IS NULL AND level >= ? AND level <= ? AND failed IS NULL AND last_uuid = ? AND last_instance = ? AND spins < ?
        ORDER BY level DESC, RAND()
        """
        
        let mysqlStmt = MySQLStmt(mysql)
        _ = mysqlStmt.prepare(statement: sql)
        mysqlStmt.bindParam(minLevel)
        mysqlStmt.bindParam(maxLevel)
        mysqlStmt.bindParam(uuid)
        mysqlStmt.bindParam(area)
        if action == "scan_quest" {
            mysqlStmt.bindParam(spinLimit)
        } else {
            mysqlStmt.bindParam(99999)
        }
        guard mysqlStmt.execute() else {
            Log.error(message: "[ACCOUNT] Failed to execute query. (\(mysqlStmt.errorMessage())")
            throw DBController.DBError()
        }
        let results = mysqlStmt.results()
        
        _ = results.forEachRow {
            sqlResult in
            if !findAccount {
                var logDelay: Double = 0
                var newCoords = CLLocationCoordinate2D(latitude: 0, longitude: 0)
                var oldCoords = CLLocationCoordinate2D(latitude: 0, longitude: 0)
                var lastEncounter: UInt32 = 0
                let timeNow = UInt32(Date().timeIntervalSince1970)
                
                username = sqlResult[0] as! String
                password = sqlResult[1] as! String
                level = sqlResult[2] as! UInt8
                firstWarningTimestamp = sqlResult[3] as? UInt32 ?? 0
                failedTimestamp = sqlResult[4] as? UInt32 ?? 0
                failed = sqlResult[5] as? String ?? ""
                lastEncounterLat = sqlResult[6] as? Double ?? 0
                lastEncounterLon = sqlResult[7] as? Double ?? 0
                lastEncounterTime = sqlResult[8] as? UInt32 ?? 1
                spins = sqlResult[9] as! UInt16
                tutorial = sqlResult[10] as! UInt8
                ptcToken = sqlResult[11] as? String ?? ""
            
                newCoords = CLLocationCoordinate2D(latitude: newLat, longitude: newLon)
                if lastEncounterLat != 0 && lastEncounterLon != 0 {
                    oldCoords = CLLocationCoordinate2D(latitude: lastEncounterLat, longitude: lastEncounterLon)
                    lastEncounter = lastEncounterTime
                } else {
                    oldCoords = newCoords
                    lastEncounter = 0
                }
                let dist = oldCoords.distance(to: newCoords) / 1000
                for data in Account.cooldownDataArray {
                    if data.key >= dist {
                        logDelay = (data.value * 60) - 10
                        break
                    }
                }
                let finalDelay = UInt32(logDelay)
                let checkDelay = timeNow - lastEncounter
                if checkDelay >= finalDelay {
                    findAccount = true

                } else {
                    findAccount = false
                }
            }
        }
        if !findAccount {
            let sql = """
                SELECT username, password, level, first_warning_timestamp, failed_timestamp, failed, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, tutorial, ptcToken
                FROM account
                LEFT JOIN device ON username = account_username
                WHERE (first_warning_timestamp < UNIX_TIMESTAMP() - 604801 OR first_warning_timestamp IS NULL)  AND (failed_timestamp < UNIX_TIMESTAMP() - 2592001 OR failed_timestamp IS NULL) AND device.uuid IS NULL AND level >= ? AND level <= ? AND failed IS NULL AND last_uuid is NULL AND last_instance is NULL AND spins = ?
                ORDER BY level DESC, RAND()
                LIMIT 1
            """

            let mysqlStmt = MySQLStmt(mysql)
            _ = mysqlStmt.prepare(statement: sql)
            mysqlStmt.bindParam(minLevel)
            mysqlStmt.bindParam(maxLevel)

            guard mysqlStmt.execute() else {
                Log.error(message: "[ACCOUNT] Failed to execute query. (\(mysqlStmt.errorMessage())")
                throw DBController.DBError()
            }
            let results = mysqlStmt.results()
            if results.numRows == 0 {
                return nil
            }

            let result = results.next()!

            username = result[0] as! String
            password = result[1] as! String
            level = result[2] as! UInt8
            firstWarningTimestamp = result[3] as? UInt32 ?? 0
            failedTimestamp = result[4] as? UInt32 ?? 0
            failed = result[5] as? String ?? ""
            lastEncounterLat = result[6] as? Double ?? 0
            lastEncounterLon = result[7] as? Double ?? 0
            lastEncounterTime = result[8] as? UInt32 ?? 1
            spins = result[9] as! UInt16
            tutorial = result[10] as! UInt8
            ptcToken = result[11] as? String ?? ""
            if action == "scan_quest" {
                mysqlStmt.bindParam(spinLimit)
            } else {
                mysqlStmt.bindParam(99999)
            }
        }
        return Account(username: username, password: password, level: level, firstWarningTimestamp: firstWarningTimestamp, failedTimestamp: failedTimestamp, failed: failed, lastEncounterLat: lastEncounterLat, lastEncounterLon: lastEncounterLon, lastEncounterTime: lastEncounterTime, spins: spins, tutorial: tutorial, ptcToken: ptcToken)
    }
    */
    /**
     * Increment spin for account with username.
     * @param username 
     */
    static async spin(username: string): Promise<void> {
        let sql = `
        UPDATE account
        SET spins = spins + 1
        WHERE username = ?
        `;
        let result = await db.query(sql, username)
            .then(x => x)
            .catch(err => {
                logger.error("[Account] Failed to increment spin count for account with username " + username + " Error: " + err);
                return null;
            });
        logger.info("[Account] Spin: " + result);
    }
    /**
     * Get account with username.
     * @param username 
     */
    static async getWithUsername(username: string): Promise<Account> {
        let sql = `
        SELECT username, password, first_warning_timestamp, failed_timestamp, failed, level, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, tutorial, ptcToken
        FROM account
        WHERE username = ?
        LIMIT 1
        `;
        let args = [username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to get Account with username " + username + " Error: " + err);
                return null;
            });
        let account: Account;
        let keys = Object.values(result);
        keys.forEach(key => {
            account = new Account(
                key.username,
                key.password,
                key.first_warning_timestamp,
                key.failed_timestamp,
                key.failed,
                key.level,
                key.last_encounter_lat,
                key.last_encounter_lon,
                key.last_encounter_time,
                key.spins,
                key.tutorial,
                key.ptcToken
            );
        })
        return account;
    }
    static async getNewAccountNoToken(minLevel: number, maxLevel: number): Promise<Account> {
        let sql = `
        SELECT username, password, first_warning_timestamp, failed_timestamp, failed, level, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, tutorial, ptcToken
        FROM account
        LEFT JOIN device ON username = account_username
        WHERE first_warning_timestamp is NULL AND failed_timestamp is NULL and device.uuid IS NULL AND level >= ? AND level <= ? AND failed IS NULL AND (last_encounter_time IS NULL OR UNIX_TIMESTAMP() -  CAST(last_encounter_time AS SIGNED INTEGER) >= 7200 AND spins < 400) AND ptcToken IS NULL
        ORDER BY level DESC, RAND()
        LIMIT 1
        `;
        let args = [minLevel, maxLevel];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to get Account between level " + minLevel + "-" + maxLevel + " Error: " + err);
                return null;
            });
        let account: Account;
        let keys = Object.values(result);
        keys.forEach(key => {
            account = new Account(
                key.username,
                key.password,
                key.first_warning_timestamp,
                key.failed_timestamp,
                key.failed,
                key.level,
                key.last_encounter_lat,
                key.last_encounter_lon,
                key.last_encounter_time,
                key.spins,
                key.tutorial,
                key.ptcToken
            );
        })
        return account;
    }
    /**
     * Add encounter data to specified account.
     * @param username 
     * @param newLat 
     * @param newLon 
     * @param encounterTime 
     */
    static async didEncounter(username: string, newLat: number, newLon: number, encounterTime: number): Promise<void> {
        let sql = `
        UPDATE account
        SET last_encounter_lat = ?, last_encounter_lon = ?, last_encounter_time = ?
        WHERE username = ?
        `;
        let args = [newLat, newLon, encounterTime, username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Account] Failed to set encounter info for account with username " + username + " Error: " + err);
                return null;
            });
        logger.info("[Account] DidEncounter: " + result);
    }
    /**
     * Clear spins for account.
     */
    static async clearSpins(): Promise<void> {
        let sql = `
        UPDATE account
        SET spins = 0
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Account] Failed to set clear spins for accounts: " + err);
                return null;
            });
        logger.info("[Account] ClearSpins: " + result);
    }
    /**
     * Set account level.
     * @param username 
     * @param level 
     */
    static async setLevel(username: string, level: number): Promise<void> {
        let sql = `
        UPDATE account
        SET level = ?
        WHERE username = ?
        `;
        let args = [level, username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to set Account level for username " + username + " Error: " + err);
                return null;
            });
        logger.info("[Account] SetLevel: " + result);
    }
    static async setCooldown(username: string, lastLat: number, lastLon: number): Promise<void> {
        let sql = `
        UPDATE account
        SET last_encounter_lat = ?, last_encounter_lon = ?, last_encounter_time = UNIX_TIMESTAMP()
        WHERE username = ?
        `;
        let args = [lastLat, lastLon, username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to set cooldown on Account with username " + username + " Error: " + err);
                return null;
            });
        logger.info("[Account] SetCooldown: " + result);
    }
    static async setTutorial(username: string, tutorial: number): Promise<void> {
        let sql = `
        UPDATE account
        SET tutorial = ?
        WHERE username = ?
        `;
        let args = [tutorial, username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to set tutorial for Account with username " + username + " Error: " + err);
                return null;
            });
        logger.info("[Account] SetTutorial: " + result);
    }
    static async setInstanceUuid(uuid: string, area: string, username: string): Promise<void> {
        let sql = `
        UPDATE account
        SET last_uuid = ?,
            last_instance = ?
        WHERE username = ?
        `;
        let args = [uuid, area, username];
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to set Account intance for username " + username + " and device " + uuid + " Error: " + err);
                return null;
            });
        logger.info("[Account] SetInstanceUuid: " + result);
    }
    static async convertAccountLock(): Promise<number> {
        let sql = `
        UPDATE account
        SET last_uuid = NULL, last_instance = NULL
        WHERE (last_encounter_time < UNIX_TIMESTAMP() - 86400) AND last_uuid IS NOT NULL AND last_instance IS NOT NULL
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to convert account lock count.\r\nError:" + err);
                return null;
            });
        logger.info("[Account] clearAccountLock: " + result);
        return Object.keys(result).length; // Return affected_rows instead.
    }
    static async convertAccountLockCount(): Promise<number> {
        let sql = `
        SELECT username
        FROM account
        WHERE (last_encounter_time < UNIX_TIMESTAMP() - 86400) AND last_uuid IS NOT NULL AND last_instance IS NOT NULL
        `;
        let result = await db.query(sql)
            .then(x => x)
            .catch(err => { 
                logger.error("[Account] Failed to convert account lock count.\r\nError:" + err);
                return null;
            });
        logger.info("[Account] convertAccountLockCount: " + result);
        return Object.keys(result).length; // Return num_rows instead.
    }
    static async checkFail(username: string): Promise<boolean> {
        let sql = `
        SELECT first_warning_timestamp, failed_timestamp
        FROM account
        WHERE username = ?
        `;
        let args = [username];
        let result = db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error(`[ACCOUNT] Failed to execute query. (${err})`);
                return;
            });
        /*
        if (result.num_rows === 0) {
            return false;
        }
        */
        if (result) {
            let values = Object.values(result);
            let firstWarningTimestamp = parseInt(values[0]);
            let failedTimestamp = parseInt(values[1]);
            if (firstWarningTimestamp || failedTimestamp) {
                return true;
            }
        }
        return false;
    }
    /**
     * Save account.
     * @param update 
     */
    async save(update: boolean): Promise<void> {

        let sql: string = "";
        let args = [];
        if (update) {
            sql = `
            UPDATE account
            SET password = ?, level = ?, first_warning_timestamp = ?, failed_timestamp = ?, failed = ?, last_encounter_lat = ?, last_encounter_lon = ?, last_encounter_time = ?, spins = ?, ptcToken = ?
            WHERE username = ?
            `;
            args = [this.password, this.level, this.firstWarningTimestamp, this.failedTimestamp, this.failed, this.lastEncounterLat, this.lastEncounterLon, this.lastEncounterTime, this.spins, this.ptcToken, this.username];
        } else {
            sql = `
            INSERT INTO account (username, password, level, first_warning_timestamp, failed_timestamp, failed, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, ptcToken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            args = [this.username, this.password, this.level, this.firstWarningTimestamp, this.failedTimestamp, this.failed, this.lastEncounterLat, this.lastEncounterLon, this.lastEncounterTime, this.spins, this.ptcToken];
        }
        let result = await db.query(sql, args)
            .then(x => x)
            .catch(err => {
                logger.error("[Account] Error: " + err);
                return null;
            });
        logger.info("[Account] Save: " + result)
    }
    /**
     * Load all accounts.
     */
    static async load(): Promise<Account[]> {
        let sql = `
        SELECT username, password, first_warning_timestamp, failed_timestamp, failed, level, last_encounter_lat, last_encounter_lon, last_encounter_time, spins, tutorial, ptcToken
        FROM account
        `;
        let results: any = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error("[Account] Error: " + err);
                return null;
            });
        let accounts: Account[] = [];
        if (results && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                let row = results[i];
                accounts.push(new Account(
                    row.username,
                    row.password,
                    row.first_warning_timestamp,
                    row.failed_timestamp,
                    row.failed,
                    row.level,
                    row.last_encounter_lat,
                    row.last_encounter_lon,
                    row.last_encounter_time,
                    row.spins,
                    row.tutorial,
                    row.ptcToken
                ));
            }
        }
        return accounts;
    }
    static async getStats() {
        let sql = `
            SELECT
              a.level,
              COUNT(level) as total,
              SUM(failed IS NULL AND first_warning_timestamp IS NULL) as good,
              SUM(failed = 'banned') as banned,
              SUM(first_warning_timestamp IS NOT NULL) as warning,
              SUM(failed = 'invalid_credentials') as invalid_creds,
              SUM(failed != 'banned' AND failed != 'invalid_credentials') as other,
              SUM(last_encounter_time IS NOT NULL AND UNIX_TIMESTAMP() - CAST(last_encounter_time AS SIGNED INTEGER) < 7200) as cooldown,
              SUM(spins >= 500) as spin_limit,
              (SELECT count(username) FROM device as d LEFT JOIN accounts_dashboard as ad ON ad.username = d.account_username WHERE a.level = ad.level) as in_use
            FROM account as a
            GROUP BY level
            ORDER BY level DESC
        `;

        let results: any = await db.query(sql)
            .then(x => x)
            .catch(err => {
                logger.error(`[Account] Failed to execute query. (${err})`);
            });
        let stats = [];
        if (results && results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                let row = results[i];
                stats.push({
                    level: row.level,
                    total: row.total || 0,
                    good: row.good || 0,
                    banned: row.banned || 0,
                    warning: row.warning || 0,
                    invalid: row.invalid_creds || 0,
                    other: row.other || 0,
                    cooldown: row.cooldown || 0,
                    spin_limit: row.spin_limit || 0,
                    in_use: row.in_use || 0
                });
            }
        }       
        return stats;
    }
}

// Export the class
export { Account };