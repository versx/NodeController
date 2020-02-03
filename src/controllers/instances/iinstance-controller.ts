"use strict";

/**
 * 
 */
interface IInstanceController {
    /**
     * 
     * @param uuid 
     * @param username 
     * @param startup 
     */
    getTask(uuid: string, username: string, startup: boolean): any;
    /**
     * 
     */
    reload(): void;
    /**
     * 
     */
    stop() : void;
}

export { IInstanceController };