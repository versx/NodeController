/*
"use strict";

import { Request, Response } from 'express';

import { InstanceController } from './instances/instance-controller';
import { Account } from '../models/account';
import { Device } from '../models/device';
import { logger } from '../utils/logger';
import { getCurrentTimestamp } from '../utils/util';

class DeviceController {
    static instance = new DeviceController();
    constructor() {

    }
    async handleRequest(req: Request, res: Response) {
        let jsonO = req.body;
        let typeO = jsonO["type"];
        let uuidO = jsonO["uuid"];
        if (typeO === undefined || uuidO === undefined) {
            logger.error("[Controller] Failed to parse controller data");
            return res.sendStatus(400);
        }
        let type: string = typeO;
        let uuid: string = uuidO;
        let username: string = jsonO["username"];
        let ptcToken: string = jsonO["ptcToken"];
        //let tutorial: number = parseInt(jsonO["tutorial"]);
        let minLevel: number = parseInt(jsonO["min_level"] || 0);
        let maxLevel: number = parseInt(jsonO["max_level"] || 29);
        let device = await Device.getById(uuid);
    
        switch (type) {
            case "init":
                let init = await this.handleInitialization(uuid, device);
                if (init) {
                    res.send(init);
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "heartbeat":
                res.send(await this.handleHeartbeat(uuid, req.socket));
                break;
            case "get_job":
                let job = this.handleGetJob(uuid, username);
                if (job) {
                    res.send(job);
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "get_startup":
                let startup = this.handleStartup(uuid, username);
                if (startup) {
                    res.send(startup);
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "get_account":
                let acc = await this.handleGetAccount(device, minLevel, maxLevel);
                if (acc) {
                    return acc;
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "last_seen":
                res.send(await this.handleLastSeen(uuid, req.socket));
                break;
            case "tutorial_done":
                let tutAccount = await Account.getWithUsername(device.accountUsername);
                if (await this.handleTutorialDone(device, tutAccount)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "account_banned":
                let banAccount = await Account.getWithUsername(device.accountUsername);
                if (await this.handleBan(device, banAccount)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "account_warning":
                let warnAccount = await Account.getWithUsername(device.accountUsername);
                if (await this.handleWarning(device, warnAccount)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "account_invalid_credentials":
                let invalidAccount = await Account.getWithUsername(device.accountUsername);
                if (await this.handleInvalidCredentials(device, invalidAccount)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "error_26":
                let errAccount = await Account.getWithUsername(device.accountUsername);
                if (await this.handleError26(device, errAccount)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "logged_out":
                if (await this.handleLogout(device)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(404);
                }
                break;
            case "ptcToken": // REVIEW: Seriously? Who the hell used camelCasing :joy:?
                if (await this.handlePtcToken(device, ptcToken)) {
                    res.send('OK');
                } else {
                    return res.sendStatus(400);
                }
                break;
            case "job_failed":
                logger.error("[Controller] JOB FAILED:", jsonO);
                res.send('OK');
                break;
            default:
                logger.error("[Controller] Unhandled Request:", type);
                res.sendStatus(404);
                break;
        }
    }
    async handleInitialization(uuid: string, device?: Device) {
        let firstWarningTimestamp: number;
        if (device === undefined || device.accountUsername === undefined) {
            firstWarningTimestamp = null;
        } else {
            let account = await Account.getWithUsername(device.accountUsername);
            if (account instanceof Account) {
                firstWarningTimestamp = account.firstWarningTimestamp;
            } else {
                firstWarningTimestamp = null;
            }
        }
        if (device instanceof Device) {
            // Device is already registered
            logger.debug("[Controller] Device already registered");
            return {
                data: {
                    assigned: device.instanceName !== undefined && device.instanceName !== null && device.instanceName !== "",
                    first_warning_timestamp: firstWarningTimestamp
                }
            };
        } else {
            // Register new device
            logger.debug("[Controller] Registering device");
            let newDevice = new Device(uuid, null, null, 0, null, 0, 0.0, 0.0, null);
            await newDevice.create();
            return { 
                data: { 
                    assigned: false,
                    first_warning_timestamp: firstWarningTimestamp
                }
            };
        }
    }
    async handleHeartbeat(uuid: string, client: Socket) {
        let host = client 
            ? `${client.remoteAddress}:${client.remotePort}` 
            : "?";
        try {
            await Device.touch(uuid, host, false);
            return 'OK';
        } catch (err) {
            return err;
        }
    }
    handleGetJob(uuid: string, username: string) {
        let controller = InstanceController.instance.getInstanceController(uuid);
        if (controller) {
            try {
                let task = controller.getTask(uuid, username, false);
                return {
                    data: task
                };
            } catch (err) {
                return false;
            }
        } else {
            logger.info("[Controller] Device " + uuid + "not assigned to an instance!");
            return false;
        }
    }
    handleStartup(uuid: string, username: string) {
        let startupController = InstanceController.instance.getInstanceController(uuid);
        if (startupController) {
            try {
                let task = startupController.getTask(uuid, username, true);
                return {
                    data: task
                };
            } catch (err) {
                return false;
            }
        } else {
            logger.info("[Controller] Device" + uuid + " failed to get startup location!");
            return false;
        }
    }
    async handleGetAccount(device: Device, minLevel: number, maxLevel: number) {
        let newAccount = await Account.getNewAccount(minLevel, maxLevel);
        logger.debug("[Controller] GetAccount: " + newAccount);
        if (device === undefined || device === null || 
            newAccount === undefined || newAccount === null) {
            logger.error("[Controller] Failed to get account, device or account is null.");
            return false;
        }
        if (device.accountUsername) {
            let oldAccount = await Account.getWithUsername(device.accountUsername);
            if (oldAccount instanceof Account && 
                oldAccount.level >= minLevel &&
                oldAccount.level <= maxLevel &&
                oldAccount.firstWarningTimestamp === undefined && 
                oldAccount.failed                === undefined && 
                oldAccount.failedTimestamp       === undefined) {
                return {
                    data: {
                        username: oldAccount.username.trim(),
                        password: oldAccount.password.trim(),
                        first_warning_timestamp: oldAccount.firstWarningTimestamp,
                        level: oldAccount.level,
                        tutorial: newAccount.tutorial,
                        ptcToken: oldAccount.ptcToken
                    }
                };
                return;
            }
        }

        device.accountUsername = newAccount.username;
        device.deviceLevel = newAccount.level;
        await device.save(device.uuid);
        return {
            data: {
                username: newAccount.username.trim(),
                password: newAccount.password.trim(),
                first_warning_timestamp: newAccount.firstWarningTimestamp,
                level: newAccount.level,
                tutorial: newAccount.tutorial,
                ptcToken: newAccount.ptcToken
            }
        };
    }
    async handleLastSeen(uuid: string, client: Socket) {
        let host = client 
            ? `${client.remoteAddress}:${client.remotePort}` 
            : "?";
        try {
            await Device.touch(uuid, host, true);
            return 'OK';
        } catch (err) {
            return err;
        }
    }
    async handleTutorialDone(device: Device, account: Account): Promise<boolean> {
        if (account instanceof Account) {
            if (account.level === 0) {
                account.level = 1;
            }
            account.tutorial = 1;
            await account.save(true);
            return true;
        } else {
            if (device === undefined || device === null || 
                account === undefined || account === null) {
                logger.error("[Controller] Failed to get account, device or account is null.");
                return false;
            }
        }
    }
    async handleBan(device: Device, account: Account): Promise<boolean> {
        if (account instanceof Account) {
            if (account.failedTimestamp === undefined || account.failedTimestamp === null || 
                account.failed === undefined || account.failed === null) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "banned";
                    await account.save(true);
                    return true;
            }
        } else {
            if (device === undefined || device === null ||
                account === undefined || account === null) {
                logger.error("[Controller] Failed to get account, device or account is null.");
                return false;
            }
        }
        return false;
    }
    async handleWarning(device: Device, account: Account): Promise<boolean> {
        if (account instanceof Account) {
            if (account.firstWarningTimestamp === undefined || account.firstWarningTimestamp === null) {
                account.firstWarningTimestamp = getCurrentTimestamp();
                await account.save(true);
                return true;
            }
        } else {
            if (device === undefined || device === null ||
                account === undefined || account === null) {
                logger.error("[Controller] Failed to get account, device or account is null.");
                return false;
            }
        }
        return false;
    }
    async handleInvalidCredentials(device: Device, account: Account): Promise<boolean> {
        if (account instanceof Account) {
            if (account.failedTimestamp === undefined || account.failedTimestamp === null || 
                account.failed === undefined || account.failed === null) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "invalid_credentials";
                    account.save(true);
                    return true;
            }
        } else {
            if (device === undefined || device === null ||
                account === undefined || account === null) {
                logger.error("[Controller] Failed to get account, device or account is null.");
                return false;
            }
        }
        return false;
    }
    async handleError26(device: Device, account: Account): Promise<boolean> {
        if (account instanceof Account) {
            if (account.failedTimestamp === undefined || account.failedTimestamp === null ||
                account.failed === undefined || account.failed === null) {
                    account.failedTimestamp = getCurrentTimestamp();
                    account.failed = "error_26";
                    await account.save(true);
                    return true;
            }
        } else {
            if (device === undefined || device === null ||
                account === undefined || account === null) {
                logger.error("[Controller] Failed to get account, device or account is null.");
                return false;
            }
        }
        return false;
    }
    async handleLogout(device: Device): Promise<boolean> {
        if (device instanceof Device) {
            if (device.accountUsername === null) {
                return false;
            }
            let failed = await Account.checkFail(device.accountUsername);
            if (failed === false) {
                await Account.setInstanceUuid(device.uuid, device.instanceName, device.accountUsername);
            }
            await Account.setCooldown(device.accountUsername, device.lastLat, device.lastLon);
            device.accountUsername = null;
            await device.save(device.uuid);
            return true;
        }
        return false;
    }
    async handlePtcToken(device: Device, ptcToken: string): Promise<boolean> {
        try {
            let username = device.accountUsername;
            let account = await Account.getWithUsername(username);
            if (device === undefined || device === null ||
                username === undefined || username === null || username === "" ||
                account === undefined || account === null) {
                    return false;
            }
            if (account.ptcToken === undefined || 
                account.ptcToken === null ||
                account.ptcToken === "") {
                account.ptcToken = ptcToken;
                account.save(true);
            }
            return true;
        } catch {
            return false;
        }
    }
}

export { DeviceController };
*/