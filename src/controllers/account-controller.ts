"use strict";

import { Account } from '../models/account';
import { logger } from '../utils/logger';
import { snooze } from '../utils/util';
import * as moment from 'moment';

const ClearSpinsInterval: number = 60 * 1000;

class AccountController {
    static instance = new AccountController();
    isSetup: boolean = false;
    timer: NodeJS.Timeout;

    setup() {
        logger.info("[AccountController] Starting up...");
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;
        this.timer = setInterval(async () => await this.loopClearSpins(), ClearSpinsInterval);
    }
    async loopClearSpins() {
        let date = moment().format("HH:mm:ss"); // REVIEW: Should be lower hh?
        let split = date.split(":");
        let hour = parseInt(split[0]);
        let minute = parseInt(split[1]);
        let second = parseInt(split[2]);
        let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
        if (timeLeft > 0) {
            snooze(timeLeft * 1000);
            logger.info("[AccountController] Clearing Spins...");
            let done = false;
            while (!done) {
                try {
                    await Account.clearSpins();
                    done = true;
                } catch (err) {
                    snooze(5000);
                }
            }
        }
    }
}

export { AccountController };