/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.8.3
 */

"use strict";

import { AccountController } from './controllers/account-controller';
import { AssignmentController } from './controllers/assignment-controller';
import { DbController } from './controllers/db-controller';
import { InstanceController } from './controllers/instances/instance-controller';
import { WebhookController } from './controllers/webhook-controller';
import { ApiListener } from './http/api';
import { WebhookListener } from './http/listener';
import { Localizer } from './utils/localizer';
import { logger } from './utils/logger';
import config     = require('./config.json');

logger.info('Starting up...');

// Setup controllers
DbController.instance.setup();
Localizer.instance.load();
InstanceController.instance.setup();
AccountController.instance.setup();
AssignmentController.instance.setup();
WebhookController.instance.setup();

// Start webhook listener
let webhook = new WebhookListener(config.ports.webhook);
webhook.start();

// Start API listener
let api = new ApiListener(config.ports.api);
api.start();

logger.info('Initialized.');