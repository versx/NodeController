function getCurrentTimestamp(): number {
    let now = new Date().getTime() / 1000;
    return Math.round(now);
}

function snooze(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export { getCurrentTimestamp, snooze };