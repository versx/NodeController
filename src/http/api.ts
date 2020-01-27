"use strict"

import { Server } from 'http';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { ApiController, Page } from '../controllers/api-controller';

const app = express();
const api = new ApiController();

class ApiListener {
    private listener: Server;
    private port: number;

    constructor(port: number) {
        this.port = port;

        // Middleware
        app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

        // Routes
        app.get('/', async (req, res) => {
            res.send(await api.getPage(Page.dashboard, req, res));
        });
        app.get('/accounts', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccounts, req, res));
        });
        app.get('/accounts/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccountsAdd, req, res));
        });
        app.post('/accounts/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccountsAdd, req, res));
        });
        app.get('/devices',  async (req, res) => {
            res.send(await api.getPage(Page.dashboardDevices, req, res));
        });
        app.get('/device/assign/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceAssign, req, res));
        });
        app.post('/device/assign/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceAssign, req, res));
        });
        app.get('/instances', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstances, req, res));
        });
        app.get('/assignments', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignments, req, res));
        });
        app.get('/assignments', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignments, req, res));
        });
        app.get('/devicegroups', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroups, req, res));
        });
        app.get('/groups', async (req, res) => {
            res.send(await api.getPage(Page.dashboardGroups, req, res));
        });
        app.get('/users', async (req, res) => {
            res.send(await api.getPage(Page.dashboardUsers, req, res));
        });
        app.get('/discordrules', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDiscordRules, req, res));
        });  
        app.get('/settings', async (req, res) => {
            res.send(await api.getPage(Page.dashboardSettings, req, res));
        });
        app.post('/settings', async (req, res) => {
            res.send(await api.getPage(Page.dashboardSettings, req, res));
        });
        app.get('/api/get_data', async (req, res) => {
            res.send(await api.handle(req, res));
        });
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

export { ApiListener };