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
import { Device } from './models/device';

// Setup controllers
AccountController.instance.setup();
AssignmentController.instance.setup();
InstanceController.instance.setup();

// Start listener
let listener    = new WebhookListener(config.port);
listener.start();

// TODO: Implement webhooks

let a = Device.getById("iPhoneSGV17SE");
console.log("Device:", a);