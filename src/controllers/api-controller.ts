"use strict";

import * as path from 'path';
import * as mustache from 'mustache';
import * as express from 'express';
import * as moment from 'moment';

import { Coord } from '../coord';
import { DbController } from './db-controller';
import { InstanceController } from './instances/instance-controller';
import { AssignmentController } from './assignment-controller';
import { Account } from '../models/account';
import { Assignment } from '../models/assignment';
import { Device } from '../models/device';
import { DeviceGroup } from '../models/device-group';
import { Instance, InstanceType, IInstanceData } from '../models/instance';
import { Pokestop } from '../models/pokestop';
import { Localizer } from '../utils/localizer';
import { logger } from '../utils/logger';
import { readFile, getCurrentTimestamp, toThreeDigits } from '../utils/util';

enum Page {
    setup = "setup.mustache",
    login = "login.mustache",
    register = "register.mustache",
    logout = "logout.mustache",
    profile = "profile.mustache",
    dashboard = "dashboard.mustache",
    dashboardSettings = "dashboard_settings.mustache",
    dashboardDevices = "dashboard_devices.mustache",
    dashboardDeviceAssign = "dashboard_device_assign.mustache",
    dashboardInstances = "dashboard_instances.mustache",
    dashboardInstanceAdd = "dashboard_instance_add.mustache",
    dashboardInstanceEdit = "dashboard_instance_edit.mustache",
    dashboardInstanceIVQueue = "dashboard_instance_ivqueue.mustache",
    dashboardDeviceGroups = "dashboard_devicegroups.mustache",
    dashboardDeviceGroupAdd = "dashboard_devicegroup_add.mustache",
    dashboardDeviceGroupEdit = "dashboard_devicegroup_edit.mustache",
    dashboardAccounts = "dashboard_accounts.mustache",
    dashboardAccountsAdd = "dashboard_accounts_add.mustache",
    dashboardClearQuests = "dashboard_clearquests.mustache",
    dashboardAssignments = "dashboard_assignments.mustache",
    dashboardAssignmentAdd = "dashboard_assignment_add.mustache",
    dashboardAssignmentEdit = "dashboard_assignment_edit.mustache",
    dashboardAssignmentStart = "dashboard_assignment_start.mustache",
    dashboardAssignmentDelete = "dashboard_assignment_delete.mustache",
    dashboardAssignmentsDeleteAll = "dashboard_assignments_delete_all.mustache",
    unauthorized = "unauthorized.mustache"
}

class ApiController {
    private webroot: string = path.resolve('./webroot/');
    static hostWhitelist: string[];
    static hostWhitelistUsesProxy: boolean = false;
    static loginSecret: string;

    constructor() {
    }
    async handle(req: express.Request, res: express.Response) {
        if (this.checkHost(req, res) === false) {
            res.sendStatus(401);
            return;
        }

        let data: any = {};
        let instance = req.param("instance");
        //let lastUpdate = parseInt(req.param("last_update", 0));
        let showDevices =  req.param("show_devices", false);
        let showInstances =  req.param("show_instances", false);
        let showDeviceGroups = req.param("show_devicegroups", false);
        let showAssignments = req.param("show_assignments", false);
        let showIVQueue = req.param("show_ivqueue", false);
        let formatted =  req.param("formatted", false);

        // TODO: Security

        if (showDevices) {
            let devices = await Device.load();
            let jsonArray = [];
            if (devices) {
                for (let i = 0; i < devices.length; i++) {
                    let device = devices[i];
                    let deviceData = {};
                    deviceData["uuid"] = device.uuid;
                    deviceData["host"] = device.lastHost || "";
                    deviceData["instance"] = device.instanceName || "";
                    deviceData["username"] = device.accountUsername || "";
                    if (formatted) {
                        let formattedDate: string;
                        if (device.lastSeen === 0) {
                            formattedDate = "";
                        } else {
                            let date = moment(device.lastSeen * 1000).format("HH:mm:ss DD.MM.YYYY");
                            formattedDate = date;
                        }
                        deviceData["last_seen"] = { "timestamp": device.lastSeen, "formatted": formattedDate };
                        deviceData["buttons"] = `<a href="/device/assign/${encodeURI(device.uuid)}" role="button" class="btn btn-primary">Assign Instance</a>`;
                    } else {
                        deviceData["last_seen"] = device.lastSeen;
                    }
                    jsonArray.push(deviceData);
                }
            }
            data["devices"] = jsonArray;
        }
        if (showInstances) {
            let instances = await Instance.getAll();
            let devices = await Device.load() || [];
            let jsonArray = [];
            if (instances) {
                for (let i = 0; i < instances.length; i++) {
                    let instance = instances[i];
                    let instanceData = {};
                    instanceData["name"] = instance.name;
                    let count = devices
                        .filter(device => device.instanceName === instance.name)
                        .length;
                    instanceData["count"] = count || 0;
                    let type = "";
                    switch (instance.type) {
                        case InstanceType.AutoQuest:       type = "Auto Quest"; break;
                        case InstanceType.CirclePokemon:   type = "Circle Pokemon"; break;
                        case InstanceType.CircleRaid:      type = "Circle Raid"; break;
                        case InstanceType.GatherToken:     type = "Gather Token"; break;
                        case InstanceType.Leveling:        type = "Leveling"; break;
                        case InstanceType.PokemonIV:       type = "Pokemon IV"; break;
                        case InstanceType.SmartCircleRaid: type = "Smart Circle Raid"; break;
                    }
                    instanceData["type"] = type;
                    if (formatted) {
                        let status = await InstanceController.instance.getInstanceStatus(instance, true);
                        instanceData["status"] = status ? status.toString() : "?";
                    } else {
                        instanceData["status"] = await InstanceController.instance.getInstanceStatus(instance, false);
                    }

                    if (formatted) {
                        instanceData["buttons"] = `<a href="/instance/edit/${encodeURI(instance.name)}" role="button" class="btn btn-primary">Edit Instance</a>`;
                    }
                    jsonArray.push(instanceData);
                }
            }
            data["instances"] = jsonArray;
        }
        if (showAssignments) {
            let assignments = await Assignment.getAll();
            let jsonArray = [];
            if (assignments) {
                for (let i = 0; i < assignments.length; i++) {
                    let assignment = assignments[i];
                    let assignmentData = {};
                    assignmentData["instance_name"] = assignment.instanceName;
                    assignmentData["device_uuid"] = assignment.deviceUUID;
                    if (formatted) {
                        let formattedTime: string;
                        if (assignment.time === 0) {
                            formattedTime = "On Complete";
                        } else {
                            let times = moment(assignment.time * 1000).format('hh:mm:ss');
                            formattedTime = times;
                        }
                        assignmentData["time"] = { "timestamp": assignment.time, "formatted": formattedTime };
                        let instanceUUID = `${escape(assignment.instanceName)}-${escape(assignment.deviceUUID)}-${assignment.time}`;
                        assignmentData["buttons"] = `
                        <div class="btn-group" role="group">
                            <a href="/assignment/start/${encodeURI(instanceUUID)}" role="button" class="btn btn-success">Start</a>
                            <a href="/assignment/edit/${encodeURI(instanceUUID)}" role="button" class="btn btn-primary">Edit</a>
                            <a href="/assignment/delete/${encodeURI(instanceUUID)}" role="button" class="btn btn-danger">Delete</a>
                        </div>`;
                    } else {
                        assignmentData["time"] = assignment.time;
                    }
                    assignmentData["enabled"] = assignment.enabled ? "Yes" : "No";
                    jsonArray.push(assignmentData);
                }
            }
            data["assignments"] = jsonArray;
        }
        if (showDeviceGroups) {
            let deviceGroups = await DeviceGroup.getAll();
            let jsonArray = [];
            if (deviceGroups) {
                for (let i = 0; i < deviceGroups.length; i++) {
                    let deviceGroup = deviceGroups[i];
                    let deviceGroupData = {};
                    deviceGroupData["name"] = deviceGroup.name;
                    deviceGroupData["instance"] = deviceGroup.instanceName;
                    deviceGroupData["devices"] = deviceGroup.count;
                    if (formatted) {
                        deviceGroupData["buttons"] =
                            `<a href="/devicegroup/edit/${encodeURI(deviceGroup.name)}" role="button" class="btn btn-primary">Edit Device Group</a>`;
                    }
                    jsonArray.push(deviceGroupData);
                }
            }
            data["devicegroups"] = jsonArray;
        }
        if (showIVQueue) {
            let jsonArray = [];
            let queue = InstanceController.instance.getIVQueue(decodeURI(instance) || "");
            if (queue) {
                for (let i = 0; i < queue.length; i++) {
                    let pokemon = queue[i];
                    let json = {
                        id: (i + 1),
                        pokemon_id: toThreeDigits(pokemon.pokemonId),
                        pokemon_name: Localizer.instance.get(`poke_${pokemon.pokemonId}`),
                        pokemon_spawn_id: pokemon.id,
                        location: `${pokemon.lat}, ${pokemon.lon}`
                    };
                    if (formatted) {
                        // TODO: Set pokemon image url (optional)
                        json["pokemon_image"] = `<img src="/static/img/pokemon/${pokemon.pokemonId}.png" style="height:50px; width:50px;">`;
                    }
                    jsonArray.push(json);
                }
            }
            data["ivqueue"] = jsonArray;
        }
        data["timestamp"] = getCurrentTimestamp();
        return {
            title: DbController.Title,
            data: data
        };
    }
    async getPage(page: Page, req: express.Request, res: express.Response) {
        if (this.checkHost(req, res) === false) {
            res.sendStatus(401);
            return;
        }

        res.setHeader("AllowHeaders", "*");
        res.setHeader("AllowMethods", "GET");
        let host = req.header("Host");
        if (host) {
            res.setHeader("AllowOrigin", `http://${host}}`); //"http://\(host), https://\(host)"
        }
        var data = {
            title: DbController.Title || "NodeController",
            locale: Localizer.instance.locale,
            page: "Dashboard"
        };
        data["locale"] = Localizer.instance.locale;
        data["show_dashboard"] = true;
        data["is_logged_in"] = true;
        let navLoc = ["nav_dashboard", "nav_areas", "nav_stats", "nav_logout", "nav_register", "nav_login"]
        navLoc.forEach(nav => {
            data[nav] = Localizer.instance.get(nav);
        });

        switch (page) {
            case Page.dashboard:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard";
                break;
            case Page.dashboardDevices:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Devices";
                break;
            case Page.dashboardDeviceAssign:
                data["page_is_dashboard"] = true
                data["page"] = "Dashboard - Assign Device"
                let deviceUUID = req.param("uuid") || "";
                data["device_uuid"] = deviceUUID;
                if (req.method === "POST") {
                    try {
                        data = await this.assignDevicePost(data, req, res, deviceUUID);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data = await this.assignDeviceGet(data, req, res, deviceUUID);
                    } catch {
                        return;
                    }
                }
                break;
            case Page.dashboardInstances:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Instances";
                break;
            case Page.dashboardInstanceAdd:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Add Instance";
                if (req.method === "POST") {
                    try {
                        data = await this.addInstancePost(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    data["min_level"] = 0;
                    data["max_level"] = 29;
                    data["timezone_offset"] = 0;
                    data["iv_queue_limit"] = 100;
                    data["spin_limit"] = 500;
                    data["nothing_selected"] = true;
                }
                break;
            case Page.dashboardInstanceEdit:
                let instanceName: string = decodeURI(req.param("instance_name") || "");
                data["page_is_dashboard"] = true;
                data["old_name"] = instanceName;
                data["page"] = "Dashboard - Edit Instance";
                if (req.param("delete") === "true") {
                    try {
                        await Instance.delete(instanceName);
                        let instance = InstanceController.instance.getInstanceControllerByInstanceName(instanceName);
                        InstanceController.instance.removeInstance(instance); // REVIEW: Make sure this works.
                        res.redirect('/instances');
                        return;
                    } catch {
                        res.send("Internal Server Error");
                        return;
                    }
                } else if (req.param("clear_quests") === "true") {
                    try {
                        let instance = await Instance.getByName(instanceName);
                        if (instance.type === InstanceType.AutoQuest) {
                            await Pokestop.clearQuestsByInstance(instance);
                        }
                        res.redirect('/instances');
                        return;
                    } catch {
                        res.send("Internal Server Error");
                        return;
                    }
                } else if (req.method === "POST") {
                    try {
                        data = await this.addInstancePost(data, req, res, instanceName);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data = await this.editInstanceGet(data, req, res, instanceName);
                    } catch {
                        return;
                    }
                }
                break;
            case Page.dashboardInstanceIVQueue:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - IV Queue";
                let ivInstanceName = req.param("instance_name") || "";
                data["instance_name_url"] = ivInstanceName;
                data["instance_name"] = decodeURI(ivInstanceName);
                break;
            case Page.dashboardAssignments:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Assignments";
                break;
            case Page.dashboardAssignmentAdd:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Add Assignment";
                if (req.method === "POST") {
                    try {
                        data = await this.addAssignmentPost(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data = await this.addAssignmentGet(data, req, res);
                    } catch {
                        return;
                    }
                }
                break;
            case Page.dashboardAssignmentStart:
                let uuid = unescape(req.param("uuid") || "");
                let split = uuid.split("\\-");
                if (split.length >= 2) {
                    let instanceName = unescape(split[0]);
                    let deviceUUID = unescape(split[1]);
                    let device: Device;
                    try {
                        let deviceGuard = await Device.getById(deviceUUID);
                        if (deviceGuard === undefined || deviceGuard === null) {
                            res.send("Internal Server Error");
                            return data;
                        }
                        device = deviceGuard;
                    } catch {
                        res.send("Internal Server Error");
                        return data;
                    }
                    device.instanceName = instanceName;
                    device.save(device.uuid);
                    InstanceController.instance.reloadDevice(device, deviceUUID);
                    res.redirect('/assignments');
                }
                break;
            case Page.dashboardAssignmentEdit:
                let uuid2 = decodeURI(req.param("uuid") || "");
                let tmp2 = uuid2.replace("-", "&tmp");
                data["page_is_dashboard"] = true;
                data["old_name"] = uuid2;
                data["page"] = "Dashboard - Edit Assignment";
                if (req.method === "POST") {
                    try {
                        data = await this.editAssignmentPost(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data = await this.editAssignmentGet(data, req, res, tmp2);
                    } catch {
                        return;
                    } 
                }
                break;
            case Page.dashboardAssignmentDelete:
                data["page_is_dashboard"] = true
                data["page"] = "Dashboard - Delete Assignment"
                let uuid3 = decodeURI(req.param("uuid") || "");
                let tmp3 = uuid3.replace("\\\\-", "&tmp");
                let assignmentSplit = tmp3.split("-");
                if (assignmentSplit.length === 3) {
                    let instanceName = unescape(assignmentSplit[0].replace("&tmp", "\\\\-"));
                    let deviceUUID = unescape(assignmentSplit[1].replace("&tmp", "\\\\-"));
                    let time = parseInt(assignmentSplit[2]) || 0;
                    let assignment = new Assignment(instanceName, deviceUUID, time, false);
                    try {
                        await assignment.delete();
                    } catch {
                        res.send("Internal Server Error");
                        return data;
                    }
                    AssignmentController.instance.deleteAssignment(assignment);
                    res.redirect('/assignments');
                } else {
                    res.send("Bad Request");
                }
                break;
            case Page.dashboardAssignmentsDeleteAll:
                data["page_is_dashboard"] = true;
                try {
                    await Assignment.deleteAll();
                } catch {
                    res.send("Internal Server Error");
                }
                res.redirect('/assignments');
                break;
            case Page.dashboardDeviceGroups:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Device Groups";
                break;
            case Page.dashboardDeviceGroupAdd:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Add Device Group";
                if (req.method === "POST") {
                    try {
                        data = await this.addDeviceGroupPost(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data["nothing_selected"] = true;
                        data = await this.addDeviceGroupGet(data, req, res);
                    } catch {
                        return;
                    }
                }    
                break;
            case Page.dashboardDeviceGroupEdit:
                let deviceGroupName = decodeURI(req.param("name") || "");
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Edit Device Group";
                data["old_name"] = deviceGroupName;
                if (req.param("delete") === "true") {
                    try {
                        await DeviceGroup.delete(deviceGroupName);
                        res.redirect('/devicegroups');
                        return;
                    } catch {
                        res.send("Internal Server Error");
                        return;
                    }
                    
                } else if (req.method === "POST") {
                    try {
                        data = await this.editDeviceGroupPost(data, req, res, deviceGroupName);
                    } catch {
                        return
                    }
                } else {
                    try {
                        data = await this.editDeviceGroupGet(data, req, res, deviceGroupName);
                    } catch {
                        return
                    }
                }    
                break;
            case Page.dashboardClearQuests:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Clear All Quests";
                if (req.method === "POST") {
                    try {
                        await Pokestop.clearQuests();
                        InstanceController.instance.reloadAllInstances();
                        res.redirect('/');
                        return
                    } catch (err) {
                        logger.error(err);
                        data["show_error"] = true;
                        data["error"] = "Failed to clear Quests. Please try again later.";
                    }
                }    
                break;
            case Page.dashboardAccounts:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Accounts";
                data["stats"] = await Account.getStats();
                break;
            case Page.dashboardAccountsAdd:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Add Accounts";
                if (req.method === "POST") {
                    try {
                        data = await this.addAccounts(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    data["level"] = 0;
                }
                break;
            case Page.dashboardSettings:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Settings";
                if (req.method === "POST") {
                    await this.updateSettings(req, res);
                    // TODO: show_success/show_error
                }
                data["max_pokemon_id"] = DbController.MaxPokemonId;
                data["locale_new"] = Localizer.instance.locale;
                data["enable_clearing"] = DbController.EnableClearing;
                data["webhook_urls"] = DbController.WebhookUrls;
                data["webhook_delay"] = DbController.WebhookSendDelay;
                data["pokemon_time_new"] = DbController.PokemonTimeUnseen;
                data["pokemon_time_old"] = DbController.PokemonTimeReseen;
                data["pokestop_lure_time"] = DbController.LureTime;
                data["ex_raid_boss_id"] = DbController.ExRaidBossId;
                data["ex_raid_boss_form"] = DbController.ExRaidBossForm;
                data["deviceapi_host_whitelist"] = DbController.HostWhitelist || "";
                data["deviceapi_host_whitelist_uses_proxy"] = DbController.HostWhitelistUsesProxy || "";
                data["deviceapi_secret"] = DbController.LoginSecret || "";
                data["ditto_disguises"] = DbController.DittoDisguises || [];
                break;
        }
        try {
            let html = readFile(path.join(this.webroot, page))
            let output = mustache.render(html, data, { 
                'header-head': readFile(path.join(this.webroot, "header-head.mustache")),
                'header': readFile(path.join(this.webroot, "header.mustache")), 
                'footer': readFile(path.join(this.webroot, "footer.mustache")), 
            });
            return output;
        } catch (err) {
            logger.error("[ApiController] Failed to get page: " + err);
        }
    }
    checkHost(req: express.Request, res: express.Response): boolean {
        let hostWhitelist = ApiController.hostWhitelist;
        if (hostWhitelist) {
            let host: string;
            let ff = req.header("X-Forwarded-For") || "";
            if (ff === '' || ff === undefined || ff === null || ApiController.hostWhitelistUsesProxy === false) {
                host = req.hostname;
            } else {
                host = ff;
            }

            if (hostWhitelist.includes(host) === false) {
                //return res.sendStatus(401);
                return false;
            }
        }
        
        let loginSecret = ApiController.loginSecret;
        if (loginSecret) {
            let host: string;
            let ff = req.header("X-Forwarded-For") || "";
            if (ff === '' || ff === undefined || ff === null || ApiController.hostWhitelistUsesProxy === false) {
                host = req.hostname;
            } else {
                host = ff;
            }
            
            //if (WebHookRequestHandler.limiter.allowed(host) === false) {
            //    return res.sendStatus(401);
            //}
            
            let loginSecretHeader = req.header("Authorization");
            if (loginSecretHeader !== `Bearer ${loginSecret}`) {
                //WebHookRequestHandler.limiter.failed(host);
                //return res.sendStatus(401);
                return false;
            }
        }

        return true;
    }
    async assignDeviceGet(data: any, req: express.Request, res: express.Response, deviceUUID: string): Promise<any> {
        var data = data;
        let instances: Instance[] = [];
        let device: Device;
        try {
            device = await Device.getById(deviceUUID);
            instances = await Instance.getAll();
        } catch {
            res.send("Internal Server Error");
            return;
        }
        if (device === undefined || device === null) {
            res.send("Device Not Found");
            return;
        }

        let instancesData = [];
        instances.forEach(instance => {
            instancesData.push({ 
                name: instance.name, 
                selected: instance.name === device.instanceName
            });
        });
        data["instances"] = instancesData;
        return data;
    }
    async assignDevicePost(data: any, req: express.Request, res: express.Response, deviceUUID: string): Promise<any> {
        var data = data;
        let instanceName: string = req.body["instance"];
        if (instanceName === undefined || instanceName === null) {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }
        let device: Device;
        let instances: Instance[] = [];
        try {
            device = await Device.getById(deviceUUID);
            instances = await Instance.getAll();
        } catch {
            data["show_error"] = true;
            data["error"] = "Failed to assign Device.";
            return data;
        }
        if (device === undefined || device === null) {
            res.send("Device Not Found");
            return data;
        }
        var instancesData = [];
        instances.forEach(instance => {
            instancesData.push({ 
                name: instance.name,
                selected: instance.name === instanceName
            });
        });
        data["instances"] = instancesData;

        try {
            device.instanceName = instanceName;
            device.save(device.uuid);
            InstanceController.instance.reloadDevice(device, deviceUUID);
        } catch {
            data["show_error"] = true;
            data["error"] = "Failed to assign Device.";
            return data;
        }
        res.redirect("/devices");
    }
    async addInstancePost(data: any, req: express.Request, res: express.Response, instanceName?: string): Promise<any> {
        var data = data;
        let name: string;
        let area: string;
        let minLevel: number;
        let maxLevel: number;
        try {
            name = req.param("name"),
            area = req.param("area")
                .replace("<br>", "\n")
                .replace("\r\n", "\n");//, options: .regularExpression),
            minLevel = parseInt(req.param("min_level")) || 0;
            maxLevel = parseInt(req.param("max_level")) || 29;
        } catch {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }

        let timezoneOffset = parseInt(req.param("timezone_offset") || "0" ) || 0;
        let pokemonIDsText = req.param("pokemon_ids")
                                    .split('<br>').join(',')
                                    .split('\n').join(',');
        let scatterPokemonIDsText = req.param('scatter_pokemon_ids')
                                    .split('<br>').join(',')
                                    .split('\n').join(',');

        let pokemonIDs: number[] = [];
        if (pokemonIDsText.trim() === "*") {
            pokemonIDs = Array.from({length: 999}, (v, k) => k + 1);
        } else {
            let pokemonIDsSplit = pokemonIDsText.split(',');
            if (pokemonIDsSplit) {
                pokemonIDs = pokemonIDsSplit.map((x: string) => {
                    let pokemonID = parseInt(x.trim());
                    if (Number.isInteger(pokemonID)) {
                        return pokemonID;
                    }
                });
            }
        }

        var scatterPokemonIDs: number[] = [];
        if (scatterPokemonIDsText.trim() === "*") {
            scatterPokemonIDs = Array.from({length: 999}, (v, k) => k + 1);
        } else {
            let scatterPokemonIDsSplit = scatterPokemonIDsText.split(',');
            if (scatterPokemonIDsSplit) {
                scatterPokemonIDs = scatterPokemonIDsSplit.map((x: string) => {
                    let pokemonID = parseInt(x.trim());
                    if (Number.isInteger(pokemonID)) {
                        return pokemonID;
                    }
                });
            }
        }

        let type: InstanceType = Instance.fromString(req.param("type") || "");
        let ivQueueLimit = parseInt(req.param("iv_queue_limit") || "100" ) || 100;
        let spinLimit = parseInt(req.param("spin_limit") || "500" ) || 500;

        data["name"] = name;
        data["area"] = area;
        data["pokemon_ids"] = pokemonIDsText;
        data["scatter_pokemon_ids"] = scatterPokemonIDsText;
        data["min_level"] = minLevel;
        data["max_level"] = maxLevel;
        data["timezone_offset"] = timezoneOffset;
        data["iv_queue_limit"] = ivQueueLimit;
        data["spin_limit"] = spinLimit;

        if (type === undefined || type === null) {
            data["nothing_selected"] = true;
        } else if (type === InstanceType.CirclePokemon.toString()) {
            data["circle_pokemon_selected"] = true;
        } else if (type === InstanceType.CircleRaid.toString()) {
            data["circle_raid_selected"] = true;
        } else if (type === InstanceType.SmartCircleRaid.toString()) {
            data["circle_smart_raid_selected"] = true;
        } else if (type === InstanceType.AutoQuest.toString()) {
            data["auto_quest_selected"] = true;
        } else if (type === InstanceType.PokemonIV.toString()) {
            data["pokemon_iv_selected"] = true;
        }

        if (type === InstanceType.PokemonIV && pokemonIDs.length === 0) {
            data["show_error"] = true;
            data["error"] = "Failed to parse Pokemon IDs.";
            return data;
        }

        if (minLevel > maxLevel || minLevel < 0 || minLevel > 40 || maxLevel < 0 || maxLevel > 40) {
            data["show_error"] = true;
            data["error"] = "Invalid Levels";
            return data;
        }

        let newCoords: any;
        if (type && type === InstanceType.CirclePokemon || type === InstanceType.CircleRaid || type === InstanceType.SmartCircleRaid) {
            var coords: Coord[] = [];
            let areaRows = area.split('\n');
            areaRows.forEach(areaRow => {
                let rowSplit = areaRow.split(',');
                if (rowSplit.length === 2) {
                    let lat = parseFloat(rowSplit[0].trim());
                    let lon = parseFloat(rowSplit[1].trim());
                    if (lat && lon) {
                        coords.push(new Coord(lat, lon));
                    }
                }
            });

            if (coords.length === 0) {
                data["show_error"] = true;
                data["error"] = "Failed to parse coords.";
                return data;
            }
            newCoords = coords
        } else if (type && type === InstanceType.AutoQuest || type === InstanceType.PokemonIV) {
            var coordArray: Coord[][] = [];
            let areaRows = area.split('\n');
            var currentIndex = 0;
            areaRows.forEach(areaRow => {
                let rowSplit = areaRow.split(',');
                if (rowSplit.length === 2) {
                    let lat = parseFloat(rowSplit[0].trim());
                    let lon = parseFloat(rowSplit[1].trim());
                    if (lat && lon) {
                        while (coordArray.length !== currentIndex + 1) {
                            coordArray.push([]);
                        }
                        coordArray[currentIndex].push(new Coord(lat, lon));
                    }
                } else if (areaRow.includes("[") && 
                           areaRow.includes("]") &&
                           coordArray.length > currentIndex && 
                           coordArray[currentIndex].length !== 0) {
                    currentIndex++;
                }
            });

            if (coordArray.length === 0) {
                data["show_error"] = true;
                data["error"] = "Failed to parse coords.";
                return data;
            }

            newCoords = coordArray;
        } else {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }

        if (instanceName) {
            let oldInstance: Instance;
            try {
                oldInstance = await Instance.getByName(instanceName);
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to update instance. Is the name unique?";
                return data;
            }
            if (oldInstance === undefined || oldInstance === null) {
                res.send("Instance Not Found");
                return data;
            } else {
                let oldInstanceData: any = {};
                oldInstance.name = name;
                oldInstance.type = type;
                oldInstanceData["area"] = newCoords;
                oldInstanceData["timezone_offset"] = timezoneOffset;
                oldInstanceData["min_level"] = minLevel;
                oldInstanceData["max_level"] = maxLevel;
                if (type === InstanceType.PokemonIV) {
                    oldInstanceData["pokemon_ids"] = pokemonIDs;
                    oldInstanceData["iv_queue_limit"] = ivQueueLimit;
                    oldInstanceData["scatter_pokemon_ids"] = scatterPokemonIDs;
                } else if (type === InstanceType.AutoQuest) {
                    oldInstanceData["spin_limit"] = spinLimit;
                }
                oldInstance.data = <IInstanceData>oldInstanceData;
                try {
                    await oldInstance.update(instanceName);
                } catch (err) {
                    logger.error(err);
                    data["show_error"] = true;
                    data["error"] = "Failed to update instance. Is the name unique?";
                    return data;
                }
                InstanceController.instance.reloadInstance(oldInstance, instanceName);
                res.redirect('/instances');
                return;
            }
        } else {
            let instanceData = {};
            instanceData["area"] = newCoords;
            instanceData["timezone_offset"] = timezoneOffset;
            instanceData["min_level"] = minLevel;
            instanceData["max_level"] = maxLevel;
            if (type === InstanceType.PokemonIV) {
                instanceData["pokemon_ids"] = pokemonIDs;
                instanceData["iv_queue_limit"] = ivQueueLimit;
                instanceData["scatter_pokemon_ids"] = scatterPokemonIDs;
                instanceData["scatter_pokemon_ids"] = scatterPokemonIDs;
            } else if (type === InstanceType.AutoQuest) {
                instanceData["spin_limit"] = spinLimit;
            }
            let instance = new Instance(name, type, <IInstanceData>instanceData);
            try {
                await instance.create();
                InstanceController.instance.addInstance(instance);
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to create instance. Is the name unique?";
                return data;
            }
        }
        res.redirect('/instances');
    }
    async editInstanceGet(data: any, req: express.Request, res: express.Response, instanceName?: string): Promise<any> {
        var data = data;
        let oldInstance: Instance;
        try {
            oldInstance = await Instance.getByName(instanceName);
        } catch {
            res.send("Internal Server Error");
        }
        if (oldInstance === undefined || oldInstance === null) {
            res.send("Instance Not Found");
        } else {
            let areaString = "";
            let oldInstanceData = JSON.parse(String(oldInstance.data));
            switch (oldInstance.type) {
                case InstanceType.AutoQuest:
                case InstanceType.PokemonIV:
                    let areaType2 = oldInstanceData["area"]; // [[String: Double]];
                    if (areaType2) {
                        let index = 1;
                        areaType2.forEach(geofence => {
                            areaString += `[Geofence ${index}]\n`;
                            index++;
                            geofence.forEach(coordLine => {
                                let lat = coordLine["lat"];
                                let lon = coordLine["lon"];
                                areaString += `${lat},${lon}\n`;
                            });
                        });
                    }
                    break;
                default:
                    let areaType1 = oldInstanceData["area"]; // [[[String: Double]]];
                    if (areaType1) {
                        areaType1.forEach(coordLine => {
                            let lat = coordLine["lat"];
                            let lon = coordLine["lon"];
                            areaString += `${lat},${lon}\n`;
                        });
                    }
                    break;
            }

            data["name"] = oldInstance.name;
            data["area"] = areaString;
            data["min_level"] = oldInstanceData["min_level"] || 0;
            data["max_level"] = oldInstanceData["max_level"] || 29;
            data["timezone_offset"] = oldInstanceData["timezone_offset"] || 0;
            data["iv_queue_limit"] = oldInstanceData["iv_queue_limit"] || 100;
            data["spin_limit"] = oldInstanceData["spin_limit"] || 500;

            let pokemonIDs: number[] = oldInstanceData["pokemon_ids"];
            if (pokemonIDs) {
                let text = pokemonIDs.join('\n');
                data["pokemon_ids"] = text;
            }
            let scatterPokemonIDs: number[] = oldInstanceData["scatter_pokemon_ids"];
            if (scatterPokemonIDs) {
                let text = scatterPokemonIDs.join(`\n`);
                data["scatter_pokemon_ids"] = text;
            }

            switch (oldInstance.type) {
                case InstanceType.CirclePokemon:
                    data["circle_pokemon_selected"] = true;
                    break;
                case InstanceType.CircleRaid:
                    data["circle_raid_selected"] = true;
                    break;
                case InstanceType.SmartCircleRaid:
                    data["circle_smart_raid_selected"] = true;
                    break;
                case InstanceType.AutoQuest:
                    data["auto_quest_selected"] = true;
                    break;
                case InstanceType.PokemonIV:
                    data["pokemon_iv_selected"] = true;
                    break;
                case InstanceType.GatherToken:
                case InstanceType.Leveling:
                    break;                
            }
            return data;
        }
    }
    async addAssignmentGet(data: any, req: express.Request, res: express.Response): Promise<any> {
        var data = data;
        let instances: Instance[] = [];
        let devices: Device[] = [];
        try {
            devices = await Device.load();
            instances = await Instance.getAll();
        } catch {
            res.send("Internal Server Error");
            return data;
        }

        let instancesData = [];
        instances.forEach(instance => {
            instancesData.push({
                name: instance.name, 
                selected: false
            });
        });
        data["instances"] = instancesData;
        let devicesData = [];
        devices.forEach(device => {
            devicesData.push({
                uuid: device.uuid,
                selected: false
            });
        });
        data["devices"] = devicesData;
        return data;

    }
    async addAssignmentPost(data: any, req: express.Request, res: express.Response): Promise<any> {
        let selectedDevice: string = req.body["device"];
        let selectedInstance: string = req.body["instance"];
        let time = req.body["time"];
        let onComplete = req.body["oncomplete"];
        let enabled = req.body["enabled"];

        var data = data;
        let instances: Instance[] = [];
        let devices: Device[] = [];
        try {
            devices = await Device.load();
            instances = await Instance.getAll();
        } catch {
            res.send("Internal Server Error");
            return data;
        }

        let instancesData = [];
        instances.forEach(instance => {
            instancesData.push({
                name: instance.name,
                selected: instance.name === selectedInstance
            });
        });
        data["instances"] = instancesData;
        let devicesData = [];
        devices.forEach(device => {
            devicesData.push({
                uuid: device.uuid,
                selected: device.uuid === selectedDevice
            });
        });
        data["devices"] = devicesData;
        data["time"] = time;

        let timeInt: number;
        if (time === undefined || time === null || time === "") {
            timeInt = 0;
        } else {
            let split = time.split(':');
            if (split.length === 3) {
                let hours = parseInt(split[0]);
                let minutes = parseInt(split[1]);
                let seconds = parseInt(split[2]);
                let timeIntNew = hours * 3600 + minutes * 60 + seconds;
                if (timeIntNew === 0) {
                    timeInt = 1;
                } else {
                    timeInt = timeIntNew;
                }
            } else {
                data["show_error"] = true;
                data["error"] = "Invalid Time.";
                return data;
            }
        }

        if (selectedDevice === undefined || selectedDevice === null || selectedDevice === "" || 
            selectedInstance === undefined || selectedInstance === null || selectedInstance === "") {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }
        try {
            let assignmentEnabled = enabled == "on";
            let assignment = new Assignment(selectedInstance, selectedDevice, timeInt, assignmentEnabled);
            assignment.create();
            AssignmentController.instance.addAssignment(assignment);
        } catch {
            data["show_error"] = true;
            data["error"] = "Failed to assign Device.";
            return data;
        }

        if (onComplete === "on") {
            try {
                let onCompleteAssignment = new Assignment(selectedInstance, selectedDevice, 0, true);
                onCompleteAssignment.create();
                AssignmentController.instance.addAssignment(onCompleteAssignment);
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to assign Device.";
                return data;
            }
        }
        res.redirect('/assignments');
    }
    async editAssignmentGet(data: any, req: express.Request, res: express.Response, instanceUUID: string): Promise<any> {
        let selectedUUID = decodeURI(req.param("uuid") || "");
        let tmp = selectedUUID.replace("\\\\-", "\\-");
        let split = tmp.split('-');
        if (split.length !== 3) {
            res.send("Bad Request");
            return data;
        } else {
            let selectedInstance = unescape(split[0].replace("&tmp", "\\\\-"));
            let selectedDevice = unescape(split[1].replace("&tmp", "\\\\-"));
            let time = parseInt(split[2]) || 0;

            var data = data;
            let instances: Instance[] = [];
            let devices: Device[] = [];
            try {
                devices = await Device.load();
                instances = await Instance.getAll();
            } catch {
                res.send("Internal Server Error");
                return data;
            }

            let instancesData = [];
            instances.forEach(instance => {
                instancesData.push({
                    name: instance.name,
                    selected: instance.name === selectedInstance
                });
            });
            data["instances"] = instancesData;
            let devicesData = [];
            devices.forEach(device => {
                devicesData.push({
                    uuid: device.uuid,
                    selected: device.uuid === selectedDevice
                });
            });
            data["devices"] = devicesData;

            let formattedTime: string;
            if (time === 0) {
                formattedTime = "";
            } else {
                let times = moment(time).format('hh:mm:ss');//time.secondsToHoursMinutesSeconds()
                formattedTime = times;//"\(String(format: "%02d", times.hours)):\(String(format: "%02d", times.minutes)):\(String(format: "%02d", times.seconds))"
            }
            data["time"] = formattedTime;
            let assignment: Assignment;
            try {
                assignment = await Assignment.getByUUID(selectedInstance, selectedDevice, time);
            } catch {
                res.send("Internal Server Error");
                return data;
            }
            data["enabled"] = assignment.enabled ? "checked" : "";
            if (selectedDevice === "" || selectedInstance === "") {
                data["show_error"] = true;
                data["error"] = "Invalid Request.";
                return data;
            }
            return data;
        }
    }
    async editAssignmentPost(data: any, req: express.Request, res: express.Response): Promise<any> {
        let selectedDevice: string = req.body["device"];
        let selectedInstance: string = req.body["instance"];
        let time: string = req.body["time"];
        let enabled: string = req.body["enabled"];
        var data = data;
        let timeInt: number;
        if (time === undefined || time === null || time === "") {
            timeInt = 0;
        } else {
            let split = time.split(':');
            if (split.length === 3) {
                let hours = parseInt(split[0]);
                let minutes = parseInt(split[1]);
                let seconds = parseInt(split[2]);
                let timeIntNew = hours * 3600 + minutes * 60 + seconds;
                if (timeIntNew === 0) {
                    timeInt = 1;
                } else {
                    timeInt = timeIntNew;
                }
            } else {
                data["show_error"] = true;
                data["error"] = "Invalid Time.";
                return data;
            }
        }

        if (selectedDevice === undefined || selectedDevice === null ||
            selectedInstance === undefined || selectedInstance === null) {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }

        let selectedUUID = data["old_name"] || "";
        let tmp = selectedUUID.replace("\\\\-", "\\-");
        let split = tmp.split("-");
        if (split.length !== 3) {
            res.send("Bad Request");
            return data;
        } else {
            let oldInstanceName = unescape(split[0].replace("&tmp", "\\\\-"));
            let oldDeviceUUID = unescape(split[1].replace("&tmp", "\\\\-"));
            let oldTime = parseInt(split[2]) || 0;

            let oldAssignment: Assignment;
            try {
                oldAssignment = await Assignment.getByUUID(oldInstanceName, oldDeviceUUID, oldTime);
            } catch {
                res.send("Internal Server Error");
                return data;
            }

            try {
                let assignmentEnabled = enabled === "on";
                let newAssignment = new Assignment(selectedInstance, selectedDevice, timeInt, assignmentEnabled);
                newAssignment.save(oldInstanceName, oldDeviceUUID, oldTime, assignmentEnabled);
                AssignmentController.instance.editAssignment(oldAssignment, newAssignment);
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to assign Device.";
                return data;
            }
        }
        res.redirect('/assignments');
    }
    async addDeviceGroupGet(data: any, req: express.Request, res: express.Response): Promise<any> {
        var data = data;
        let instances: Instance[] = [];
        let devices: Device[] = [];
        try {
            instances = await Instance.getAll();
            devices = await Device.load();
        } catch {
            res.send("Internal Server Errror");
            return;
        }
        let instancesData = [];
        instances.forEach(instance => {
            instancesData.push({
                name: instance.name,
                selected: false
            });
        });
        data["instances"] = instancesData

        let devicesData = [];
        devices.forEach(device => {
            devicesData.push({
                name: device.uuid,
                selected: false
            });
        });
        data["devices"] = devicesData;
        return data;
    }
    async addDeviceGroupPost(data: any, req: express.Request, res: express.Response): Promise<any> {
        var data = data;
        let groupName = req.body["name"];
        let instanceName = req.body["instance"];
        if (groupName === undefined || groupName === null ||
            instanceName === undefined || instanceName === null) {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }

        let deviceUUIDs = req.body["devices"];
        let deviceGroup = new DeviceGroup(groupName, instanceName, []);
        try {
            await deviceGroup.create();
        } catch {
            data["show_error"] = true;
            data["error"] = "Failed to create device group. Does this device group already exist?";
            return data;
        }

        try {
            for (let i = 0; i < deviceUUIDs.length; i++) {
                let deviceUUID: string = deviceUUIDs[i];
                let device = await Device.getById(deviceUUID);
                device.deviceGroup = groupName;
                device.instanceName = instanceName;
                await device.save(device.uuid);
                deviceGroup.devices.push(device);
                InstanceController.instance.reloadDevice( device, deviceUUID);
            }
        } catch {
            data["show_error"] = true;
            data["error"] = "Failed to assign Device.";
            return data;
        }
        res.redirect('/devicegroups');
    }
    async editDeviceGroupGet(data: any, req: express.Request, res: express.Response, deviceGroupName: string): Promise<any> {
        var data = data;
        let oldDeviceGroup: DeviceGroup;
        try {
            oldDeviceGroup = await DeviceGroup.getByName(deviceGroupName);
        } catch (err) {
            res.send("Internal Server Error");
            return;
        }
        if (oldDeviceGroup === undefined || oldDeviceGroup === null) {
            res.send("Device Group Not Found");
            return;
        } else {
            let instances: Instance[] = [];
            let devices: Device[] = [];
            data["old_name"] = oldDeviceGroup.name;
            data["name"] = oldDeviceGroup.name;
            try {
                instances = await Instance.getAll();
                devices = await Device.load();
            } catch {
                res.send("Internal Server Errror");
                return;
            }

            let instancesData = [];
            instances.forEach(instance => {
                instancesData.push({
                    name: instance.name,
                    selected: instance.name === oldDeviceGroup.instanceName
                });
            });
            data["instances"] = instancesData;

            let devicesData = [];
            var oldDevicesData: string[] = [];
            devices.forEach(device => {
                if (device.deviceGroup === oldDeviceGroup.name) {
                    oldDevicesData.push(device.uuid);
                }
                devicesData.push({
                    name: device.uuid,
                    selected: device.deviceGroup === oldDeviceGroup.name
                });
            });
            data["old_devices"] = oldDevicesData;
            data["devices"] = devicesData;
            return data;
        }
    }
    async editDeviceGroupPost(data: any, req: express.Request, res: express.Response, deviceGroupName?: string): Promise<any> {
        var data = data
        let name = req.body["name"];
        let instanceName = req.body["instance"];
        if (name === undefined || name === null ||
            instanceName === undefined || instanceName === null) {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data;
        }

        let deviceUUIDs = req.body["devices"];
        let oldDeviceUUIDs = req.body["old_devices"];

        var oldDevices: string[] = [];
        let split = oldDeviceUUIDs.split(',');
        split.forEach(device => {
            let deviceName = device.replace("[", "")
                            .replace("]",  "")
                            .replace("\"", "")
                            .replace(" ", "");
            oldDevices.push(deviceName);
        });

        let deviceDiff = oldDevices
                 .filter(x => !deviceUUIDs.includes(x))
                 .concat(deviceUUIDs.filter(x => !oldDevices.includes(x)));
        data["name"] = name
        if (deviceGroupName) {
            let oldDeviceGroup: DeviceGroup;
            try {
                oldDeviceGroup = await DeviceGroup.getByName(deviceGroupName);
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to update device group. Is the name unique?";
                return data;
            }
            if (oldDeviceGroup === undefined || oldDeviceGroup === null) {
                res.send("Device Group Not Found");
                return;
            } else {
                oldDeviceGroup.name = name;
                oldDeviceGroup.instanceName = instanceName;

                try {
                    await oldDeviceGroup.update(deviceGroupName);
                    //Remove all existing devices from the group's device list.
                    oldDeviceGroup.devices.length = 0;

                    //Set any removed device's group name to null.
                    deviceDiff.forEach(async deviceUUID => {
                        let device = await Device.getById(deviceUUID);
                        if (device) {
                            await device.clearGroup();
                        }
                    });
                    //Update new and existing devices
                    for (let i = 0; i < deviceUUIDs.length; i++) {
                        let deviceUUID = deviceUUIDs[i];
                        let device = await Device.getById(deviceUUID);
                        if (device) {
                            device.deviceGroup = name;
                            device.instanceName = instanceName;
                            await device.save(device.uuid);
                            oldDeviceGroup!.devices.push(device);
                            InstanceController.instance.reloadDevice(device, deviceUUID);
                        }
                    }
                } catch {
                    data["show_error"] = true;
                    data["error"] = "Failed to update device group. Is the name unique?";
                    return data;
                }
                res.redirect('/devicegroups');
                return;
            }
        } else {
            let deviceGroup = new DeviceGroup(name, instanceName, []);
            try {
                await deviceGroup.create();
                for (let i = 0; i < deviceUUIDs.length; i++) {
                    let deviceUUID: string = deviceUUIDs[i];
                    let device = await Device.getById(deviceUUID);
                    device.deviceGroup = deviceGroupName;
                    device.instanceName = instanceName;
                    await device.save(device.uuid);
                    deviceGroup.devices.push(device);
                    InstanceController.instance.reloadDevice(device, deviceUUID);
                }
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to create device group. Is the name unique?";
                return data;
            }
        }
        res.redirect('/devicegroups');
    }
    async addAccounts(data: any, req: express.Request, res: express.Response): Promise<any> { 
        var data = data
        let level = parseInt(req.body["level"] || 0);
        let accounts: string = req.body["accounts"];
        if (accounts === undefined || accounts === null) {
            data["show_error"] = true;
            data["error"] = "Invalid Request.";
            return data
        }
        accounts = accounts.replace("<br>", "")
                           .replace("\r\n", "\n")
                           .replace(";", ",")
                           .replace(":", ",");

        data["accounts"] = accounts;
        data["level"] = level;

        let accs: Account[] = [];
        let accountsRows = accounts.split('\n');
        accountsRows.forEach(accountsRow => {
            let split = accountsRow.split(',');
            if (split.length === 2) {
                let username = split[0]
                let password = split[1]
                accs.push(new Account(username, password, null, null, null, level, null, null, null, 0, null, null));
            }
        });

        if (accs.length === 0) {
            data["show_error"] = true;
            data["error"] = "Failed to parse accounts.";
            return data;
        } else {
            try {
                accs.forEach(async acc => {
                    await acc.save(false);
                });
            } catch {
                data["show_error"] = true;
                data["error"] = "Failed to save accounts.";
                return data;
            }
            res.redirect('/accounts');
        }
    }
    async updateSettings(req: express.Request, res: express.Response) {
        let obj = req.body;
        let title = obj["title"];
        let defaultTimeUnseen = parseInt(obj["pokemon_time_new"]);
        let defaultTimeReseen = parseInt(obj["pokemon_time_old"]);
        let maxPokemonId = parseInt(obj["max_pokemon_id"]);
        let locale = obj["locale_new"].toLowerCase();
        let exRaidBossId = parseInt(obj["ex_raid_boss_id"]);
        let exRaidBossForm = parseInt(obj["ex_raid_boss_form"]);
        let pokestopLureTime = parseInt(obj["pokestop_lure_time"]);

        let webhookDelay = parseInt(obj["webhook_delay"]) || 5.0;
        let webhookUrlsString = obj["webhook_urls"] || "";
        let enableClearing = obj["enable_clearing"] !== null;
        let deviceAPIhostWhitelist: string[] = obj["deviceapi_host_whitelist"].split(';');
        let deviceAPIhostWhitelistUsesProxy = obj["deviceapi_host_whitelist_uses_proxy"] !== null;
        let deviceAPIloginSecret: string = obj["deviceapi_secret"];
        let dittoDisguises: number[] = obj["ditto_disguises"].split(',').map((x: string) => parseInt(x)) || [];

        try {
            await DbController.instance.setValueForKey("TITLE", title);
            await DbController.instance.setValueForKey("WEBHOOK_DELAY", webhookDelay.toString());
            await DbController.instance.setValueForKey("WEBHOOK_URLS", webhookUrlsString);
            await DbController.instance.setValueForKey("POKEMON_TIME_UNSEEN", defaultTimeUnseen.toString());
            await DbController.instance.setValueForKey("POKEMON_TIME_RESEEN", defaultTimeReseen.toString());
            await DbController.instance.setValueForKey("POKESTOP_LURE_TIME", pokestopLureTime.toString());
            await DbController.instance.setValueForKey("GYM_EX_BOSS_ID", exRaidBossId.toString());
            await DbController.instance.setValueForKey("GYM_EX_BOSS_FORM", exRaidBossForm.toString());
            await DbController.instance.setValueForKey("MAP_MAX_POKEMON_ID", maxPokemonId.toString());
            await DbController.instance.setValueForKey("LOCALE", locale);
            await DbController.instance.setValueForKey("ENABLE_CLEARING", enableClearing.toString());
            await DbController.instance.setValueForKey("DEVICEAPI_HOST_WHITELIST", deviceAPIhostWhitelist.join(';') || "");
            await DbController.instance.setValueForKey("DEVICEAPI_HOST_WHITELIST_USES_PROXY", deviceAPIhostWhitelistUsesProxy.toString());
            await DbController.instance.setValueForKey("DEVICEAPI_SECRET", deviceAPIloginSecret || "");
            await DbController.instance.setValueForKey("DITTO_DISGUISES", dittoDisguises.map(x => x.toString()).join(','));
        } catch (err) {
            return {
                show_error: true
            };
        }
        await DbController.instance.loadSettings();
        return {
            title: title,
            show_success: true
        };
    }
}

export { ApiController, Page };