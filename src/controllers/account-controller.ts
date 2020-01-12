import { Account } from "../models/account";

const moment = require('moment');

"use strict"

class AccountController {
    isSetup: boolean = false;

    setup() {
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;
        
        //clearSpinsQueue = Threading.getQueue(name: "AccountController-spin-clearer", type: .serial)
        //clearSpinsQueue.dispatch {
            while (true) {
                
                let date = moment(new Date(), 'HH:mm:ss');                
                let split = date.split(":");
                let hour = parseInt(split[0]);
                let minute = parseInt(split[1]);
                let second = parseInt(split[2]);
                let timeLeft = (23 - hour) * 3600 + (59 - minute) * 60 + (60 - second);
                if (timeLeft > 0) {
                    // TODO: sleep `timeLeft` seconds
                    console.log("[AccountController] Clearing Spins...");
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
        //}
    }

}

export { AccountController };