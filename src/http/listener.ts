"use strict"

import { WebhookHandler } from './parser';
import { Server } from 'http';
import * as express from 'express';
import * as bodyParser from 'body-parser';
const app = express();
const webhook     = new WebhookHandler();

class WebhookListener {
    listener: Server;
    port: number;

    constructor(port: number) {
        this.port = port;

        // Middleware
        app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));

        // Routes
        app.post('/raw', (req, res) => webhook.handleRawData(req, res));
        app.post('/controller', (req, res) => webhook.handleControllerData(req, res));
    }
    start() {
        // Start listener
        this.listener = app.listen(this.port, () => console.log(`[HTTP] Listening on port ${this.port}.`));
    }
    stop() {
        console.log("[HTTP] Stopping all listeners.")
        // Stop listener
        this.listener.removeAllListeners();
    }
}

export { WebhookListener };