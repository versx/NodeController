"use strict";

import { Assignment } from '../models/assignment';
import { Device } from '../models/device';
import { InstanceController } from './instances/instance-controller';
import { logger } from '../utils/logger';
import { snooze, todaySeconds } from '../utils/util';

class AssignmentController /*InstanceControllerDelegate?*/ {
    static instance = new AssignmentController();

    private assignments: Assignment[];
    private isSetup: boolean = false;
    //queue: ThreadQueue;
    //timeZone: TimeZone;

    constructor() {
    }
    async setup() {
        logger.info("[AssignmentController] Starting up...");
        this.assignments = await Assignment.getAll();
        //this.timeZone = Localizer.global.timeZone;
        if (!this.isSetup) {
            this.isSetup = true;
            //queue = Threading.getQueue(name: "AssignmentController-updater", type: .serial)
            //queue.dispatch {
                let lastUpdate: number = -2;                
                //while (true) {
                    let now = todaySeconds();
                    if (lastUpdate === -2) {
                        snooze(5000);
                        lastUpdate = now;
                        //continue;
                        return;
                    } else if (lastUpdate > now) {
                        lastUpdate = -1;
                    }
                    let assignments = this.assignments;
                    assignments.forEach(assignment => {
                        if (assignment.enabled && assignment.time !== 0 && now >= assignment.time && lastUpdate < assignment.time) {
                            this.triggerAssignment(assignment)
                        }
                    });
                    
                    snooze(5000);
                    lastUpdate = now;
                //}
            //}
        }
    }
    addAssignment(assignment: Assignment) {
        this.assignments.push(assignment);
    }
    editAssignment(oldAssignment: Assignment, newAssignment: Assignment) {
        let index = this.assignments.indexOf(oldAssignment, 0);
        if (index > -1) {
            this.assignments.splice(index, 1); //REVIEW: Is this correct?
        }
        this.assignments.push(newAssignment);

    }
    deleteAssignment(assignment: Assignment) {
        let index = this.assignments.indexOf(assignment, 0);
        if (index > -1) {
            this.assignments.splice(index, 1);
        }
    }
    async triggerAssignment(assignment: Assignment) {
        let device: Device;
        let done: boolean = false;
        while (!done) {
            try {
                device = await Device.getById(assignment.deviceUUID);
                done = true;
            } catch (err) {
                snooze(1000);
            }
        }
        if (device instanceof Device && device.instanceName !== assignment.instanceName) {
            logger.info("[AssignmentController] Assigning " + assignment.deviceUUID + " to " + assignment.instanceName);
            InstanceController.instance.removeDevice(device);
            device.instanceName = assignment.instanceName;
            done = false;
            while (!done) {
                try {
                    device.save(device.uuid);
                    done = true;
                } catch (err) {
                    snooze(1000);
                }
            }
            InstanceController.instance.addDevice(device);
        }
    }
    instanceControllerDone(name: string) {
        this.assignments.forEach(assignment => {
            let deviceUUIDs = InstanceController.instance.getDeviceUUIDsInInstance(name)
            if (assignment.enabled && assignment.time === 0 && deviceUUIDs.includes(assignment.deviceUUID)) {
                this.triggerAssignment(assignment).then(x => {
                    logger.info("[AssignmentController] Triggered assignment " + x);
                });
                return;
            }
        });
    }
}

export { AssignmentController };