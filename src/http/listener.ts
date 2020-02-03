"use strict";

import { Server } from 'http';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { WebhookHandler } from './parser';
import { logger } from '../utils/logger';

const app = express();
const webhook     = new WebhookHandler();

class WebhookListener {
    private listener: Server;
    private port: number;

    constructor(port: number) {
        this.port = port;

        // Middleware
        //app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
        app.use(bodyParser.json({ limit: '50mb' })); // for parsing application/x-www-form-urlencoded

        // Routes
        app.post('/raw', (req, res) => webhook.handleRawData(req, res));
        app.post('/controler', (req, res) => webhook.handleControllerData(req, res));
        app.post('/controller', (req, res) => webhook.handleControllerData(req, res));
    }
    start() {
        // Start listener
        this.listener = app.listen(this.port, () => logger.info(`[HTTP] Listening on webhook port ${this.port}.`));
    }
    stop() {
        logger.info("[HTTP] Stopping all webhook listeners.")
        // Stop listener
        this.listener.removeAllListeners();
    }
}

export { WebhookListener };