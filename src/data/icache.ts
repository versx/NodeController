"use strict";

/**
 * ICache interface.
 */
interface ICache {
    /**
     * 
     * @param id 
     * @param key 
     */
    get<T>(id: string, key: string): Promise<T>;
    /**
     * 
     * @param id 
     * @param key 
     * @param data 
     */
    set(id: string, key: string, data: any): Promise<boolean>;
    /**
     * 
     */
    load<T>(): Promise<T>;
}

export { ICache };