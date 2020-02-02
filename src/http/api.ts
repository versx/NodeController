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
        app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // for parsing application/x-www-form-urlencoded

        // Routes
        app.get('/', async (req, res) => {
            res.send(await api.getPage(Page.dashboard, req, res));
        });
        // Accounts
        app.get('/accounts', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccounts, req, res));
        });
        app.get('/accounts/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccountsAdd, req, res));
        });
        app.post('/accounts/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAccountsAdd, req, res));
        });
        // Devices
        app.get('/devices',  async (req, res) => {
            res.send(await api.getPage(Page.dashboardDevices, req, res));
        });
        app.get('/device/assign/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceAssign, req, res));
        });
        app.post('/device/assign/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceAssign, req, res));
        });
        // Instances
        app.get('/instances', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstances, req, res));
        });
        app.get('/instance/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstanceAdd, req, res));
        });
        app.post('/instance/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstanceAdd, req, res));
        });
        app.get('/instance/edit/:instance_name', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstanceEdit, req, res));
        });
        app.post('/instance/edit/:instance_name', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstanceEdit, req, res));
        });
        app.get('/instance/ivqueue/:instance_name', async (req, res) => {
            res.send(await api.getPage(Page.dashboardInstanceIVQueue, req, res));
        });
        // Assignments
        app.get('/assignments', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignments, req, res));
        });
        app.get('/assignment/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentAdd, req, res));
        });
        app.post('/assignment/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentAdd, req, res));
        });
        app.get('/assignment/start/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentStart, req, res));
        });
        app.get('/assignment/edit/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentEdit, req, res));
        });
        app.post('/assignment/edit/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentEdit, req, res));
        });
        app.get('/assignment/delete/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentDelete, req, res));
        });
        app.post('/assignment/delete/:uuid', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentDelete, req, res));
        });
        app.get('/assignment/delete_all', async (req, res) => {
            res.send(await api.getPage(Page.dashboardAssignmentsDeleteAll, req, res));
        });
        // Device Groups
        app.get('/devicegroups', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroups, req, res));
        });
        app.get('/devicegroup/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroupAdd, req, res));
        });
        app.post('/devicegroup/add', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroupAdd, req, res));
        });
        app.get('/devicegroup/edit/:name', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroupEdit, req, res));
        });
        app.post('/devicegroup/edit/:name', async (req, res) => {
            res.send(await api.getPage(Page.dashboardDeviceGroupEdit, req, res));
        });
        // Clear Quests
        app.route('/clearquests')
            .get(async (req, res) => {
                res.send(await api.getPage(Page.dashboardClearQuests, req, res));
            })
            .post(async (req, res) => {
                res.send(await api.getPage(Page.dashboardClearQuests, req, res));
            });
        // Settings
        app.route('/settings')
            .get(async (req, res) => {
                res.send(await api.getPage(Page.dashboardSettings, req, res));
            })
            .post(async (req, res) => {
                res.send(await api.getPage(Page.dashboardSettings, req, res));
            })
        /*
        app.get('/settings', async (req, res) => {
            res.send(await api.getPage(Page.dashboardSettings, req, res));
        });
        app.post('/settings', async (req, res) => {
            res.send(await api.getPage(Page.dashboardSettings, req, res));
        });
        */
        // API
        app.get('/api/get_data', async (req, res) => {
            res.send(await api.handle(req, res));
        });
        // TODO: Stats API
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