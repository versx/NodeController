/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.0.4
 */

"use strict"

import { AccountController } from './controllers/account-controller';
import { AssignmentController } from './controllers/assignment-controller';
import { InstanceController } from './controllers/instance-controller';
import { WebhookListener } from './http/listener';
import config     = require('./config.json');

// Setup controllers
AccountController.setup();
AssignmentController.setup();
InstanceController.setup();

// Start listener
var listener    = new WebhookListener(config.port);
listener.start();

// TODO: Implement webhooks