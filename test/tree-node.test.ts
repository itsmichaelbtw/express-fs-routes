import chai from "chai";
import path from "path";

import { initRedactFn, LocalFileSave } from "../lib/save-to-json";
import { createDirectoryTree } from "../lib/directory-tree";

describe("tree-nodes", () => {
    it("should create a local save of the directory", () => {
        const examplesDir = path.join(__dirname, "..", "examples/commonjs/routes");

        const treeNode = createDirectoryTree(examplesDir, async () => {});
    });
});
