import type { FilePath, DirectoryCallback, TreeNode } from "./types";
/**
 * Creates a directory tree from a given directory path.
 *
 * @param dir The directory path.
 * @param onFile A callback function that is called for each file.
 * @returns A promise that resolves to a directory tree.
 */
export declare function createDirectoryTree(dir: FilePath, onFile: DirectoryCallback): Promise<TreeNode>;
