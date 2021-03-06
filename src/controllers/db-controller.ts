"use strict"

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import { spawn } from 'child_process';

import { Database } from '../data/mysql';
import { snooze } from '../utils/util';
import config      = require('../config.json');
const db           = new Database(config);

/**
 * Database controller class.
 */
class DbController {
    static instance = new DbController();

    private multiStatement: boolean = false;
    private asRoot: boolean = false;
    private migrationsRoot: string = path.resolve('./migrations/');
    private backupsRoot: string = path.resolve('./backups/');
    private database: string;
    private host: string;
    private port: number;
    private username: string;
    private password: string;
    private rootUsername: string;
    private rootPassword: string;

    getNewestDbVersion() {
        let current: number = 0;
        let keepChecking: boolean = true;
        while (keepChecking) {
            if (fs.existsSync(`${this.migrationsRoot}${path.sep}${current + 1}.sql`)) {
                current++;
            } else {
                keepChecking = false;
            }
        };
        return current;
    }
    async getValueForKey(key: string): Promise<string> {
        let sql = `
            SELECT value
            FROM metadata
            WHERE \`key\` = ?
            LIMIT 1;
        `;
        let args = [key];
        let results: any = await db.query(sql, args)
        .then(x => x)
        .catch(x => {
            console.error("[DbController] Error: " + x);
            return null;
        });
        if (results) {
            let value: string = "";
            for (let i = 0; i < results.length; i++) {
                let row = results[i];
                value = row["value"];
            }
            return value;
        }
        return null;
    }
    async setValueForKey(key: string, value: string): Promise<void> {
        let sql = `
            INSERT INTO metadata (\`key\`, \`value\`)
            VALUES(?, ?)
            ON DUPLICATE KEY UPDATE
            value=VALUES(value)
        `;
        let args = [key, value];
        let results = await db.query(sql, args)
        .then(x => x)
        .catch(x => {
            console.error("[DbController] Error: " + x);
            return null;
        });
        console.log("[DbController] SetValueForKey:", results);
    }
    async setup() {
        // TODO: Testing purposes
        this.migrate(0, 1);
        this.asRoot = true;
        this.multiStatement = true;
        
        let count = 1;
        let done = false;
        while (!done) {
            if (db === undefined || db === null) {
                let message = `Failed to connect to database (as ${this.rootUsername}) while initializing. Try: ${count}/10`;
                if (count === 10) {
                    console.error("[DBController]", message);
                    //fatalError(message);
                } else {
                    console.log("[DBController]", message);
                }
                count++;
                snooze(2500);
                continue;
            }
            done = true;
            this.asRoot = false;
            if (db === undefined || db === null) {
                let message = `Failed to connect to database (as ${this.username}) while initializing.`;
                console.error("[DBController] ", message);
                //fatalError(message);
            }
            this.asRoot = true
        }
        
        let version = 0;
        let createMetadataTableSQL = `
            CREATE TABLE IF NOT EXISTS metadata (
                \key\` VARCHAR(50) PRIMARY KEY NOT NULL,
                \`value\` VARCHAR(50) DEFAULT NULL
            );
        `;
        
        await db.query(createMetadataTableSQL)
            .then(x => x)
            .catch(err => {
                let message = `Failed to create metadata table: (\(mysql.errorMessage())`;
                console.error("[DBController]", message);
                //fatalError(message);
            });
        
        let getDBVersionSQL = `
            SELECT \`value\`
            FROM metadata
            WHERE \`key\` = "DB_VERSION"
            LIMIT 1;
        `;
        
        let results = await db.query(getDBVersionSQL)
            .then(x => x)
            .catch(err => {
                let message = `Failed to get current database version: (${err})`;
                console.error("[DBController]", message);
                //fatalError(message);
            });
        if (results) {
            Object.keys(results).forEach(x => { //TODO: Confirm Object.keys/values works
                version = parseInt(x);
            })
        }

        this.migrate(version, this.getNewestDbVersion());
        this.multiStatement = false;
        this.asRoot = false;

    }
    constructor() {
        fs.mkdirSync(this.migrationsRoot, { recursive: true });
        fs.mkdirSync(this.backupsRoot, { recursive: true });

        console.log("[DBController] Initializing database");
        
        let enviroment = process.env;
        this.database = enviroment["DB_DATABASE"] ?? "rdmdb";
        this.host = enviroment["DB_HOST"] ?? "127.0.0.1";
        this.port = parseInt(enviroment["DB_PORT"] ?? "") ?? 3306;
        this.username = enviroment["DB_USERNAME"] ?? "rdmuser";
        this.password = enviroment["DB_PASSWORD"];
        this.rootUsername = enviroment["DB_ROOT_USERNAME"] ?? "root";
        this.rootPassword = enviroment["DB_ROOT_PASSWORD"];
    }
    async migrate(fromVersion: number, toVersion: number) {
        let backupFileSchema: fs.WriteStream;
        let backupFileTrigger: fs.WriteStream;
        let backupFileData: fs.WriteStream;
        if (fromVersion < toVersion) {
            console.log("[DBController] Migrating database to version", fromVersion + 1);
            
            let uuidString = uuid.v4();
            let backupsDir = fs.opendirSync(this.backupsRoot);
            backupFileSchema = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".schema.sql");
            backupFileTrigger = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".trigger.sql");
            backupFileData = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".data.sql");
            if (process.env["NO_BACKUP"] === undefined || process.env["NO_BACKUP"] === null) {
                let allTables = {
                    account: true,
                    assignment: true,
                    device: true,
                    device_group: true,
                    discord_rule: true,
                    group: true,
                    gym: true,
                    instance: true,
                    metadata: true,
                    pokemon: true,
                    pokemon_stats: false,
                    pokemon_shiny_stats: false,
                    pokestop: true,
                    quest_stats: false,
                    raid_stats: false,
                    invasion_stats: false,
                    s2cell: true,
                    spawnpoint: true,
                    token: true,
                    user: true,
                    weather: true,
                    web_session: true,
                };                
                let tablesShema = "";
                let tablesData = "";
                let allTablesSQL = `
                    SHOW TABLES
                `;
                let results = await db.query(allTablesSQL)
                .then(x => x)
                .catch(err => {
                    let message = `Failed to execute query. (${err})`
                    console.error("[DBController]", message);
                    //fatalError(message);
                });
                let tableKeys = Object.keys(results);
                console.log("TABLE KEYS:", tableKeys);
                tableKeys.forEach(key => {
                    let withData = allTables[key];
                    tablesShema += ` ${key}`;
                    if (withData) {
                        tablesData += ` ${key}`;
                    }
                });

                console.log("[DBController] Creating backup", uuidString);
                let mysqldumpCommand: string;
                if (os.type().toLowerCase() === "darwin") {
                    mysqldumpCommand = "/usr/local/opt/mysql@5.7/bin/mysqldump"
                } else {
                    mysqldumpCommand = "/usr/bin/mysqldump"
                }
                
                // Schema
                let args = ["-c", mysqldumpCommand + ` --set-gtid-purged=OFF --skip-triggers --add-drop-table --skip-routines --no-data ${this.database} ${tablesShema} -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} > ${backupFileSchema.path}`];
                let cmd = executeCommand("bash", args);
                if (cmd) {
                    let message = `Failed to create Command Backup: ${cmd}`;
                    console.error("[DBController]", message);
                    //fatalError(message);
                }
                // Trigger
                args = ["-c", mysqldumpCommand + ` --set-gtid-purged=OFF --triggers --no-create-info --no-data --skip-routines ${this.database} ${tablesShema}  -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} > ${backupFileTrigger.path}`];
                cmd = executeCommand("bash", args);
                if (cmd) {
                    let message = `Failed to create Command Backup ${cmd}`;
                    console.error("[DBController]", message);
                    //fatalError(message);
                }
                // Data
                args = ["-c", mysqldumpCommand + ` --set-gtid-purged=OFF --skip-triggers --skip-routines --no-create-info --skip-routines ${this.database} ${tablesData}  -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} > ${backupFileData.path}`];
                cmd = executeCommand("bash", args);
                if (cmd) {
                    let message = `Failed to create Data Backup ${cmd}`;
                    console.error("[DBController]", message);
                    //fatalError(message);
                }
            }
            
            console.log("[DBController] Migrating...");

            let migrateSQL: string
            try {
                let sqlFile = `${this.migrationsRoot}${path.sep}${fromVersion + 1}.sql`;
                migrateSQL = readFile(sqlFile);
            } catch (err) {
                let message = `Migration failed: (${err})`;
                console.error("[DBController]", message);
                // TODO: fatalError(message);
            }
            let sqlSplit = migrateSQL.split(';');
            sqlSplit.forEach(async sql => {
                let msql = sql.replace('&semi', ';').trim();
                if (msql !== "") {
                    let results = await db.query(msql)
                    .then(x => x)
                    .catch(x => {
                        let message = `Migration Failed: (${x})`;
                        console.error("[DBController]", message);
                        if (process.env["NO_BACKUP"] === undefined || process.env["NO_BACKUP"] === null) {
                            for (let i = 0; i < 10; i++) {
                                console.log(`[DBController] Rolling back migration in ${10 - i} seconds`);
                                snooze(1000);
                            }
                            console.log("[DBController] Rolling back migration now. Do not kill RDM!");
                            this.rollback(
                                backupFileSchema.path.toString(), 
                                backupFileTrigger.path.toString(), 
                                backupFileData.path.toString());
                        }
                        //fatalError(message);
                        return null;
                    });
                }
                
            })
            
            let updateVersionSQL: string = `
                INSERT INTO metadata (\`key\`, \`value\`)
                VALUES("DB_VERSION", ${fromVersion + 1})
                ON DUPLICATE KEY UPDATE \`value\` = ${fromVersion + 1};
            `;
            await db.query(updateVersionSQL)
                .then(x => x)
                .catch(err => {
                    let message = `Migration Failed: ${err}`;
                    console.error("[DBController]", message);
                    //fatalError(message);
                });
            console.log("[DBController] Migration successful");
            this.migrate(fromVersion + 1, toVersion);
        }
    }
    rollback(backupFileSchema: string, backupFileTrigger: string, backupFileData: string) {
        let mysqlCommand: string;
        if (os.type().toLowerCase() === "darwin") {
            mysqlCommand = "/usr/local/opt/mysql@5.7/bin/mysql";
        } else {
            mysqlCommand = "/usr/bin/mysql";
        }

        console.log("[DBController] Executing Schema backup...");
        let args = ["-c", mysqlCommand + ` ${this.database} -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} < ${backupFileSchema}`];
        let cmd = executeCommand("bash", args);
        if (cmd) {
            console.log("[DBController] Executing Schema backup failed:", cmd);
        } else {
            console.log("[DBController] Executing Schema backup done.");
        }
        console.log("[DBController] Executing Trigger backup...");
        args = ["-c", mysqlCommand + ` ${this.database} -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} < ${backupFileTrigger}`];
        cmd = executeCommand("bash", args);
        if (cmd) {
            console.log("[DBController] Executing Trigger backup failed:", cmd);
        } else {
            console.log("[DBController] Executing Trigger backup done.");
        }
        
        console.log("[DBController] Executing Data backup...");
        args = ["-c", mysqlCommand + ` ${this.database} -h ${this.host} -P ${this.port} -u ${this.rootUsername} -p${this.rootPassword.replace("\"", "\\\"") || ""} < ${backupFileData}`];
        cmd = executeCommand("bash", args);
        if (cmd) {
            console.log("[DBController] Executing Data backup failed:", cmd);
        } else {
            console.log("[DBController] Executing Data backup done.");
        }

        console.log("[DBController] Database restored successfully!");
        console.log("[DBController] Sleeping for 60s before restarting again. (Save to kill now)");
        snooze(60 * 1000);
    }
}

function readFile(path: string) {
    let data = fs.readFileSync(path);
    return data.toString('utf8');
}

function executeCommand(command: string, args?: string[]) {
    let commandData = spawn(command, args);
    process.stdin.pipe(commandData.stdin);
    commandData.stdout.on('data', (data) => {
        let result = data;
        result = result.replace('mysql: [Warning] Using a password on the command line interface can be insecure.', '');
        return result;
        //if (result) {
        //    console.log("[DBController] Executing Data backup failed:", result);
        //} else {
        //    console.log("[DBController] Executing Data backup done.");
        //}
    });
    return null;
}

export { DbController };