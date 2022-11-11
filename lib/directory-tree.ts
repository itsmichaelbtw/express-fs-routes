import fs from "fs";
import path from "path";

import type { FilePath, TreeComponentType, DirectoryCallback, DirectoryEnsemble } from "./types";

const FILE_FILTER = /^([^\.].*)(?<!\.d)\.(js|ts)$/;

function readDirectorySync(dirPath: FilePath) {
    return fs.readdirSync(dirPath);
}

function statsSync(filePath: FilePath) {
    return fs.statSync(filePath);
}

function newComponentEntry(
    relativePath: FilePath,
    component: TreeComponentType
): DirectoryEnsemble {
    const entry: DirectoryEnsemble = {
        name: path.basename(relativePath),
        path: relativePath,
        type: component
    };

    if (component === "directory") {
        entry.children = [];
    }

    return entry;
}

export function createDirectoryTree(dir: FilePath, onFile: DirectoryCallback): DirectoryEnsemble {
    const directory = readDirectorySync(dir);

    if (directory.length === 0) {
        return newComponentEntry(dir, "directory");
    }

    const resolvedPath = dir;
    const componentEntry = newComponentEntry(resolvedPath, "directory");

    const directoryEnsemble = directory.reduce((directoryTree, file) => {
        const filePath = path.join(resolvedPath, file);
        const fileStats = statsSync(filePath);

        if (fileStats.isDirectory()) {
            const child = createDirectoryTree(filePath, onFile);

            if (child) {
                directoryTree.children.push(child);
            }
        } else if (fileStats.isFile()) {
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
