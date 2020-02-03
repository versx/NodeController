"use strict";

import { ICache } from './icache';
import { RedisClient } from './redis-client';

const ACCOUNT_LIST = 'ACCOUNT_LIST';
const POKESTOP_LIST = 'POKESTOP_LIST';
const GYM_LIST = 'GYM_LIST';
const CELL_LIST = 'CELL_LIST';

class Cache implements ICache {
    static instance = new Cache();

    async get<T>(id: string, key: string): Promise<T> {
        return await RedisClient.instance.hget<T>(id, key);
    }
    async set(id: string, key: string, data: any): Promise<boolean> {
        let json = JSON.stringify(data, null, 2);
        return await RedisClient.instance.hset(id, key, json);
    }
    async load<T>(): Promise<T> {
        return null;
        //return await RedisClient.instance.hgetall(DEVICE_LIST);
        // TODO: Load from mysql and set redis cache
    }
}

export { Cache, ACCOUNT_LIST, POKESTOP_LIST, GYM_LIST, CELL_LIST };