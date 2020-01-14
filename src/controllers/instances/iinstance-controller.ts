"use strict"

interface IInstanceController {
    getTask(uuid: string, username: string): any;
    reload(): void;
    stop() : void;
}

export { IInstanceController };