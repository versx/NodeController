"use strict"

import { Assignment } from '../models/assignment';
import { Device } from '../models/device';
import { InstanceController } from './instances/instance-controller';
import { snooze } from '../utils/util';
import * as moment from 'moment';

class AssignmentController /*InstanceControllerDelegate?*/ {
    static instance = new AssignmentController();

    private assignments: Assignment[];
    private isSetup: boolean = false;
    //queue: ThreadQueue;
    //timeZone: TimeZone;

    constructor() {
    }
    async setup() {
        console.info("[AssignmentController] Starting up...");
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
            console.log("[AssignmentController] Assigning", assignment.deviceUUID, "to", assignment.instanceName);
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
                    console.log("[AssignmentController] Triggered assignment", x);
                });
                return;
            }
        });
    }
}

function todaySeconds() {
    let date = moment(new Date(), "HH:mm:ss").toString();
    // TODO: formatter.timeZone = timeZone
    let split = date.split(":");
    if (split.length >= 3) {
        let hour = parseInt(split[0]) || 0;
        let minute = parseInt(split[1]) || 0;
        let second = parseInt(split[2]) || 0;
        return hour * 3600 + minute * 60 + second;
    } else {
        return 0;
    }
}

export { AssignmentController };