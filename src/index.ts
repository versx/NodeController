/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.0.4
 */

"use strict"

import { AccountController } from './controllers/account-controller.js';
import { AssignmentController } from './controllers/assignment-controller.js';
import { InstanceController } from './controllers/instance-controller.js';
import { Webhook } from './http/webhook';
import express    = require('express');
import bodyParser = require('body-parser');
import config     = require('./config.json');
const app         = express();
const webhook    = new Webhook();

// Setup controllers
AccountController.setup();
AssignmentController.setup();
InstanceController.setup();

// Middleware
app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));

// Routes
app.post('/raw', (req, res) => webhook.handleRawData(req, res));
app.post('/controller', (req, res) => webhook.handleControllerData(req, res));

// Start listener
app.listen(config.port, () => console.log(`Listening on port ${config.port}.`));

// TODO: Implement webhooks