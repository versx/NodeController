/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.0.4
 */

"use strict"

import { AccountController } from './controllers/account-controller';
import { AssignmentController } from './controllers/assignment-controller';
import { DbController } from './controllers/db-controller';
import { InstanceController } from './controllers/instances/instance-controller';
import { WebhookController } from './controllers/webhook-controller';
import { WebhookListener } from './http/listener';
import config     = require('./config.json');

// Setup controllers
//DbController.instance.setup();
InstanceController.instance.setup();
AccountController.instance.setup();
AssignmentController.instance.setup();
WebhookController.instance.setup();

// Start listener
let listener = new WebhookListener(config.port);
listener.start();