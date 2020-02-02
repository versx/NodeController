import * as fs from 'fs';
import * as moment from 'moment';

function getCurrentTimestamp(): number {
    let now = new Date().getTime() / 1000;
    return Math.round(now);
}

function snooze(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function readFile(path: string) {
    let data = fs.readFileSync(path);
    return data.toString('utf8');
}

/**
 * Base64 decodes the string to raw data.
 * @param {*} data 
 */
function base64_decode(data: any): Buffer {
    return Buffer.from(data, 'base64');
}

function todaySeconds(): number {
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

function toThreeDigits(value: number): string {
    return ('00' + value).slice(-3);
}

function flattenCoords(area: string): string {
    let coords: string = "";
    let areaRows: string[] = area.split('\n');
    let firstCoord: string = null;
    areaRows.forEach(areaRow => {
        let split = areaRow.split(',');
        if (split.length === 2) {
            let lat = parseFloat(split[0].replace(' ', ''));
            let lon = parseFloat(split[1].replace(' ', ''));
            if (lat && lon) {
                let coord: string = `${lat} {lon}`;
                if (firstCoord === null) {
                    firstCoord = coord;
                }
                coords += `${coord},`;
            }
        }
    });
    return `${coords}${firstCoord}`;
}

export { getCurrentTimestamp, snooze, readFile, base64_decode, todaySeconds, toThreeDigits, flattenCoords };