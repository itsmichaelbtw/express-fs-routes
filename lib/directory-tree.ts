import fs from "fs";
import path from "path";

import type {
  FilePath,
  TreeComponentType,
  RecursiveTreeNode,
  TreeNode,
  FileExtension
} from "./types";

import { asyncReduce } from "./utils";

const FILE_FILTER = /^([^\.].*)(?<!\.d)\.(js|ts)$/;

function readDirectorySync(dirPath: FilePath) {
  return fs.readdirSync(dirPath);
}

async function stats(filePath: FilePath): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}

function newComponentEntry(
  relativePath: FilePath,
  component: TreeComponentType
): RecursiveTreeNode {
  const entry: RecursiveTreeNode = {
    name: path.basename(relativePath),
    absolute_path: relativePath,
    type: component,
    extension: path.extname(relativePath) as FileExtension
  };

  if (component === "directory") {
    entry.children = [];
  }

  return entry;
}

/**
 * Creates a directory tree from a given directory path.
 *
 * @param dir The directory path.
 * @param onFile A callback function that is called for each file.
 * @returns A promise that resolves to a directory tree.
 */
export async function createDirectoryTree(dir: FilePath): Promise<RecursiveTreeNode> {
  const directory = readDirectorySync(dir);

  if (directory.length === 0) {
    return newComponentEntry(dir, "directory");
  }

  const resolvedPath = dir;
  const componentEntry = newComponentEntry(resolvedPath, "directory");

  const treeNode = await asyncReduce(
    directory,
    async (tree, file) => {
      const filePath = path.join(resolvedPath, file);
      const fileStats = await stats(filePath);

      if (fileStats.isDirectory()) {
        const child = await createDirectoryTree(filePath);

        if (child) {
          tree.children.push(child);
        }
      } else if (fileStats.isFile()) {
        const isFile = FILE_FILTER.test(file);

        if (isFile) {
          const fileEntry = newComponentEntry(filePath, "file");
          tree.children.push(fileEntry);
        }
      }

      return tree;
    },
    componentEntry
  );

  return treeNode;
}

/**
 * Flattens the given tree node and filters out
 * all nodes that are not files.
 *
 * @param treeNode The tree node to flatten.
 * @returns The flattened tree node.
 */
export function flattenTreeNode(treeNode: RecursiveTreeNode): TreeNode[] {
  const flattenTree: TreeNode[] = [];

  function flatten(node: RecursiveTreeNode) {
    flattenTree.push(node);

    if (node.children) {
      node.children.forEach(flatten);
    }
  }

  flatten(treeNode);

  return flattenTree.filter((node) => node.type === "file");
}
