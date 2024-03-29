import type { RecursiveTreeNode, RouteRegistry, TreeNode } from "./types";

import fs from "fs";
import path from "path";

import { isArray } from "./utils";

import { REDACT_TOKEN } from "./constants";

type JSONType = "router-registry" | "tree-node";
type File = RouteRegistry | TreeNode;

interface Data<T = File> {
  json: T;
  fileName: string;
}

type RedactionFn<T = File> = (json: T) => T;

export class LocalFileSave {
  constructor(private directory: string) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
  }

  public save(data: Data, redactionFn: RedactionFn<Data["json"]>) {
    data.json = redactionFn(data.json);

    const filePath = path.resolve(path.join(this.directory, data.fileName));

    try {
      fs.writeFileSync(filePath, JSON.stringify(data.json, null, 2), {
        encoding: "utf8",
        flag: "w"
      });
    } catch (error) {}
  }
}

export function initRedactFn(
  redact: boolean,
  jsonType: "router-registry"
): RedactionFn<RouteRegistry>;
export function initRedactFn(redact: boolean, jsonType: "tree-node"): RedactionFn<TreeNode>;
export function initRedactFn<T = File>(redact: boolean, jsonType: JSONType): RedactionFn<T> {
  return (json) => {
    if (!redact) {
      return json;
    }

    switch (jsonType) {
      case "router-registry": {
        const typeCast = json as RouteRegistry;

        return typeCast.map((entry) => {
          return {
            ...entry,
            absolute_path: REDACT_TOKEN
          };
        }) as unknown as T;
      }

      case "tree-node": {
        const typeCast = json as RecursiveTreeNode;

        const updatedNode = {
          ...typeCast,
          absolute_path: REDACT_TOKEN
        };

        if (isArray(typeCast.children)) {
          updatedNode.children = typeCast.children.map((child) => {
            return initRedactFn(redact, jsonType)(child);
          });
        }

        return updatedNode as unknown as T;
      }
    }
  };
}
