"use strict"

/**
 * Database controller class.
 */
class DbController {
    static instance = new DbController();

    private multiStatement: boolean = false;
    private asRoot: boolean = false;

    constructor() {

    }
}

export { DbController };