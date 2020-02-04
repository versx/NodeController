"use strict";

import * as path from 'path';
import { logger } from '../utils/logger';
import { readFile } from '../utils/util';

class Localizer {
    static instance = new Localizer();
    locale = "en";

    timeZone = "America/Los_Angeles";//NSTimeZone.default
    lastModified: number = 0;

    private cachedData = {};
    private cachedDataEn = {};
    private dataPath: string = path.resolve('./webroot/static/data');

    load() {
        let file = path.join(this.dataPath, Localizer.instance.locale + ".json");
        //this.lastModified = file.modificationTime;
        try {
            let contents = readFile(file);
            let jsonObj = JSON.parse(contents);
            if (jsonObj) {
                this.cachedData = jsonObj.values;
            } else {
                logger.error("[Localizer] Failed to read file for locale: " + Localizer.instance.locale);
                return;
            }
        } catch (err) {
            logger.error("[Localizer] Failed to read file for locale: " + Localizer.instance.locale);
        }
        if (Localizer.instance.locale !== "en") {
            try {
                let fileEn = path.join(this.dataPath, "en.json");
                let contentsEn = readFile(fileEn);
                let jsonObjEn = JSON.parse(contentsEn);
                if (jsonObjEn) {
                    this.cachedDataEn = jsonObjEn.values;
                }
            } catch (err) {
                logger.error("[Localizer] Failed to read file for locale: " + Localizer.instance.locale);
            }
        }
    }

    get(value: string): string {
        return this.cachedData[value] || this.cachedDataEn[value] || value
    }
    /*
    get(value: string, replace: any): string {
        let value = this.cachedData[value] || this.cachedDataEn[value] || value;
        for repl in replace {
            value = value.replacingOccurrences(of: "%{\(repl.key)}", with: repl.value)
        }
        return value;
    }
    */
}

export { Localizer };