import type { RouterRegistry, TreeNode } from "./types";
type File = RouterRegistry | TreeNode;
interface Data<T = File> {
    json: T;
    fileName: string;
}
type RedactionFn<T = File> = (json: T) => T;
export declare class LocalFileSave {
    private directory;
    constructor(directory: string);
    save(data: Data, redactionFn: RedactionFn<Data["json"]>): void;
}
export declare function initRedactFn(redact: boolean, jsonType: "router-registry"): RedactionFn<RouterRegistry>;
export declare function initRedactFn(redact: boolean, jsonType: "tree-node"): RedactionFn<TreeNode>;
export {};
