import type { FilePath, RecursiveTreeNode, TreeNode } from "./types";
/**
 * Creates a directory tree from a given directory path.
 *
 * @param dir The directory path.
 * @param onFile A callback function that is called for each file.
 * @returns A promise that resolves to a directory tree.
 */
export declare function createDirectoryTree(dir: FilePath): Promise<RecursiveTreeNode>;
/**
 * Flattens the given tree node and filters out
 * all nodes that are not files.
 *
 * @param treeNode The tree node to flatten.
 * @returns The flattened tree node.
 */
export declare function flattenTreeNode(treeNode: RecursiveTreeNode): TreeNode[];
