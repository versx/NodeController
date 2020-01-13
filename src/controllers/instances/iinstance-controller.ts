"use strict"

interface IInstanceController {
    getTask(uuid: string, username: string);
    reload();
    stop();
}

export { IInstanceController };