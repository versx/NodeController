"use strict";

// Imports
import * as redis from 'redis';
import { logger } from '../utils/logger';
import config = require('../config.json');

class RedisClient {
    static instance = new RedisClient();

    private client: redis.RedisClient;

    constructor() {
        this.client = redis.createClient({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password || undefined
        });
        this.client.on('connect', function() {
            logger.info('[Redis] Redis client connected');
        });
        this.client.on('error', function(err: Error) {
            logger.error('[Redis] Error occurred: ' + err)
        });
    }
    async hgetall(key: string): Promise<any> {
        // TODO: Check if connected.
        return new Promise((resolve, reject) => {
            this.client.hgetall(key, (err, reply) => {
                if (err)
                    return reject( err );
                resolve(reply);
            });
        });
    }
    async hget<T>(id: string, key: string): Promise<T> {
        // TODO: Check if connected.
        return new Promise((resolve, reject) => {
            this.client.hget(id, key, (err, reply) => {
                if (err)
                    return reject( err );
                resolve(<T>JSON.parse(reply));
            });
        });
    }
    async hgetString(id: string, key: string): Promise<string> {
        // TODO: Check if connected.
        return new Promise((resolve, reject) => {
            this.client.hget(id, key, (err, reply) => {
                if (err)
                    return reject( err );
                resolve(reply);
            });
        });
    }
    async hset(id: string, key: string, data: any): Promise<boolean> {
        // TODO: Check if connected.
        return new Promise((resolve, reject) => {
            if (data) {
                let json = JSON.stringify(data, null, 2);
                if (!this.client.hset(id, key, json)) {
                    return reject( false );
                }
                resolve(true);
            }
            resolve(false);
        });
    }
}

// Export class.
export { RedisClient };