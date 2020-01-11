/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.0.4
 */

const express    = require('express');
const bodyParser = require('body-parser');
import config = require('./config.json');
const app        = express();
const Webhook    = require('./http/webhook.js');

const webhook    = new Webhook();

// Middleware
app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));

// Routes
app.post('/raw', (req, res) => webhook.handleRawData(req, res));
app.post('/controller', (req, res) => webhook.handleControllerData(req, res));

// Start listener
app.listen(config.port, () => console.log(`Listening on port ${config.port}.`));