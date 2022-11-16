import chai from "chai";
import path from "path";
import fs from "fs";

import { createDirectoryTree } from "../lib/directory-tree";

function join(...pathName: string[]): string {
    return path.join(__dirname, "..", ...pathName);
}

describe("directoryTree()", () => {
    it("should create a directory tree", () => {
        const examplesDir = join("examples/routes");
        const outputDir = join("examples/.fs-routes");

        const directoryTree = createDirectoryTree(examplesDir, () => {});

        const expectedTree = JSON.parse(
            fs.readFileSync(path.join(outputDir, "directory_tree.json"), "utf8")
        );

        chai.expect(directoryTree).to.deep.equal(expectedTree);
    });
});
