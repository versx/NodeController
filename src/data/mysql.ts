"use strict";

import * as mysql from 'mysql';
import { logger } from '../utils/logger';

class Database {
    private pool: mysql.Pool;

    constructor(config: any) {
        this.pool = mysql.createPool({
            host       : config.db.host,
            port       : config.db.port,
            user       : config.db.username,
            password   : config.db.password,
            database   : config.db.database,
            charset    : config.db.charset,
            debug      : config.db.debug,
            connectionLimit: config.db.connectionLimit
        });
        this.pool.getConnection((err, connection) => {
            if (err) {
                switch (err.code) {
                    case 'PROTOCOL_CONNECTION_LOST':
                        logger.error('[MYSQL] Database connection was closed.');
                        break;
                    case 'ER_CON_COUNT_ERROR':
                        logger.error('[MYSQL] Database has too many connections.');
                        break;
                    case 'ECONNREFUSED':
                        logger.error('[MYSQL] Database connection was refused.');
                        break;
                }
            } else {
                logger.info(`[MYSQL] Connected to MySql host ${config.db.host}:${config.db.port}`);
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

export { Database };