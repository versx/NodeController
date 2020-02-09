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
     * @param id 
     */
    //load<T>(id: string): Promise<T[]>;
}

export { ICache };