"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
const colors = {
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    lightblue: "\x1b[36m"
};
const globals = {
    reset: "\x1b[0m",
    bright: "\x1b[1m"
};
function debug(message, color) {
    const prefix = "[EXPRESS-FS-ROUTES] ";
    const colorizedMessage = `${colors[color]}${prefix}${message}${globals.reset}`;
    console.log(colorizedMessage);
}
exports.debug = debug;
