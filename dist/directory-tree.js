"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDirectoryTree = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FILE_FILTER = /^([^\.].*)(?<!\.d)\.(js|ts)$/;
function readDirectorySync(dirPath) {
    return fs_1.default.readdirSync(dirPath);
}
function statsSync(filePath) {
    return fs_1.default.statSync(filePath);
}
function newComponentEntry(relativePath, component) {
    const entry = {
        name: path_1.default.basename(relativePath),
        path: relativePath,
        type: component
    };
    if (component === "directory") {
        entry.children = [];
    }
    return entry;
}
function createDirectoryTree(dir, onFile) {
    const directory = readDirectorySync(dir);
    if (directory.length === 0) {
        return newComponentEntry(dir, "directory");
    }
    const resolvedPath = dir;
    const componentEntry = newComponentEntry(resolvedPath, "directory");
    const directoryEnsemble = directory.reduce((directoryTree, file) => {
        const filePath = path_1.default.join(resolvedPath, file);
        const fileStats = statsSync(filePath);
        if (fileStats.isDirectory()) {
            const child = createDirectoryTree(filePath, onFile);
            if (child) {
                directoryTree.children.push(child);
            }
        }
        else if (fileStats.isFile()) {
            const isFile = FILE_FILTER.test(file);
            if (isFile) {
                const fileEntry = newComponentEntry(filePath, "file");
                onFile(fileEntry);
                directoryTree.children.push(fileEntry);
            }
        }
        return directoryTree;
    }, componentEntry);
    return directoryEnsemble;
}
exports.createDirectoryTree = createDirectoryTree;
