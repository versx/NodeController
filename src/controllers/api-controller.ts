"use strict"

import * as path from 'path';
import * as mustache from 'mustache';
import * as express from 'express';
import * as moment from 'moment';

import { Account } from '../models/account';
import { Assignment } from '../models/assignment';
import { Device } from '../models/device';
import { Gym } from '../models/gym';
import { Instance, InstanceType } from '../models/instance';
import { Pokestop } from '../models/pokestop';
import { Pokemon } from '../models/pokemon';
import { Localizer } from '../utils/localizer';
import { DbController } from './db-controller';
import { InstanceController } from './instances/instance-controller';
import { readFile, getCurrentTimestamp } from '../utils/util';
import { AssignmentController } from './assignment-controller';

enum Page {
    home = "index.mustache",
    homeJs = "index.js.mustache",
    homeCss = "index.css.mustache",
    setup = "setup.mustache",
    login = "login.mustache",
    oauthDiscord = "oauth_discord.mustache",
    register = "register.mustache",
    logout = "logout.mustache",
    profile = "profile.mustache",
    confirmemail = "confirmemail.mustache",
    confirmemailToken = "confirmemail_token.mustache",
    resetpassword = "resetpassword.mustache",
    resetpasswordToken = "resetpassword_token.mustache",
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
    dashboardUsers = "dashboard_users.mustache",
    dashboardUserEdit = "dashboard_user_edit.mustache",
    dashboardGroups = "dashboard_groups.mustache",
    dashboardGroupEdit = "dashboard_group_edit.mustache",
    dashboardGroupAdd = "dashboard_group_add.mustache",
    dashboardDiscordRules = "dashboard_discordrules.mustache",
    dashboardDiscordRuleAdd = "dashboard_discordrule_add.mustache",
    dashboardDiscordRuleEdit = "dashboard_discordrule_edit.mustache",
    unauthorized = "unauthorized.mustache"
}

class ApiController {
    private webroot: string = path.resolve('./webroot/');

    constructor() {
    }
    async handle(req: express.Request, res: express.Response) {
        let data: any = {};
        //let instance = req.param("instance");
        //let lastUpdate = parseInt(req.param("last_update", 0));
        let showDevices =  req.param("show_devices", false);
        let showInstances =  req.param("show_instances", false);
        let showDeviceGroups = req.param("show_devicegroups", false);
        let showUsers =  req.param("show_users", false);
        let showGroups =  req.param("show_groups", false);
        let formatted =  req.param("formatted", false);
        let showAssignments = req.param("show_assignments", false);
        let showIVQueue = req.param("show_ivqueue", false);
        let showDiscordRules = req.param("show_discordrules", false);

        // TODO: Security

        if (showDevices) {
            let devices = await Device.load();
            let jsonArray = [];
            if (devices) {
                devices.forEach(device => {
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
                            let date = moment(device.lastSeen).format("HH:mm:ss dd.MM.yyyy");
                            formattedDate = date;
                        }
                        deviceData["last_seen"] = { "timestamp": device.lastSeen, "formatted": formattedDate };
                        deviceData["buttons"] = `<a href="/device/assign/${device.uuid/*.encodeUrl()*/}" role="button" class="btn btn-primary">Assign Instance</a>`;
                    } else {
                        deviceData["last_seen"] = device.lastSeen;
                    }
                    jsonArray.push(deviceData);
                });
            }
            data["devices"] = jsonArray;
        }
        if (showInstances) {
            let instances = await Instance.getAll();
            let jsonArray = [];
            if (instances) {
                instances.forEach(instance => {
                    let instanceData = {};
                    instanceData["name"] = instance.name;
                    let count = Object.values(InstanceController.instance.Devices)
                        .filter((device: Device) => device.instanceName === instance.name).length;
                    instanceData["count"] = count || 0; // TODO: instance.count;
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
                        let status = InstanceController.instance.getInstanceStatus(instance, true);
                        instanceData["status"] = status ? status.toString() : "?";
                    } else {
                        instanceData["status"] = InstanceController.instance.getInstanceStatus(instance, false);
                    }

                    if (formatted) {
                        instanceData["buttons"] = `<a href="/instance/edit/${instance.name/*.encodeUrl*/}" role="button" class="btn btn-primary">Edit Instance</a>`;
                    }
                    jsonArray.push(instanceData);
                });
            }
            data["instances"] = jsonArray
        }
        if (showAssignments) {
            let assignments = await Assignment.getAll();
            let jsonArray = [];
            if (assignments) {
                assignments.forEach(assignment => {
                    let assignmentData = {};
                    assignmentData["instance_name"] = assignment.instanceName;
                    assignmentData["device_uuid"] = assignment.deviceUUID;
                    if (formatted) {
                        let formattedTime: string;
                        if (assignment.time === 0) {
                            formattedTime = "On Complete";
                        } else {
                            let times = moment(assignment.time).format('hh:mm:ss');//.secondsToHoursMinutesSeconds();
                            formattedTime = times;//`${times.hours}:${times.minutes}:${times.seconds}`;
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
                });
            }
            data["assignments"] = jsonArray;
        }
        if (showDeviceGroups) {
        }
        if (showUsers) {
        }
        if (showGroups) {
        }
        if (showDiscordRules) {
        }
        if (showIVQueue) {
        }
        data["timestamp"] = getCurrentTimestamp();
        return {
            data: data
        };
    }
    async getPage(page: Page, req: express.Request, res: express.Response) {
        var data = {
            title: DbController.instance.settings["title"] || "NodeController",
            locale: Localizer.instance.locale,
            page: "Dashboard"
        };
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
            case Page.dashboardAssignmentEdit:
                let uuid = decodeURI(req.param("uuid") || "");
                let tmp = uuid.replace("-", "&tmp");
                data["page_is_dashboard"] = true;
                data["old_name"] = uuid;
                data["page"] = "Dashboard - Edit Assignment";
                if (req.method === "POST") {
                    try {
                        data = await this.editAssignmentPost(data, req, res);
                    } catch {
                        return;
                    }
                } else {
                    try {
                        data = await this.editAssignmentGet(data, req, res, tmp);
                    } catch {
                        return;
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
            case Page.dashboardUsers:
            case Page.dashboardGroups:
            case Page.dashboardDiscordRules:
                break;
            case Page.dashboardSettings:
                data["page_is_dashboard"] = true;
                data["page"] = "Dashboard - Settings";
                if (req.method === "POST") {
                    await this.updateSettings(req, res);
                    // TODO: show_success/show_error
                }
                data["max_pokemon_id"] = DbController.instance.settings["MAP_MAX_POKEMON_ID"] || 649;
                data["locale_new"] = Localizer.instance.locale;
                data["enable_register_new"] = DbController.instance.settings["ENABLE_REGISTER"] || "false";
                data["enable_clearing"] = DbController.instance.settings["ENABLE_CLEARING"] || "false";
                data["webhook_urls"] = DbController.instance.settings["WEBHOOK_URLS"] || "";
                data["webhook_delay"] = DbController.instance.settings["WEBHOOK_DELAY"] || 5.0;
                data["pokemon_time_new"] = Pokemon.DefaultTimeUnseen;
                data["pokemon_time_old"] = Pokemon.DefaultTimeReseen;
                data["pokestop_lure_time"] = Pokestop.LureTime;
                data["ex_raid_boss_id"] = Gym.ExRaidBossId || 0;
                data["ex_raid_boss_form"] = Gym.ExRaidBossForm || 0;
                data["google_analytics_id"] = DbController.instance.settings["GOOGLE_ANALYTICS_ID"] || "";
                data["google_adsense_id"] = DbController.instance.settings["GOOGLE_ADSENSE_ID"] || "";
                data["mailer_base_uri"] = DbController.instance.settings["MAILER_BASE_URI"] || "";
                data["mailer_name"] = DbController.instance.settings["MAILER_NAME"] || "";
                data["mailer_email"] = DbController.instance.settings["MAILER_EMAIL"] || "";
                data["mailer_url"] = DbController.instance.settings["MAILER_URL"] || "";
                data["mailer_username"] = DbController.instance.settings["MAILER_USERNAME"] || "";
                data["mailer_password"] = DbController.instance.settings["MAILER_PASSWORD"] || "";
                data["mailer_footer_html"] = DbController.instance.settings["MAILER_FOOTER_HTML"] || "";
                data["discord_guild_ids"] = DbController.instance.settings["DISCORD_GUILD_IDS"] || "";
                data["discord_token"] = DbController.instance.settings["DISCORD_TOKEN"] || "";
                data["discord_redirect_url"] = DbController.instance.settings["DISCORD_REDIRECT_URL"] || "";
                data["discord_client_id"] = DbController.instance.settings["DISCORD_CLIENT_ID"] || "";
                data["discord_client_secret"] = DbController.instance.settings["DISCORD_CLIENT_SECRET"] || "";
                data["deviceapi_host_whitelist"] = DbController.instance.settings["DEVICEAPI_HOST_WHITELIST"] || "";
                data["deviceapi_host_whitelist_uses_proxy"] = DbController.instance.settings["DEVICEAPI_HOST_WHITELIST_USES_PROXY"] || "";
                data["deviceapi_secret"] = DbController.instance.settings["DEVICEAPI_SECRET"] || "";
                data["ditto_disguises"] = DbController.instance.settings["DITTO_DISGUISES"] || Pokemon.DittoDisguises.map(x => x.toString()).join(',');
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
            console.error("[ApiController] Failed to get page:", err);
        }
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
        var devicesData = [];
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
        var devicesData = [];
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
        let selectedDevice = req.body("device");
        let selectedInstance = req.body("instance");
        let time = req.body("time");
        let enabled = req.body("enabled");
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
        let split = tmp.split("\\-");
        if (split.count !== 3) {
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
                           .replace("\r\n", "\n")//, options: .regularExpression)
                           .replace(";", ",")
                           .replace(":", ",");

        data["accounts"] = accounts;
        data["level"] = level;

        var accs: Account[] = [];
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
        //let webhookUrls = webhookUrlsString.split(";");
        let enableRegister = obj["enable_register_new"] !== null;
        let enableClearing = obj["enable_clearing"] !== null;

        let mailerBaseURI = obj["mailer_base_uri"];
        let mailerName = obj["mailer_name"];
        let mailerEmail = obj["mailer_email"];
        let mailerURL = obj["mailer_url"];
        let mailerUsername = obj["mailer_username"];
        let mailerPassword = obj["mailer_password"];
        let mailerFooterHTML = obj["mailer_footer_html"];
        let discordGuilds = obj["discord_guild_ids"].split(';').map((x: string) => parseInt(x)) || [];
        let discordToken = obj["discord_token"];
        let oauthDiscordRedirectURL = obj["discord_redirect_url"];
        let oauthDiscordClientID = obj["discord_client_id"];
        let oauthDiscordClientSecret = obj["discord_client_secret"];
        let deviceAPIhostWhitelist = obj["deviceapi_host_whitelist"].split(';');
        let deviceAPIhostWhitelistUsesProxy = obj["deviceapi_host_whitelist_uses_proxy"] !== null;
        let deviceAPIloginSecret = obj["deviceapi_secret"];
        let dittoDisguises = obj["ditto_disguises"].split(',').map((x: string) => parseInt(x)) || [];

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
            await DbController.instance.setValueForKey("ENABLE_REGISTER", enableRegister.toString());
            await DbController.instance.setValueForKey("ENABLE_CLEARING", enableClearing.toString());
            await DbController.instance.setValueForKey("MAILER_URL", mailerURL || "");
            await DbController.instance.setValueForKey("MAILER_USERNAME", mailerUsername || "");
            await DbController.instance.setValueForKey("MAILER_PASSWORD", mailerPassword || "");
            await DbController.instance.setValueForKey("MAILER_EMAIL", mailerEmail || "");
            await DbController.instance.setValueForKey("MAILER_NAME", mailerName || "");
            await DbController.instance.setValueForKey("MAILER_FOOTER_HTML", mailerFooterHTML || "");
            await DbController.instance.setValueForKey("MAILER_BASE_URI", mailerBaseURI || "");
            await DbController.instance.setValueForKey("DISCORD_GUILD_IDS", discordGuilds.map(x => x.toString()).join(';'));
            await DbController.instance.setValueForKey("DISCORD_TOKEN", discordToken || "");
            await DbController.instance.setValueForKey("DISCORD_REDIRECT_URL", oauthDiscordRedirectURL || "");
            await DbController.instance.setValueForKey("DISCORD_CLIENT_ID", oauthDiscordClientID || "");
            await DbController.instance.setValueForKey("DISCORD_CLIENT_SECRET", oauthDiscordClientSecret || "");
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