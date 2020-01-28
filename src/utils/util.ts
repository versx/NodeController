import * as fs from 'fs';

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

export { getCurrentTimestamp, snooze, readFile, base64_decode };