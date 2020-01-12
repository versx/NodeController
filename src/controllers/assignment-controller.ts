"use strict"

import { Assignment } from "../models/assignment";
import { Device } from "../models/device";
import * as moment from 'moment';

class AssignmentController /*InstanceControllerDelegate?*/ {
    assignments: Assignment[];
    isSetup: boolean = false;
    //queue: ThreadQueue;
    //timeZone: TimeZone;

    constructor() {
    }
    static setup() {
        console.log("[AssignmentController] Starting up...");

        /*
        this.assignments = Assignment.getAll();
        this.timeZone = Localizer.global.timeZone;
        
        if (!isSetup) {
            isSetup = true;

            //queue = Threading.getQueue(name: "AssignmentController-updater", type: .serial)
            //queue.dispatch {
                let lastUpdate: number = -2;                
                while (true) {
                    let now = this.todaySeconds();
                    if (lastUpdate == -2) {
                        // TODO: sleep 5 seconds
                        lastUpdate = parseInt(now);
                        continue;
                    } else if (lastUpdate > now) {
                        lastUpdate = -1;
                    }
                    let assignments = this.assignments;
                    assignments.forEach(function(assignment) {
                        if (assignment.enabled && assignment.time !== 0 && now >= assignment.time && lastUpdate < assignment.time) {
                            this.triggerAssignment(assignment)
                        }
                    });
                    
                    // TODO: sleep 5 seconds
                    lastUpdate = parseInt(now);
                }
            //}
        }
        */
    }
    addAssignment(assignment: Assignment) {
        this.assignments.push(assignment);
    }
    editAssignment(oldAssignment: Assignment, newAssignment: Assignment) {
        let index = this.assignments.indexOf(oldAssignment);
        if (index >= 0) {
            // TODO: this.assignments.remove(index);
        }
        this.assignments.push(newAssignment);

    }
    deleteAssignment(assignment: Assignment) {
        let index = this.assignments.indexOf(assignment);
        if (index >= 0) {
            // TODO: this.assignments.remove(index);
        }
    }
    triggerAssignment(assignment: Assignment) {
        let device: Device;
        let done: boolean = false;
        while (!done) {
            try {
                device = Device.getById(assignment.deviceUUID);
                done = true;
            } catch (err) {
                // TODO: sleep 1 second
            }
        }
        if (device && device.instanceName !== assignment.instanceName) {
            console.log("[AssignmentController] Assigning", assignment.deviceUUID, "to", assignment.instanceName);
            // TODO: InstanceController.global.removeDevice(device);
            device.instanceName = assignment.instanceName;
            done = false;
            while (!done) {
                try {
                    // TODO: device.save(device.uuid);
                    done = true;
                } catch (err) {
                    // TODO: sleep 1 second
                }
            }
            // TODO: InstanceController.global.addDevice(device);
        }
    }
    instanceControllerDone(name: string) {
        this.assignments.forEach(function(assignment) {
            /*
            let deviceUUIDs = InstanceController.global.getDeviceUUIDsInInstance(name)
            if (assignment.enabled && assignment.time === 0 && deviceUUIDs.includes(assignment.deviceUUID)) {
                this.triggerAssignment(assignment);
                return
            }
            */
        });
    }
}

function todaySeconds() {
    let date = moment(new Date(), "HH:mm:ss").toString();
    //formatter.timeZone = timeZone
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