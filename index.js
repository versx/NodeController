/**
 * Author: versx
 * Date: January 4th 2020
 * Version: 0.0.3
 */

const express       = require('express');
const bodyParser    = require('body-parser');
//const fs            = require('fs');
const config        = require('./config.json');
const app           = express();

//const deviceManager = require('./models/device.js');
const webhookManager = require('./models/webhook.js');

const webhook = new webhookManager();

app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));

// Routes
/*
app.get('/devices', function(req, res) {
    res.send(JSON.stringify(new deviceManager().getDevices(), null, 2));
});
*/
app.post('/raw', (req, res) => webhook.handleRawData(req, res));
app.post('/controller', (req, res) => webhook.handleControllerData(req, res));

// Start listener
app.listen(config.port, () => console.log(`Listening on port ${config.port}.`));