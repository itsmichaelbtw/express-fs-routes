import chai from "chai";
import path from "path";

import { createDirectoryTree } from "../lib/directory-tree";

function join(...pathName: string[]): string {
    return path.join(__dirname, "..", ...pathName);
}

describe("directoryTree()", () => {
    it("should create a directory tree", () => {
        const examplesDir = join("examples/routes");

        const directoryTree = createDirectoryTree(examplesDir, () => {});

        chai.expect(directoryTree).to.be.an("object");
        chai.expect(directoryTree).to.have.property("name");
        chai.expect(directoryTree).to.have.property("path");
        chai.expect(directoryTree).to.have.property("type");
        chai.expect(directoryTree).to.have.property("children");
    });
});
