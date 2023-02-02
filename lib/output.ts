import fs from "fs";
import path from "path";

import type { RouteRegistry, DirectoryTree } from "./types";

import { debug } from "./debug";
import { isArray } from "./utils";

interface OutputOptions {
    data: RouteRegistry | DirectoryTree;
    fileName: string;
}
type OutputCallback = () => [OutputOptions, OutputOptions];

export class Output {
    /**
     * Ensures the output directory exists and writes the files to it.
     *
     * @param directory The output directory.
     * @param callback The callback to generate the files.
     */
    static ensureOutputDir(directory: string, callback: OutputCallback): void {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        const files = callback();

        for (const file of files) {
            try {
                const filePath = path.resolve(path.join(directory, file.fileName));

                fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2), {
                    encoding: "utf8",
                    flag: "w"
                });
            } catch (error) {
                debug(error, "red");
            }
        }
    }
}

export class Redact {
    /**
     * Redacts the absolute path from the route registry nodes.
     *
     * @param registry The route registry.
     * @param redact Whether to redact the absolute path.
     * @returns The redacted route registry.
     */
    static routeRegistry(registry: RouteRegistry, redact: boolean): RouteRegistry {
        if (redact) {
            return registry.map((entry) => {
                return {
                    ...entry,
                    absolute_path: "..."
                };
            });
        }

        return registry;
    }

    /**
     * Redacts the absolute path from the directory tree nodes.
     *
     * @param tree The directory tree.
     * @param redact Whether to redact the absolute path.
     * @returns The redacted directory tree.
     */
    static routeTree(tree: DirectoryTree, redact: boolean): DirectoryTree {
        if (redact) {
            const updatedNode = {
                ...tree,
                absolute_path: "..."
            };

            if (isArray(tree.children)) {
                updatedNode.children = tree.children.map((child) => {
                    return Redact.routeTree(child, redact);
                });
            }

            return updatedNode;
        }

        return tree;
    }
}
