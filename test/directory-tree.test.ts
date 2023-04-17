import chai from "chai";
import path from "path";

import { createDirectoryTree } from "../lib/directory-tree";

function join(...pathName: string[]): string {
  return path.join(__dirname, "..", ...pathName);
}

describe("createDirectoryTree", () => {
  it("should create a directory tree", async () => {
    const examplesDir = join("examples/commonjs/routes");

    const directoryTree = await createDirectoryTree(examplesDir, async () => {});

    chai.expect(directoryTree).to.be.an("object");
    chai.expect(directoryTree).to.have.property("name");
    chai.expect(directoryTree).to.have.property("absolute_path");
    chai.expect(directoryTree).to.have.property("type");
    chai.expect(directoryTree).to.have.property("children");
  });
});
