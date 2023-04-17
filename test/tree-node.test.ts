import type { RouterRegistry, TreeNode } from "../lib/types";

import chai from "chai";
import path from "path";
import fs from "fs";

import { initRedactFn, LocalFileSave } from "../lib/save-to-json";
import { createDirectoryTree } from "../lib/directory-tree";
import { TREE_NODE_FILENAME, REGISTRY_FILENAME, REDACT_TOKEN } from "../lib/constants";

import { newRouteEngine } from "../scripts/route-engine";

const EXAMPLES_DIR = path.join(__dirname, "..", "examples/commonjs/routes");
const LOCAL_SAVE_DIR = path.join(__dirname, "..", "examples/output");

const routeEngine = newRouteEngine();

function treeNodeRedactCheck(treeNode: TreeNode): boolean {
  const redacted = treeNode.absolute_path === REDACT_TOKEN;

  if (redacted) {
    return true;
  }

  if (treeNode.children && treeNode.children.length) {
    return treeNode.children.every(treeNodeRedactCheck);
  }

  return false;
}

function routeRegistryRedactCheck(registry: RouterRegistry): boolean {
  return registry.every((route) => {
    return route.absolute_path === REDACT_TOKEN;
  });
}

function getJSON<T>(filePath: string): T {
  const file = fs.readFileSync(filePath, "utf8");

  return JSON.parse(file);
}

describe("tree-node", () => {
  afterEach(() => {
    fs.rmSync(LOCAL_SAVE_DIR, { force: true, recursive: true });

    routeEngine.engine.setOptions(routeEngine.cacheOptions);
  });

  it("should create a recursive tree of the directory", async () => {
    const treeNode = await createDirectoryTree(EXAMPLES_DIR, async () => {});

    chai.expect(treeNode).to.be.an("object");
    chai.expect(treeNode).to.have.property("name");
    chai.expect(treeNode).to.have.property("type");
    chai.expect(treeNode).to.have.property("children");
    chai.expect(treeNode.children).to.be.an("array");
  });

  it("should create a local save of the directory", async () => {
    const treeNode = await createDirectoryTree(EXAMPLES_DIR, async () => {});

    const localSave = new LocalFileSave(LOCAL_SAVE_DIR);

    localSave.save(
      {
        fileName: TREE_NODE_FILENAME,
        json: treeNode
      },
      initRedactFn(true, "tree-node")
    );

    chai.expect(fs.existsSync(path.join(LOCAL_SAVE_DIR, TREE_NODE_FILENAME))).to.be.true;
  });

  describe("when using the engine output option", () => {
    it("should not save the output when set to false", async () => {
      routeEngine.engine.setOptions(routeEngine.mergeOptions({ output: false }));

      await routeEngine.engine.registerRoutes();

      chai.expect(fs.existsSync(path.join(LOCAL_SAVE_DIR, TREE_NODE_FILENAME))).to.be.false;
    });

    it("should save the output when set to true", async () => {
      routeEngine.engine.setOptions(routeEngine.mergeOptions({ output: LOCAL_SAVE_DIR }));

      const schemas = await routeEngine.engine.registerRoutes();

      chai.expect(schemas).to.be.an("array");
      chai.expect(schemas.length).to.be.greaterThan(0);
      chai.expect(fs.existsSync(LOCAL_SAVE_DIR)).to.be.true;
    });

    it("should allow for a custom output (absolute)", async () => {
      const CUSTOM_OUTPUT = path.join(__dirname, "..", "examples/absolute-output");

      routeEngine.engine.setOptions(routeEngine.mergeOptions({ output: CUSTOM_OUTPUT }));

      await routeEngine.engine.registerRoutes();

      chai.expect(fs.existsSync(CUSTOM_OUTPUT)).to.be.true;

      fs.rmSync(CUSTOM_OUTPUT, { force: true, recursive: true });
    });

    it("should allow for a custom output (relative)", async () => {
      const CUSTOM_OUTPUT = "./examples/relative-output";

      routeEngine.engine.setOptions(routeEngine.mergeOptions({ output: CUSTOM_OUTPUT }));

      await routeEngine.engine.registerRoutes();

      chai.expect(fs.existsSync(CUSTOM_OUTPUT)).to.be.true;

      fs.rmSync(CUSTOM_OUTPUT, { force: true, recursive: true });
    });
  });

  describe("when saving the output", () => {
    it("should redact the path property", async () => {
      routeEngine.engine.setOptions(
        routeEngine.mergeOptions({ output: LOCAL_SAVE_DIR, redactOutputFilePaths: true })
      );

      await routeEngine.engine.registerRoutes();

      const treeNode = getJSON<TreeNode>(path.join(LOCAL_SAVE_DIR, TREE_NODE_FILENAME));
      const registry = getJSON<RouterRegistry>(path.join(LOCAL_SAVE_DIR, REGISTRY_FILENAME));

      chai.expect(treeNodeRedactCheck(treeNode)).to.be.true;
      chai.expect(routeRegistryRedactCheck(registry)).to.be.true;
    });

    it("should have the correct properties", async () => {
      routeEngine.engine.setOptions(routeEngine.mergeOptions({ output: LOCAL_SAVE_DIR }));

      await routeEngine.engine.registerRoutes();

      const treeNode = getJSON<TreeNode>(path.join(LOCAL_SAVE_DIR, TREE_NODE_FILENAME));
      const registry = getJSON<RouterRegistry>(path.join(LOCAL_SAVE_DIR, REGISTRY_FILENAME));

      chai.expect(treeNode).to.be.an("object");
      chai.expect(treeNode).to.have.property("name");
      chai.expect(treeNode).to.have.property("type");
      chai.expect(treeNode).to.have.property("absolute_path");
      chai.expect(treeNode).to.have.property("children");

      for (const route of registry) {
        chai.expect(route).to.be.an("object");
        chai.expect(route).to.have.property("absolute_path");
        chai.expect(route).to.have.property("base_path");
        chai.expect(route).to.have.property("layers");
        chai.expect(route).to.have.property("route_options");
        chai.expect(route).to.have.property("status");
      }
    });
  });
});
