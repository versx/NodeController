"use strict"

import mysql  = require('mysql');

class Database {
    private pool;

    constructor(config: any) {
        this.pool = mysql.createPool({
            host       : config.db.host,
            port       : config.db.port,
            user       : config.db.username,
            password   : config.db.password,
            database   : config.db.database,
            connectionLimit: config.db.connectionLimit
        });
        this.pool.getConnection((err, connection) => {
            if (err) {
                switch (err.code) {
                    case 'PROTOCOL_CONNECTION_LOST':
                        console.error('[MYSQL] Database connection was closed.');
                        break;
                    case 'ER_CON_COUNT_ERROR':
                        console.error('[MYSQL] Database has too many connections.');
                        break;
                    case 'ECONNREFUSED':
                        console.error('[MYSQL] Database connection was refused.');
                        break;
                }
            }
            if (connection) {
                connection.release();
            }
            return;
        });
    }
    query(sql: string, args?: any) {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, args, (err, rows) => {
                if (err)
                    return reject( err );
                resolve(rows);
            });
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            this.pool.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}

export { /*pool,*/ Database };