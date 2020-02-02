"use strict"

interface IInstanceController {
    getTask(uuid: string, username: string, startup: boolean): any;
    reload(): void;
    stop() : void;
}

export { IInstanceController };