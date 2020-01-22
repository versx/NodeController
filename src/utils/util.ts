function getCurrentTimestamp() {
    let now = new Date().getTime() / 1000;
    return Math.round(now);
}

export { getCurrentTimestamp };