import path from "path";
import fs from "fs";

import type { Request, Response, NextFunction } from "express";

export function getPosts() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const posts = await fs.promises.readFile(
      path.join(process.cwd(), "..", "database/posts.json"),
      "utf-8"
    );

    req.posts = JSON.parse(posts);
    next();
  };
}
