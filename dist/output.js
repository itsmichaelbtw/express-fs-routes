"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveOutputToDisk = exports.checkOutputDir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = require("./debug");
function checkOutputDir(outputDir, callback) {
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir);
    }
    callback(outputDir);
}
exports.checkOutputDir = checkOutputDir;
function saveOutputToDisk(location, data, fileName) {
    try {
        const filePath = path_1.default.resolve(path_1.default.join(location, fileName));
        data = JSON.stringify(data, null, 2);
        fs_1.default.writeFileSync(filePath, data, {
            encoding: "utf8",
            flag: "w"
        });
    }
    catch (error) {
        (0, debug_1.debug)(error, "red");
    }
}
exports.saveOutputToDisk = saveOutputToDisk;
