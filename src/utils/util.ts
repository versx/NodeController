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

export { getCurrentTimestamp, snooze, readFile };