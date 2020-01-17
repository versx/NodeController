"use strict"

import { Account } from "../models/account";
import * as moment from 'moment';

class AccountController {
    static instance = new AccountController();
    isSetup: boolean = false;

    setup() {
        console.info("[AccountController] Starting up...");
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;
        setInterval(() => this.loopClearSpins());
    }
    loopClearSpins() {
        let date = moment(new Date(), "HH:mm:ss").toString();             
        let split = date.split(":");
        let hour = parseInt(split[0]);
        let minute = parseInt(split[1]);
        let second = parseInt(split[2]);
        let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
        if (timeLeft > 0) {
            // TODO: sleep `timeLeft` seconds
            console.info("[AccountController] Clearing Spins...");
            let done = false;
            while (!done) {
                try {
                    Account.clearSpins();
                    done = true;
                } catch (err) {
                    // TODO: Sleep 5 seconds
                }
            }
        }
    }
}

export { AccountController };