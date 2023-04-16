import type { RouterRegistry, TreeNode } from "./types";
interface OutputOptions {
    data: RouterRegistry | TreeNode;
    fileName: string;
}
type OutputCallback = () => [OutputOptions, OutputOptions];
export declare class Output {
    /**
     * Ensures the output directory exists and writes the files to it.
     *
     * @param directory The output directory.
     * @param callback The callback to generate the files.
     */
    static ensureOutputDir(directory: string, callback: OutputCallback): void;
}
export declare class Redact {
    /**
     * Redacts the absolute path from the route registry nodes.
     *
     * @param registry The route registry.
     * @param redact Whether to redact the absolute path.
     * @returns The redacted route registry.
     */
    static routeRegistry(registry: RouterRegistry, redact: boolean): RouterRegistry;
    /**
     * Redacts the absolute path from the directory tree nodes.
     *
     * @param tree The directory tree.
     * @param redact Whether to redact the absolute path.
     * @returns The redacted directory tree.
     */
    static routeTree(tree: TreeNode, redact: boolean): TreeNode;
}
export {};
