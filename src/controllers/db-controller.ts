"use strict"

import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';

import { Database } from '../data/mysql';
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
    getNewestVersion() {
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

    constructor() {
        fs.mkdirSync(this.migrationsRoot, { recursive: true });
        fs.mkdirSync(this.backupsRoot, { recursive: true });
    }
    async migrate(fromVersion: number, toVersion: number) {
        if (fromVersion < toVersion) {
            console.log("[DBController] Migrating database to version", fromVersion + 1);
            
            let uuidString = uuid.v4();
            let backupsDir = fs.opendirSync(this.backupsRoot);
            let backupFileSchema = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".schema.sql");
            let backupFileTrigger = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".trigger.sql");
            let backupFileData = fs.createWriteStream(backupsDir.path + path.sep + uuidString + ".data.sql");
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
                .catch(x => {
                    console.error("[DbController] Error: " + x);
                    return null;
                });
                let tableKeys = Object.values(results);
                console.log("TABLE KEYS:", tableKeys);
                tableKeys.forEach(x => {
                });

                /*
                guard mysqlStmtTables.execute() else {
                    let message = "Failed to execute query. (\(mysqlStmtTables.errorMessage())"
                    Log.critical(message: "[DBController] " + message)
                    fatalError(message)
                }
                let results = mysqlStmtTables.results()
                while let result = results.next() {
                    if let name = result[0] as? String {
                        if let withData = allTables[name] {
                            tablesShema += " \(name)"
                            if withData {
                                tablesData += " \(name)"
                            }
                        }
                    }
                }
                
                console.log("[DBController] Creating backup", uuidString);
                #if os(macOS)
                let mysqldumpCommand = "/usr/local/opt/mysql@5.7/bin/mysqldump"
                #else
                let mysqldumpCommand = "/usr/bin/mysqldump"
                #endif
                
                // Schema
                let commandSchema = Shell("bash", "-c", mysqldumpCommand + " --set-gtid-purged=OFF --skip-triggers --add-drop-table --skip-routines --no-data \(self.database) \(tablesShema) -h \(self.host) -P \(self.port) -u \(self.rootUsername) -p\(self.rootPassword?.stringByReplacing(string: "\"", withString: "\\\"") ?? "") > \(backupFileSchema.path)")
                let resultSchema = commandSchema.runError()
                if (resultSchema == nil || resultSchema!.stringByReplacing(string: "mysqldump: [Warning] Using a password on the command line interface can be insecure.", withString: "").trimmingCharacters(in: .whitespacesAndNewlines) != "") {
                    let message = "Failed to create Command Backup: \(resultSchema as Any)"
                    Log.critical(message: "[DBController] " + message)
                    fatalError(message)
                }
                
                // Trigger
                let commandTrigger = Shell("bash", "-c", mysqldumpCommand + " --set-gtid-purged=OFF --triggers --no-create-info --no-data --skip-routines \(self.database) \(tablesShema)  -h \(self.host) -P \(self.port) -u \(self.rootUsername) -p\(self.rootPassword?.stringByReplacing(string: "\"", withString: "\\\"") ?? "") > \(backupFileTrigger.path)")
                let resultTrigger = commandTrigger.runError()
                if (resultTrigger == nil || resultTrigger!.stringByReplacing(string: "mysqldump: [Warning] Using a password on the command line interface can be insecure.", withString: "").trimmingCharacters(in: .whitespacesAndNewlines) != "") {
                    let message = "Failed to create Command Backup \(resultTrigger as Any)"
                    Log.critical(message: "[DBController] " + message)
                    fatalError(message)
                }
     
                // Data
                let commandData = Shell("bash", "-c", mysqldumpCommand + " --set-gtid-purged=OFF --skip-triggers --skip-routines --no-create-info --skip-routines \(self.database) \(tablesData)  -h \(self.host) -P \(self.port) -u \(self.rootUsername) -p\(self.rootPassword?.stringByReplacing(string: "\"", withString: "\\\"") ?? "") > \(backupFileData.path)")
                let resultData = commandData.runError()
                if (resultData == nil || resultData!.stringByReplacing(string: "mysqldump: [Warning] Using a password on the command line interface can be insecure.", withString: "").trimmingCharacters(in: .whitespacesAndNewlines) != "") {
                    let message = "Failed to create Data Backup \(resultData as Any)"
                    Log.critical(message: "[DBController] " + message)
                    fatalError(message)
                }
                */
            }
            
            console.log("[DBController] Migrating...");

            var migrateSQL: String
            let sqlFile = fs.openSync(`${this.migrationsRoot}${path.sep}${fromVersion + 1}.sql`, fs.constants.F_OK);
            /*
            do {
                try sqlFile.open(.read)
                try migrateSQL = sqlFile.readString()
                sqlFile.close()
            } catch {
                sqlFile.close()
                let message = "Migration failed: (\(error.localizedDescription))"
                Log.critical(message: "[DBController] " + message)
                fatalError(message)
            }
            
            for sql in migrateSQL.split(separator: ";") {
                let sql = sql.replacingOccurrences(of: "&semi", with: ";").trimmingCharacters(in: .whitespacesAndNewlines)
                if sql != "" {
                    guard mysql.query(statement: sql) else {
                        let message = "Migration Failed: (\(mysql.errorMessage()))"
                        Log.critical(message: "[DBController] " + message)
                        if ProcessInfo.processInfo.environment["NO_BACKUP"] == nil {
                            for i in 0...10 {
                                Log.info(message: "[DBController] Rolling back migration in \(10 - i) seconds")
                                Threading.sleep(seconds: 1)
                            }
                            Log.info(message: "[DBController] Rolling back migration now. Do not kill RDM!")
                            rollback(backupFileSchema: backupFileSchema, backupFileTrigger: backupFileTrigger, backupFileData: backupFileData)
                        }
                        fatalError(message)
                    }
                }
            }

            while mysql.moreResults() {
                _ = mysql.nextResult()
            }
            
            let updateVersionSQL: string = `
                INSERT INTO metadata (\`key\`, \`value\`)
                VALUES("DB_VERSION", \(fromVersion + 1))
                ON DUPLICATE KEY UPDATE \`value\` = \(fromVersion + 1);
            `;            
            guard mysql.query(statement: updateVersionSQL) else {
                let message: string = "Migration Failed: (\(mysql.errorMessage()))";
                console.error("[DBController] ", message);
                fatalError(message);
            }
            
            console.log("[DBController] Migration successful");
            this.migrate(fromVersion + 1, toVersion);
            */
        }
    }
    rollback(backupFileSchema: string, backupFileTrigger: string, backupFileData: string) {

    }
}

export { DbController };